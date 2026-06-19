import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GRAPH_SCHEMA_VERSION,
  addRelationCandidate,
  createSourceClaimPatchFromText,
  ensurePatchConnectivityCandidates,
  ensureSourceClaimPatchPaths,
  findExplicitContradictions,
  findSingleEvidenceDependencies,
  findUnsupportedLegalElements,
  migrateGraphSnapshotV1ToV2,
  mergeSourceRefsForEdge,
  normalizeGraphSnapshotV2,
  relationCandidateToEdge,
  runDeterministicGraphCommand,
  sanitizeGraphEdgeV2,
  sanitizeGraphNodeV2,
  sourceRefQuoteExistsInText,
  suggestRelationCandidateBetweenNodes,
  filterSourceRefsByText,
  simulateEvidenceRemoval,
  traceProvenancePaths,
  upsertDirectedEdge,
} from '../graph-v2.js';

function baseNode(id, kind, extra = {}) {
  return sanitizeGraphNodeV2({
    id,
    kind,
    label: id,
    createdBy: 'rule',
    ...extra,
  });
}

function baseEdge(id, source, target, type, extra = {}) {
  return sanitizeGraphEdgeV2({
    id,
    source,
    target,
    type,
    verificationStatus: 'asserted',
    sourceRefs: [{ quote: '원문 발췌', sourceNodeId: 'span-1', evidenceNodeId: 'ev-1' }],
    ...extra,
  });
}

test('상황 입력 fallback: 다섯 블록만 만들고 사건 중심 단방향 그래프로 연결한다', () => {
  const fixture = [
    'A는 B에게 원금이 보장된다고 말했다.',
    'B는 C 명의 계좌로 1천만 원을 송금했다.',
    'B는 문자 캡처를 제출했다.',
  ].join('\n');
  const patch = createSourceClaimPatchFromText(fixture);

  assert.equal(patch.nodes.some((node) => ['source_span', 'inference', 'legal_element', 'hypothesis'].includes(node.kind)), false);
  assert.ok(patch.nodes.some((node) => node.kind === 'event'));
  assert.ok(patch.nodes.some((node) => node.kind === 'claim'));
  assert.ok(patch.nodes.some((node) => node.kind === 'premise'));
  assert.ok(patch.nodes.some((node) => node.kind === 'person' && node.label === 'A'));
  assert.ok(patch.nodes.some((node) => node.kind === 'person' && node.label === 'B'));
  assert.ok(patch.nodes.some((node) => node.kind === 'person' && node.label === 'C'));
  assert.ok(patch.nodes.some((node) => node.kind === 'evidence' && /문자\s*캡처/.test(node.label)));
  assert.ok(patch.links.some((link) => link.type === 'EXPLAINS' && /^event-/.test(link.source) && /^claim-/.test(link.target)));
  assert.ok(patch.links.some((link) => link.type === 'SUPPORTS' && /^evidence-/.test(link.source) && /^claim-/.test(link.target)));
  assert.ok(patch.links.some((link) => link.type === 'SUPPORTS' && /^premise-/.test(link.source) && /^claim-/.test(link.target)));
  assert.ok(patch.links.some((link) => link.type === 'PARTICIPATES_AS' && /^event-/.test(link.source) && /^person-/.test(link.target)));
  assert.equal(patch.links.some((link) => link.type === 'LEGACY_RELATED_TO'), false);
  assert.equal(patch.links.every((link) => link.sourceRefs?.some((ref) => sourceRefQuoteExistsInText(ref, fixture))), true);
  const evidenceNodes = patch.nodes.filter((node) => node.kind === 'evidence');
  const personNodes = patch.nodes.filter((node) => node.kind === 'person');
  assert.equal(patch.links.some((link) => (
    evidenceNodes.some((node) => node.clientId === link.source || node.clientId === link.target)
    && personNodes.some((node) => node.clientId === link.source || node.clientId === link.target)
  )), false);
});

test('fallback은 긴 입력도 주요사건과 주장을 남발하지 않는다', () => {
  const input = Array.from({ length: 20 }, (_, index) => `2026년 6월 ${index + 1}일 A가 B에게 ${index + 1}번째 설명을 했고 문자 캡처가 남아 있다.`).join('\n');
  const patch = createSourceClaimPatchFromText(input);

  assert.equal(patch.nodes.some((node) => node.kind === 'source_span'), false);
  assert.ok(patch.nodes.filter((node) => node.kind === 'claim').length <= 6);
  assert.ok(patch.nodes.filter((node) => node.kind === 'event').length <= 5);
  assert.ok(patch.nodes.filter((node) => node.kind === 'premise').length <= 6);
});

test('방향성: A -> B와 B -> A는 별도 관계로 저장된다', () => {
  let graph = {
    nodes: [baseNode('A', 'claim'), baseNode('B', 'legal_element')],
    links: [],
  };
  graph = upsertDirectedEdge(graph, baseEdge('e1', 'A', 'B', 'SUPPORTS'));
  graph = upsertDirectedEdge(graph, baseEdge('e2', 'B', 'A', 'REQUIRED_FOR'));

  assert.equal(graph.links.length, 2);
  assert.deepEqual(graph.links.map((edge) => `${edge.source}->${edge.target}`).sort(), ['A->B', 'B->A']);
});

test('알 수 없는 kind는 person으로 조용히 변환하지 않는다', () => {
  const node = sanitizeGraphNodeV2({ id: 'mystery-1', kind: 'alien_kind', label: '정체불명' });
  assert.equal(node.kind, 'unknown');
});

test('다중 관계: 같은 A와 B 사이에 SUPPORTS와 ATTACKS가 동시에 저장된다', () => {
  let graph = {
    nodes: [baseNode('A', 'claim'), baseNode('B', 'hypothesis')],
    links: [],
  };
  graph = upsertDirectedEdge(graph, baseEdge('e1', 'A', 'B', 'SUPPORTS'));
  graph = upsertDirectedEdge(graph, baseEdge('e2', 'A', 'B', 'ATTACKS'));

  assert.equal(graph.links.length, 2);
  assert.deepEqual(graph.links.map((edge) => edge.type).sort(), ['ATTACKS', 'SUPPORTS']);
});

test('v1 마이그레이션: 링크는 relationCandidate로 이동하고 idempotent하다', () => {
  const v1 = {
    version: 1,
    state: {
      nodes: [
        { id: 'person-1', kind: 'person', label: 'A', note: '메모', x: 10, y: 20 },
        { id: 'event-1', kind: 'event', label: '사건', x: 40, y: 60 },
      ],
      links: [{ id: 'l1', source: 'person-1', target: 'event-1', label: '관계', basis: '기존 근거', strength: 'weak' }],
      clusters: [],
    },
  };

  const migrated = migrateGraphSnapshotV1ToV2(v1);
  const migratedAgain = migrateGraphSnapshotV1ToV2(migrated);

  assert.equal(migrated.version, GRAPH_SCHEMA_VERSION);
  assert.equal(migrated.state.nodes[0].note, '메모');
  assert.equal(migrated.state.nodes[0].x, 10);
  assert.equal(migrated.state.links.length, 0);
  assert.equal(migrated.state.relationCandidates.length, 1);
  assert.equal(migrated.state.relationCandidates[0].suggestedType, 'LEGACY_RELATED_TO');
  assert.equal(migratedAgain.state.relationCandidates.length, 1);
});

test('검토항목 공백: fraud_v1에서 mistake가 unsupported로 탐지된다', () => {
  const graph = {
    activeLegalTemplateId: 'fraud_v1',
    nodes: [
      baseNode('ev-1', 'evidence'),
      baseNode('span-1', 'source_span'),
      baseNode('claim-deception', 'claim', { claimText: 'A가 B에게 원금이 보장된다고 말했다.' }),
      baseNode('claim-disposition', 'claim', { claimText: 'B가 C 계좌로 송금했다.' }),
      baseNode('legal-deception', 'legal_element', { templateId: 'fraud_v1', elementKey: 'deception', required: true, label: '기망' }),
      baseNode('legal-mistake', 'legal_element', { templateId: 'fraud_v1', elementKey: 'mistake', required: true, label: '착오' }),
      baseNode('legal-disposition', 'legal_element', { templateId: 'fraud_v1', elementKey: 'disposition', required: true, label: '처분행위' }),
    ],
    links: [
      baseEdge('c1', 'ev-1', 'span-1', 'CONTAINS'),
      baseEdge('a1', 'span-1', 'claim-deception', 'ASSERTS'),
      baseEdge('s1', 'claim-deception', 'legal-deception', 'SATISFIES'),
      baseEdge('s2', 'claim-disposition', 'legal-disposition', 'SATISFIES'),
    ],
  };

  const gaps = findUnsupportedLegalElements(graph, 'fraud_v1');
  assert.equal(gaps.find((item) => item.elementKey === 'mistake').status, 'unsupported');
});

test('근거 경로: legal_element에서 source_span과 evidence까지 방향성 경로를 반환한다', () => {
  const graph = {
    nodes: [
      baseNode('ev-1', 'evidence'),
      baseNode('span-1', 'source_span'),
      baseNode('claim-1', 'claim'),
      baseNode('legal-1', 'legal_element', { templateId: 'fraud_v1', elementKey: 'deception', required: true }),
    ],
    links: [
      baseEdge('e1', 'ev-1', 'span-1', 'CONTAINS'),
      baseEdge('e2', 'span-1', 'claim-1', 'ASSERTS'),
      baseEdge('e3', 'claim-1', 'legal-1', 'SATISFIES'),
    ],
  };

  const paths = traceProvenancePaths(graph, 'legal-1');
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0].edgeIds, ['e1', 'e2', 'e3']);
  assert.ok(paths[0].nodeIds.includes('ev-1'));
});

test('증거 제거: 유일한 evidence를 제외하면 검토항목 지지 경로가 끊긴다', () => {
  const graph = {
    activeLegalTemplateId: 'fraud_v1',
    nodes: [
      baseNode('ev-1', 'evidence'),
      baseNode('span-1', 'source_span'),
      baseNode('claim-1', 'claim'),
      baseNode('legal-1', 'legal_element', { templateId: 'fraud_v1', elementKey: 'deception', required: true }),
    ],
    links: [
      baseEdge('e1', 'ev-1', 'span-1', 'CONTAINS'),
      baseEdge('e2', 'span-1', 'claim-1', 'ASSERTS'),
      baseEdge('e3', 'claim-1', 'legal-1', 'SATISFIES'),
    ],
  };

  const result = simulateEvidenceRemoval(graph, 'ev-1', 'fraud_v1');
  assert.equal(result.unsupportedLegalElements.some((item) => item.elementId === 'legal-1'), true);
  assert.equal(result.singleEvidenceDependency, true);
});

test('단일 증거 의존성: 검토항목이 하나의 evidence root에만 의존하면 탐지한다', () => {
  const graph = {
    activeLegalTemplateId: 'fraud_v1',
    nodes: [
      baseNode('ev-1', 'evidence'),
      baseNode('span-1', 'source_span'),
      baseNode('claim-1', 'claim'),
      baseNode('legal-1', 'legal_element', { templateId: 'fraud_v1', elementKey: 'deception', required: true }),
    ],
    links: [
      baseEdge('e1', 'ev-1', 'span-1', 'CONTAINS'),
      baseEdge('e2', 'span-1', 'claim-1', 'ASSERTS'),
      baseEdge('e3', 'claim-1', 'legal-1', 'SATISFIES'),
    ],
  };

  const dependencies = findSingleEvidenceDependencies(graph, 'fraud_v1');
  assert.equal(dependencies.length, 1);
  assert.equal(dependencies[0].evidenceNodeId, 'ev-1');
});

test('모순: 같은 주어/술어/목적어의 positive와 negative claim을 탐지한다', () => {
  const graph = {
    nodes: [
      baseNode('claim-yes', 'claim', { subjectId: 'A', predicate: 'said', objectId: 'B', polarity: 'positive', claimText: 'A가 말했다.' }),
      baseNode('claim-no', 'claim', { subjectId: 'A', predicate: 'said', objectId: 'B', polarity: 'negative', claimText: 'A가 말하지 않았다.' }),
    ],
    links: [],
  };

  const contradictions = findExplicitContradictions(graph);
  assert.equal(contradictions.length, 1);
  assert.deepEqual(contradictions[0].nodeIds.sort(), ['claim-no', 'claim-yes']);
});

test('JSON 스키마와 round-trip: graph_extract 신규 응답 정규화 필드를 보존한다', () => {
  const graph = {
    version: GRAPH_SCHEMA_VERSION,
    state: {
      nodes: [
        baseNode('ev-1', 'evidence'),
        baseNode('span-1', 'source_span', { sourceRefs: [{ quote: '정확한 원문' }] }),
      ],
      links: [baseEdge('e1', 'ev-1', 'span-1', 'CONTAINS')],
      relationCandidates: [
        { id: 'candidate-1', source: 'ev-1', target: 'span-1', suggestedType: 'LEGACY_RELATED_TO', reason: 'same_document', status: 'pending', createdBy: 'ai' },
      ],
      clusters: [],
    },
  };

  const normalized = normalizeGraphSnapshotV2(JSON.stringify(graph));
  assert.equal(normalized.version, GRAPH_SCHEMA_VERSION);
  assert.equal(normalized.state.nodes[1].sourceRefs[0].quote, '정확한 원문');
  assert.equal(normalized.state.links[0].sourceRefs[0].quote, '원문 발췌');
  assert.equal(normalized.state.relationCandidates[0].reason, 'same_document');

  let candidateGraph = { nodes: normalized.state.nodes, links: [], relationCandidates: [] };
  candidateGraph = addRelationCandidate(candidateGraph, normalized.state.relationCandidates[0]);
  const accepted = relationCandidateToEdge(candidateGraph.relationCandidates[0]);
  assert.equal(accepted.type, 'LEGACY_RELATED_TO');
});

test('sourceRef quote 검증: 입력에 없는 발췌문은 근거로 보존하지 않는다', () => {
  const sourceText = 'A는 B에게 원금이 보장된다고 말했다.';
  const refs = [
    { quote: 'A는 B에게 원금이 보장된다고 말했다.', sourceNodeId: 'span-1' },
    { quote: 'B가 C에게 허위 설명을 했다.', sourceNodeId: 'span-2' },
  ];

  assert.equal(sourceRefQuoteExistsInText(refs[0], sourceText), true);
  assert.equal(sourceRefQuoteExistsInText(refs[1], sourceText), false);
  assert.deepEqual(filterSourceRefsByText(refs, sourceText).map((ref) => ref.sourceNodeId), ['span-1']);
});

test('관계 sourceRef가 비어 있어도 연결 노드의 실제 원문 발췌로 경로를 보존한다', () => {
  const sourceText = 'A는 B에게 원금이 보장된다고 말했다.';
  const sourceNode = baseNode('span-1', 'source_span', {
    sourceRefs: [{ quote: '원금이 보장된다고 말했다', sourceNodeId: 'span-1' }],
  });
  const targetNode = baseNode('claim-1', 'claim', {
    sourceRefs: [{ quote: '원금이 보장된다고 말했다', sourceNodeId: 'span-1' }],
  });
  const refs = mergeSourceRefsForEdge(
    { source: 'span-1', target: 'claim-1', type: 'ASSERTS', sourceRefs: [] },
    sourceNode,
    targetNode,
    sourceText,
  );

  assert.equal(refs.length, 2);
  assert.equal(refs.every((ref) => sourceRefQuoteExistsInText(ref, sourceText)), true);
});

test('AI 패치가 source_span 연결을 빠뜨려도 실제 원문 발췌가 있는 claim은 출처 경로를 보정한다', () => {
  const sourceText = 'A는 B에게 원금이 보장된다고 말했다.';
  const patch = ensureSourceClaimPatchPaths({
    nodes: [
      {
        id: 'claim-1',
        clientId: 'claim-1',
        kind: 'claim',
        label: '원금 보장 발언',
        claimText: 'A는 B에게 원금이 보장된다고 말했다.',
        sourceRefs: [{ quote: '원금이 보장된다고 말했다', sourceNodeId: 'span-1' }],
      },
    ],
    links: [],
  }, sourceText);

  assert.equal(patch.nodes.some((node) => node.kind === 'source_span' && node.clientId === 'span-1'), true);
  assert.equal(patch.links.some((link) => link.source === 'span-1' && link.target === 'claim-1' && link.type === 'ASSERTS'), true);
});

test('고립 노드는 accepted link가 아니라 후보 관계로 주변 논증 노드와 연결된다', () => {
  const patch = ensurePatchConnectivityCandidates({
    nodes: [
      { clientId: 'claim-1', kind: 'claim', label: '원금 보장 발언' },
      { clientId: 'person-1', kind: 'person', label: 'A' },
      { clientId: 'event-1', kind: 'event', label: '설명 장면' },
    ],
    links: [],
    relation_candidates: [],
  }, 'A는 B에게 원금이 보장된다고 말했다.');

  assert.equal(patch.links.length, 0);
  assert.ok(patch.relationCandidates.length >= 2);
  assert.equal(patch.relationCandidates.some((candidate) => (
    candidate.source === 'person-1' && candidate.target === 'event-1' && candidate.suggestedType === 'PARTICIPATES_AS'
  )), true);
  assert.equal(patch.relationCandidates.every((candidate) => candidate.status === 'pending'), true);
});

test('관계 후보 제안은 종류에 맞춰 방향과 관계 유형을 잡는다', () => {
  const candidate = suggestRelationCandidateBetweenNodes(
    { id: 'claim-1', kind: 'claim', label: '명제' },
    { id: 'hypothesis-1', kind: 'hypothesis', label: '가설' },
  );

  assert.equal(candidate.source, 'claim-1');
  assert.equal(candidate.target, 'hypothesis-1');
  assert.equal(candidate.suggestedType, 'SUPPORTS');
});

test('후보 승인: quote 없는 후보는 accepted edge가 되어도 unverified로 남는다', () => {
  const withoutQuote = relationCandidateToEdge({
    id: 'candidate-no-quote',
    source: 'claim-1',
    target: 'legal-1',
    suggestedType: 'SATISFIES',
    status: 'pending',
    createdBy: 'ai',
  });
  assert.equal(withoutQuote.verificationStatus, 'unverified');

  const withQuote = relationCandidateToEdge({
    id: 'candidate-with-quote',
    source: 'claim-1',
    target: 'legal-1',
    suggestedType: 'SATISFIES',
    sourceRefs: [{ quote: '원문 발췌' }],
    status: 'pending',
    createdBy: 'ai',
  });
  assert.equal(withQuote.verificationStatus, 'asserted');
});

test('검토항목 공백: 관련 없는 링크가 많아도 근거 경로가 없으면 unsupported다', () => {
  const graph = {
    activeLegalTemplateId: 'fraud_v1',
    nodes: [
      baseNode('legal-mistake', 'legal_element', { templateId: 'fraud_v1', elementKey: 'mistake', required: true }),
      ...Array.from({ length: 8 }, (_, index) => baseNode(`claim-noise-${index}`, 'claim')),
    ],
    links: Array.from({ length: 7 }, (_, index) => baseEdge(`noise-${index}`, `claim-noise-${index}`, `claim-noise-${index + 1}`, 'SUPPORTS')),
  };

  const gaps = findUnsupportedLegalElements(graph, 'fraud_v1');
  assert.equal(gaps.find((item) => item.elementKey === 'mistake').status, 'unsupported');
});

test('취약점 종합 분석: 공백, 근거 경로, 증거 의존, 가설, 모순을 함께 반환한다', () => {
  const graph = {
    activeLegalTemplateId: 'fraud_v1',
    nodes: [
      baseNode('ev-1', 'evidence', { label: '문자 캡처' }),
      baseNode('span-1', 'source_span', { sourceRefs: [{ quote: 'A가 B에게 원금이 보장된다고 말했다.' }] }),
      baseNode('claim-1', 'claim', {
        label: '원금 보장 발언',
        claimText: 'A가 B에게 원금이 보장된다고 말했다.',
        subjectId: 'A',
        predicate: '보장 발언',
        objectId: 'B',
        polarity: 'positive',
      }),
      baseNode('claim-2', 'claim', {
        label: '원금 보장 발언 부인',
        claimText: 'A가 B에게 원금이 보장된다고 말하지 않았다.',
        subjectId: 'A',
        predicate: '보장 발언',
        objectId: 'B',
        polarity: 'negative',
      }),
      baseNode('legal-deception', 'legal_element', { templateId: 'fraud_v1', elementKey: 'deception', required: true }),
      baseNode('legal-mistake', 'legal_element', { templateId: 'fraud_v1', elementKey: 'mistake', required: true }),
      baseNode('hypothesis-1', 'hypothesis', { label: '편취 의사 가설' }),
    ],
    links: [
      baseEdge('edge-contain', 'ev-1', 'span-1', 'CONTAINS'),
      baseEdge('edge-assert', 'span-1', 'claim-1', 'ASSERTS'),
      baseEdge('edge-satisfy', 'claim-1', 'legal-deception', 'SATISFIES'),
      baseEdge('edge-hypothesis', 'claim-1', 'hypothesis-1', 'SUPPORTS'),
    ],
    relationCandidates: [{
      id: 'candidate-1',
      source: 'claim-2',
      target: 'hypothesis-1',
      suggestedType: 'ATTACKS',
      suggestedRole: '',
      reason: 'test',
      basis: '반대 명제 후보',
      sourceRefs: [],
      confidence: 'low',
      status: 'pending',
      createdBy: 'rule',
      createdAt: '',
      reviewedAt: '',
    }],
  };

  const result = runDeterministicGraphCommand(graph, '명제와 논증 취약점을 종합 분석해줘');
  assert.equal(result.analysis_type, 'vulnerability_analysis');
  assert.ok(result.findings.summary.argumentGapCount >= 1);
  assert.ok(result.findings.summary.contradictionCount >= 1);
  assert.ok(result.findings.priorityFixes.length >= 1);
  assert.ok(result.findings.propositionRisks.some((item) => item.claimId === 'claim-2'));
  assert.ok(result.findings.candidateRisks.some((item) => item.candidateId === 'candidate-1'));
});
