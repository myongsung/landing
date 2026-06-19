export const GRAPH_SCHEMA_VERSION = 2;

export const GRAPH_NODE_KINDS = new Set([
  'person',
  'event',
  'evidence',
  'claim',
  'premise',
  'source_span',
  'inference',
  'legal_element',
  'hypothesis',
  'unknown',
]);

export const GRAPH_EDGE_TYPES = new Set([
  'CONTAINS',
  'ASSERTS',
  'DERIVED_FROM',
  'PARTICIPATES_AS',
  'SUPPORTS',
  'ATTACKS',
  'UNDERCUTS',
  'SATISFIES',
  'REQUIRED_FOR',
  'PRECEDES',
  'OVERLAPS',
  'CONTRADICTS',
  'EXPLAINS',
  'ALTERNATIVE_TO',
  'INCOMPATIBLE_WITH',
  'LEGACY_RELATED_TO',
]);

export const legalIssueTemplates = {
  none: {
    id: 'none',
    label: '검토항목 세트 없음',
    description: '법적 결론이 아니라 사용자가 구성하는 논증 체크리스트입니다.',
    elements: [],
  },
  generic_criminal_v1: {
    id: 'generic_criminal_v1',
    label: '일반 형사사건 검토항목 세트',
    description: '전문가 검토가 필요한 형사사건 사실 구조를 검토항목으로 분리합니다.',
    elements: [
      ['conduct', '문제되는 행위 또는 부작위', ['진술', '영상', '문서', '행동 기록']],
      ['actor_identity', '행위 주체와 관여', ['신원 자료', '진술', '참여 기록']],
      ['result', '결과 또는 법익 침해 관련 사실', ['피해 자료', '진단서', '손해 자료']],
      ['causation', '행위와 결과 사이의 인과 관련 사실', ['시간 자료', '전후 경위', '전문 자료']],
      ['subjective_facts', '인식·의사·동기 관련 사실', ['메시지', '발언', '사전·사후 행위']],
      ['counter_conditions', '위법성·책임·정당화 관련 반대 주장 또는 확인사항', ['반대 진술', '상황 자료', '정황 자료']],
    ].map(([key, description, expectedEvidenceTypes]) => ({
      key,
      label: description,
      required: true,
      description: `${description}. 이 항목은 법적 결론이 아니라 전문가 검토 전 자료 공백을 확인하기 위한 체크리스트입니다.`,
      expectedEvidenceTypes,
    })),
  },
  fraud_v1: {
    id: 'fraud_v1',
    label: '사기 쟁점 검토항목 세트',
    description: '사기 관련 주장 구조를 자료·명제·반대 설명으로 분리합니다. 최종 판단은 전문가 검토가 필요합니다.',
    elements: [
      ['deception', '기망에 해당할 수 있는 설명·행위', ['메시지', '녹취', '계약서', '광고 자료']],
      ['mistake', '상대방의 착오 형성', ['진술', '상담 기록', '대화 기록']],
      ['disposition', '착오에 기초한 처분행위', ['송금 내역', '계약 체결 기록', '인도 기록']],
      ['property_effect', '재산 이동·손해·이익 관련 사실', ['계좌 내역', '영수증', '정산 자료']],
      ['causal_chain', '각 단계의 연결', ['시간표', '대화 흐름', '송금 전후 자료']],
      ['intent_facts', '당시 인식·의사와 관련된 간접사실', ['사전 발언', '사후 행위', '반복 패턴 자료']],
      ['alternative_transaction_failure', '정상 거래 또는 사후 실패라는 대체 설명', ['계약 이행 자료', '불가항력 자료', '정산 시도 기록']],
    ].map(([key, description, expectedEvidenceTypes]) => ({
      key,
      label: description,
      required: true,
      description: `${description}. 이 항목은 법적 결론이 아니라 전문가 검토 전 자료 공백을 확인하기 위한 체크리스트입니다.`,
      expectedEvidenceTypes,
    })),
  },
};

const allowedEdgeKinds = {
  CONTAINS: [['evidence', 'source_span']],
  ASSERTS: [['source_span', 'claim'], ['person', 'claim']],
  DERIVED_FROM: [['claim', 'source_span'], ['inference', 'claim'], ['claim', 'evidence'], ['claim', 'premise'], ['premise', 'evidence']],
  PARTICIPATES_AS: [['person', 'event'], ['event', 'person']],
  SUPPORTS: [['source_span', 'claim'], ['evidence', 'claim'], ['premise', 'claim'], ['claim', 'claim'], ['claim', 'premise'], ['claim', 'inference'], ['claim', 'legal_element'], ['claim', 'hypothesis'], ['evidence', 'inference'], ['inference', 'legal_element'], ['inference', 'hypothesis']],
  ATTACKS: [['claim', 'claim'], ['claim', 'legal_element'], ['claim', 'hypothesis'], ['evidence', 'inference'], ['inference', 'hypothesis']],
  UNDERCUTS: [['claim', 'inference'], ['evidence', 'inference'], ['inference', 'inference']],
  SATISFIES: [['claim', 'legal_element'], ['inference', 'legal_element']],
  REQUIRED_FOR: [['legal_element', 'hypothesis']],
  PRECEDES: [['event', 'event']],
  OVERLAPS: [['event', 'event']],
  CONTRADICTS: [['claim', 'claim'], ['event', 'event']],
  EXPLAINS: [['event', 'claim'], ['claim', 'event'], ['inference', 'claim'], ['hypothesis', 'claim'], ['hypothesis', 'event']],
  ALTERNATIVE_TO: [['hypothesis', 'hypothesis']],
  INCOMPATIBLE_WITH: [['hypothesis', 'hypothesis'], ['claim', 'claim'], ['event', 'event']],
  LEGACY_RELATED_TO: [['person', 'person'], ['person', 'event'], ['person', 'evidence'], ['event', 'person'], ['event', 'event'], ['event', 'evidence'], ['evidence', 'person'], ['evidence', 'event'], ['evidence', 'evidence'], ['unknown', 'unknown']],
};

export function compactText(value = '') {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function normalizeGraphKind(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['person', '인물', '주체', 'actor'].includes(text)) return 'person';
  if (['event', '사건', '장면', '행위'].includes(text)) return 'event';
  if (['evidence', '증거', '자료', '문서', 'pdf'].includes(text)) return 'evidence';
  if (['source_span', 'source-span', 'source', 'span', '원문 구간', '원문'].includes(text)) return 'source_span';
  if (['claim', '명제', '주장'].includes(text)) return 'claim';
  if (['premise', 'basis_claim', 'base_claim', '기반명제', '기초명제'].includes(text)) return 'premise';
  if (['inference', '추론'].includes(text)) return 'inference';
  if (['legal_element', 'legal-element', '검토항목', 'legal'].includes(text)) return 'legal_element';
  if (['hypothesis', '가설'].includes(text)) return 'hypothesis';
  return 'unknown';
}

export function normalizeImportance(value) {
  return ['core', 'support', 'uncertain'].includes(value) ? value : 'uncertain';
}

export function normalizeEpistemicStatus(value) {
  return ['asserted', 'corroborated', 'disputed', 'inferred', 'unknown'].includes(value) ? value : 'unknown';
}

export function normalizePolarity(value) {
  return ['positive', 'negative', 'neutral'].includes(value) ? value : 'neutral';
}

export function normalizeVerificationStatus(value) {
  return ['unverified', 'asserted', 'corroborated', 'disputed', 'rejected'].includes(value) ? value : 'unverified';
}

export function defaultAssessment(value = {}) {
  return {
    extractionConfidence: ['unknown', 'low', 'medium', 'high'].includes(value.extractionConfidence) ? value.extractionConfidence : 'unknown',
    sourceReliability: ['unknown', 'low', 'medium', 'high'].includes(value.sourceReliability) ? value.sourceReliability : 'unknown',
    supportStrength: ['unknown', 'weak', 'moderate', 'strong'].includes(value.supportStrength) ? value.supportStrength : 'unknown',
    legalSufficiency: ['not_applicable', 'unknown', 'insufficient', 'contested', 'potentially_sufficient'].includes(value.legalSufficiency) ? value.legalSufficiency : 'not_applicable',
  };
}

export function sanitizeSourceRef(ref = {}) {
  const quote = compactText(ref.quote || '').slice(0, 600);
  return {
    sourceNodeId: String(ref.sourceNodeId || '').slice(0, 120),
    evidenceNodeId: String(ref.evidenceNodeId || '').slice(0, 120),
    fileName: String(ref.fileName || '').slice(0, 180),
    pageNumber: Number.isFinite(Number(ref.pageNumber)) ? Number(ref.pageNumber) : null,
    paragraphIndex: Number.isFinite(Number(ref.paragraphIndex)) ? Number(ref.paragraphIndex) : null,
    startOffset: Number.isFinite(Number(ref.startOffset)) ? Number(ref.startOffset) : null,
    endOffset: Number.isFinite(Number(ref.endOffset)) ? Number(ref.endOffset) : null,
    quote,
  };
}

export function sanitizeSourceRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeSourceRef).filter((ref) => ref.quote || ref.sourceNodeId || ref.evidenceNodeId).slice(0, 12);
}

function normalizedQuoteText(value) {
  return compactText(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sourceRefQuoteExistsInText(ref, sourceText) {
  const quote = normalizedQuoteText(ref?.quote || '');
  if (!quote) return false;
  const haystack = normalizedQuoteText(sourceText || '');
  if (!haystack) return false;
  return haystack.includes(quote);
}

export function filterSourceRefsByText(value, sourceText) {
  const refs = sanitizeSourceRefs(value);
  if (!compactText(sourceText || '')) return refs;
  return refs.filter((ref) => sourceRefQuoteExistsInText(ref, sourceText));
}

export function mergeSourceRefsForEdge(edge = {}, sourceNode = {}, targetNode = {}, sourceText = '') {
  const refs = [
    ...(Array.isArray(edge.sourceRefs) ? edge.sourceRefs : []),
    ...(Array.isArray(edge.source_refs) ? edge.source_refs : []),
    ...(Array.isArray(sourceNode.sourceRefs) ? sourceNode.sourceRefs : []),
    ...(Array.isArray(sourceNode.source_refs) ? sourceNode.source_refs : []),
    ...(Array.isArray(targetNode.sourceRefs) ? targetNode.sourceRefs : []),
    ...(Array.isArray(targetNode.source_refs) ? targetNode.source_refs : []),
  ];

  return filterSourceRefsByText(refs, sourceText);
}

function graphPatchNodeRef(node = {}) {
  return String(node.clientId || node.id || node.label || '').trim();
}

function graphPatchEdgeKey(edge = {}) {
  return [
    String(edge.source || '').trim(),
    String(edge.target || '').trim(),
    String(edge.type || edge.relationType || '').trim(),
    String(edge.role || '').trim(),
  ].join('::');
}

export function ensureSourceClaimPatchPaths(patch = {}, sourceText = '') {
  const nodes = Array.isArray(patch.nodes) ? patch.nodes.map((node) => ({ ...node })) : [];
  const links = Array.isArray(patch.links) ? patch.links.map((link) => ({ ...link })) : [];
  const seenNodes = new Set(nodes.map(graphPatchNodeRef).filter(Boolean));
  const seenLinks = new Set(links.map(graphPatchEdgeKey).filter(Boolean));
  let sharedSourceSpanRef = nodes
    .find((node) => normalizeGraphKind(node.kind || node.type || node.nodeType) === 'source_span')
    ? graphPatchNodeRef(nodes.find((node) => normalizeGraphKind(node.kind || node.type || node.nodeType) === 'source_span'))
    : '';

  nodes
    .filter((node) => normalizeGraphKind(node.kind || node.type || node.nodeType) === 'claim')
    .forEach((claim, index) => {
      const claimRef = graphPatchNodeRef(claim);
      if (!claimRef) return;

      const refs = filterSourceRefsByText(claim.sourceRefs || claim.source_refs, sourceText);
      refs.slice(0, 3).forEach((ref, refIndex) => {
        if (!ref.quote) return;

        const requestedSourceRef = String(ref.sourceNodeId || '').trim();
        const sourceRef = requestedSourceRef && (seenNodes.has(requestedSourceRef) || !sharedSourceSpanRef)
          ? requestedSourceRef
          : sharedSourceSpanRef || 'source-span-1';
        const normalizedRef = {
          ...ref,
          sourceNodeId: sourceRef,
        };

        if (!seenNodes.has(sourceRef)) {
          nodes.push({
            id: sourceRef,
            clientId: sourceRef,
            kind: 'source_span',
            label: '원문',
            role: '원문 발췌',
            importance: 'support',
            epistemicStatus: 'asserted',
            polarity: 'neutral',
            note: compactText(sourceText || ref.quote).slice(0, 1200),
            sourceRefs: [normalizedRef],
            createdBy: 'rule',
          });
          seenNodes.add(sourceRef);
          sharedSourceSpanRef = sourceRef;
        }

        const edge = {
          source: sourceRef,
          target: claimRef,
          type: 'ASSERTS',
          role: '',
          directed: true,
          label: '원문이 명제를 진술',
          basis: '실제 입력 원문 발췌가 해당 명제의 출처로 확인됩니다.',
          sourceRefs: [normalizedRef],
          verificationStatus: 'asserted',
          assessment: {
            extractionConfidence: 'high',
            sourceReliability: 'unknown',
            supportStrength: 'moderate',
            legalSufficiency: 'not_applicable',
          },
          createdBy: 'rule',
          strength: 'confirmed',
        };
        const edgeKey = graphPatchEdgeKey(edge);
        if (!seenLinks.has(edgeKey)) {
          links.push(edge);
          seenLinks.add(edgeKey);
        }
      });
    });

  return {
    ...patch,
    nodes,
    links,
  };
}

function nodeKind(value = {}) {
  return normalizeGraphKind(value.kind || value.type || value.nodeType);
}

function candidateEndpoint(node = {}) {
  return graphPatchNodeRef(node);
}

function relationSpecForKinds(leftKind, rightKind) {
  const pair = `${leftKind}:${rightKind}`;
  const specs = {
    'evidence:source_span': { direction: 'forward', type: 'CONTAINS', role: '' },
    'source_span:evidence': { direction: 'reverse', type: 'CONTAINS', role: '' },
    'source_span:claim': { direction: 'forward', type: 'ASSERTS', role: '' },
    'claim:source_span': { direction: 'reverse', type: 'ASSERTS', role: '' },
    'person:event': { direction: 'forward', type: 'PARTICIPATES_AS', role: 'unknown' },
    'event:person': { direction: 'reverse', type: 'PARTICIPATES_AS', role: 'unknown' },
    'claim:inference': { direction: 'forward', type: 'SUPPORTS', role: '' },
    'inference:claim': { direction: 'reverse', type: 'SUPPORTS', role: '' },
    'claim:legal_element': { direction: 'forward', type: 'SATISFIES', role: '' },
    'legal_element:claim': { direction: 'reverse', type: 'SATISFIES', role: '' },
    'inference:legal_element': { direction: 'forward', type: 'SATISFIES', role: '' },
    'legal_element:inference': { direction: 'reverse', type: 'SATISFIES', role: '' },
    'legal_element:hypothesis': { direction: 'forward', type: 'REQUIRED_FOR', role: '' },
    'hypothesis:legal_element': { direction: 'reverse', type: 'REQUIRED_FOR', role: '' },
    'claim:hypothesis': { direction: 'forward', type: 'SUPPORTS', role: '' },
    'hypothesis:claim': { direction: 'reverse', type: 'SUPPORTS', role: '' },
    'inference:hypothesis': { direction: 'forward', type: 'SUPPORTS', role: '' },
    'hypothesis:inference': { direction: 'reverse', type: 'SUPPORTS', role: '' },
    'claim:event': { direction: 'forward', type: 'EXPLAINS', role: '' },
    'event:claim': { direction: 'reverse', type: 'EXPLAINS', role: '' },
    'hypothesis:event': { direction: 'forward', type: 'EXPLAINS', role: '' },
    'event:hypothesis': { direction: 'reverse', type: 'EXPLAINS', role: '' },
    'claim:evidence': { direction: 'forward', type: 'DERIVED_FROM', role: '' },
    'evidence:claim': { direction: 'reverse', type: 'DERIVED_FROM', role: '' },
    'claim:claim': { direction: 'forward', type: 'SUPPORTS', role: '' },
    'event:event': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
    'person:person': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
    'person:evidence': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
    'evidence:person': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
    'event:evidence': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
    'evidence:event': { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' },
  };

  return specs[pair] || { direction: 'forward', type: 'LEGACY_RELATED_TO', role: '' };
}

export function suggestRelationCandidateBetweenNodes(leftNode = {}, rightNode = {}, options = {}) {
  const leftRef = options.leftRef || candidateEndpoint(leftNode);
  const rightRef = options.rightRef || candidateEndpoint(rightNode);
  if (!leftRef || !rightRef || leftRef === rightRef) return null;

  const spec = relationSpecForKinds(nodeKind(leftNode), nodeKind(rightNode));
  const sourceNode = spec.direction === 'reverse' ? rightNode : leftNode;
  const targetNode = spec.direction === 'reverse' ? leftNode : rightNode;
  const source = spec.direction === 'reverse' ? rightRef : leftRef;
  const target = spec.direction === 'reverse' ? leftRef : rightRef;
  const sourceRefs = mergeSourceRefsForEdge({}, sourceNode, targetNode, options.sourceText || '');

  return sanitizeRelationCandidate({
    source,
    target,
    suggestedType: options.suggestedType || spec.type,
    suggestedRole: options.suggestedRole ?? spec.role,
    reason: options.reason || 'connectivity_candidate',
    basis: options.basis || '새 노드가 고립되지 않도록 생성한 후보 관계입니다. 직접 근거가 확인되기 전까지 분석 경로에는 포함되지 않습니다.',
    sourceRefs,
    confidence: sourceRefs.length ? 'medium' : (options.confidence || 'low'),
    status: 'pending',
    createdBy: options.createdBy || 'rule',
  });
}

function preferredAnchorKindsForNode(kind) {
  const preferences = {
    source_span: ['evidence', 'claim', 'event', 'person'],
    claim: ['event', 'evidence', 'premise', 'person', 'claim'],
    premise: ['claim', 'event', 'evidence', 'person'],
    inference: ['claim', 'premise', 'evidence', 'source_span'],
    legal_element: ['claim', 'inference', 'hypothesis'],
    hypothesis: ['legal_element', 'claim', 'inference', 'event'],
    person: ['event', 'claim', 'source_span', 'evidence', 'person'],
    event: ['claim', 'person', 'evidence', 'source_span', 'event'],
    evidence: ['source_span', 'claim', 'event', 'person', 'evidence'],
  };

  return preferences[kind] || ['event', 'claim', 'premise', 'person', 'evidence'];
}

function choosePatchAnchor(node, nodes) {
  const currentRef = graphPatchNodeRef(node);
  const kind = nodeKind(node);
  const candidates = nodes.filter((item) => graphPatchNodeRef(item) && graphPatchNodeRef(item) !== currentRef);
  const preferences = preferredAnchorKindsForNode(kind);

  for (const preferredKind of preferences) {
    const found = candidates.find((item) => nodeKind(item) === preferredKind);
    if (found) return found;
  }

  return candidates[0] || null;
}

export function ensurePatchConnectivityCandidates(patch = {}, sourceText = '') {
  const nodes = Array.isArray(patch.nodes) ? patch.nodes.map((node) => ({ ...node })) : [];
  const links = Array.isArray(patch.links) ? patch.links.map((link) => ({ ...link })) : [];
  const relationCandidates = Array.isArray(patch.relation_candidates || patch.relationCandidates)
    ? (patch.relation_candidates || patch.relationCandidates).map((candidate) => ({ ...candidate }))
    : [];
  const connectedRefs = new Set();

  [...links, ...relationCandidates].forEach((edge) => {
    const source = String(edge.source || edge.from || '').trim();
    const target = String(edge.target || edge.to || '').trim();
    if (source) connectedRefs.add(source);
    if (target) connectedRefs.add(target);
  });

  const seenCandidates = new Set(relationCandidates.map(relationCandidateKey));

  nodes.forEach((node) => {
    const nodeRef = graphPatchNodeRef(node);
    if (!nodeRef || connectedRefs.has(nodeRef)) return;

    const anchor = choosePatchAnchor(node, nodes);
    if (!anchor) return;

    const candidate = suggestRelationCandidateBetweenNodes(anchor, node, {
      reason: 'orphan_node_connectivity',
      basis: '새로 추출된 노드가 고립되지 않도록 가장 가까운 논증·출처 노드와 후보 관계로 연결했습니다. 직접 근거가 확인되기 전까지 분석 경로에는 포함되지 않습니다.',
      sourceText,
      createdBy: 'rule',
    });
    if (!candidate) return;

    const key = relationCandidateKey(candidate);
    if (seenCandidates.has(key)) return;

    relationCandidates.push(candidate);
    seenCandidates.add(key);
    connectedRefs.add(candidate.source);
    connectedRefs.add(candidate.target);
  });

  return {
    ...patch,
    nodes,
    links,
    relation_candidates: relationCandidates,
    relationCandidates,
  };
}

export function sanitizeGraphNodeV2(node = {}) {
  const kind = normalizeGraphKind(node.kind || node.type || node.nodeType);
  const id = String(node.id || node.clientId || '').slice(0, 120);
  const label = String(node.label || node.name || node.title || '').slice(0, 120);
  const importance = normalizeImportance(node.importance || node.layer);
  const timeStart = String(node.timeStart || node.eventDate || '').slice(0, 40);
  const timeEnd = String(node.timeEnd || '').slice(0, 40);
  const sourceRefs = sanitizeSourceRefs(node.sourceRefs || node.source_refs);

  return {
    id,
    clientId: node.clientId ? String(node.clientId).slice(0, 120) : '',
    kind,
    label,
    role: String(node.role || '').slice(0, 120),
    importance,
    layer: importance,
    epistemicStatus: normalizeEpistemicStatus(node.epistemicStatus),
    polarity: normalizePolarity(node.polarity),
    note: compactText(node.note || node.memo || node.description || '').slice(0, 2400),
    sourceRefs,
    timeStart,
    timeEnd,
    timePrecision: String(node.timePrecision || '').slice(0, 40),
    place: String(node.place || '').slice(0, 180),
    createdBy: ['user', 'ai', 'rule', 'migration'].includes(node.createdBy) ? node.createdBy : 'user',
    analysisStatus: String(node.analysisStatus || 'draft').slice(0, 40),
    x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0,
    y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0,
    eventDate: String(node.eventDate || timeStart.slice(0, 10)).slice(0, 10),
    eventTime: String(node.eventTime || '').slice(0, 5),
    sourceEvidenceId: String(node.sourceEvidenceId || '').slice(0, 120),
    sourceFileName: String(node.sourceFileName || sourceRefs[0]?.fileName || '').slice(0, 180),
    claimText: compactText(node.claimText || '').slice(0, 1800),
    subjectId: String(node.subjectId || '').slice(0, 120),
    predicate: String(node.predicate || '').slice(0, 120),
    objectId: String(node.objectId || '').slice(0, 120),
    value: String(node.value || '').slice(0, 300),
    templateId: String(node.templateId || '').slice(0, 120),
    elementKey: String(node.elementKey || '').slice(0, 120),
    required: Boolean(node.required),
    description: compactText(node.description || '').slice(0, 900),
    expectedEvidenceTypes: Array.isArray(node.expectedEvidenceTypes) ? node.expectedEvidenceTypes.map(String).slice(0, 12) : [],
    hypothesisStatus: ['active', 'alternative', 'weakened', 'unsupported'].includes(node.hypothesisStatus) ? node.hypothesisStatus : 'active',
    clusterId: String(node.clusterId || ''),
    memoUpdatedAt: String(node.memoUpdatedAt || ''),
  };
}

export function sanitizeGraphEdgeV2(edge = {}) {
  const type = GRAPH_EDGE_TYPES.has(edge.type) ? edge.type : (GRAPH_EDGE_TYPES.has(edge.label) ? edge.label : 'LEGACY_RELATED_TO');
  return {
    id: String(edge.id || '').slice(0, 120),
    source: String(edge.source || edge.from || '').slice(0, 120),
    target: String(edge.target || edge.to || '').slice(0, 120),
    type,
    directed: edge.directed !== false,
    role: String(edge.role || '').slice(0, 80),
    label: String(edge.label || type).slice(0, 120),
    basis: compactText(edge.basis || edge.reason || '').slice(0, 1400),
    sourceRefs: sanitizeSourceRefs(edge.sourceRefs || edge.source_refs),
    verificationStatus: normalizeVerificationStatus(edge.verificationStatus || edge.status),
    assessment: defaultAssessment(edge.assessment || {}),
    createdBy: ['user', 'ai', 'rule', 'migration'].includes(edge.createdBy) ? edge.createdBy : 'user',
    analysisStatus: String(edge.analysisStatus || 'draft').slice(0, 40),
    strength: edge.strength || edge.assessment?.supportStrength || 'weak',
  };
}

export function sanitizeRelationCandidate(candidate = {}) {
  return {
    id: String(candidate.id || '').slice(0, 140),
    source: String(candidate.source || '').slice(0, 120),
    target: String(candidate.target || '').slice(0, 120),
    suggestedType: GRAPH_EDGE_TYPES.has(candidate.suggestedType) ? candidate.suggestedType : 'LEGACY_RELATED_TO',
    suggestedRole: String(candidate.suggestedRole || '').slice(0, 80),
    reason: String(candidate.reason || '').slice(0, 240),
    basis: compactText(candidate.basis || '').slice(0, 1200),
    sourceRefs: sanitizeSourceRefs(candidate.sourceRefs || candidate.source_refs),
    confidence: ['unknown', 'low', 'medium', 'high'].includes(candidate.confidence) ? candidate.confidence : 'unknown',
    status: ['pending', 'accepted', 'rejected'].includes(candidate.status) ? candidate.status : 'pending',
    createdBy: ['user', 'ai', 'rule', 'migration'].includes(candidate.createdBy) ? candidate.createdBy : 'rule',
    createdAt: String(candidate.createdAt || new Date().toISOString()),
    reviewedAt: String(candidate.reviewedAt || ''),
  };
}

export function edgeKey(edge) {
  const refs = sanitizeSourceRefs(edge.sourceRefs || edge.source_refs)
    .map((ref) => [ref.sourceNodeId, ref.evidenceNodeId, ref.pageNumber, ref.startOffset, ref.endOffset, ref.quote].join(':'))
    .join('|');
  return [edge.source, edge.target, edge.type || 'LEGACY_RELATED_TO', edge.role || '', refs].join('::');
}

export function relationCandidateKey(candidate) {
  const refs = sanitizeSourceRefs(candidate.sourceRefs || candidate.source_refs)
    .map((ref) => [ref.sourceNodeId, ref.evidenceNodeId, ref.pageNumber, ref.startOffset, ref.endOffset, ref.quote].join(':'))
    .join('|');
  return [candidate.source, candidate.target, candidate.suggestedType || 'LEGACY_RELATED_TO', candidate.suggestedRole || '', candidate.reason || '', refs].join('::');
}

export function validateGraphSemantics(graph) {
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const errors = [];
  const warnings = [];

  (graph.links || []).forEach((rawEdge) => {
    const edge = sanitizeGraphEdgeV2(rawEdge);
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) {
      errors.push({ edgeId: edge.id, code: 'missing_endpoint', message: '관계의 출발 또는 도착 노드가 없습니다.' });
      return;
    }
    const allowed = allowedEdgeKinds[edge.type] || [];
    const ok = allowed.some(([left, right]) => (
      (left === source.kind || left === 'unknown') && (right === target.kind || right === 'unknown')
    ));
    if (!ok) {
      errors.push({
        edgeId: edge.id,
        code: 'invalid_kind_pair',
        message: `${edge.type} 관계는 ${source.kind} -> ${target.kind} 구조로 확정할 수 없습니다.`,
        sourceKind: source.kind,
        targetKind: target.kind,
      });
    }
    if (edge.verificationStatus === 'unverified') {
      warnings.push({ edgeId: edge.id, code: 'unverified_edge', message: '검증되지 않은 관계는 지지 경로 계산에서 제외됩니다.' });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

export function upsertDirectedEdge(graph, rawEdge) {
  const edge = sanitizeGraphEdgeV2(rawEdge);
  if (!edge.source || !edge.target || edge.source === edge.target) return graph;
  const id = edge.id || `edge-${Date.now()}-${(graph.links || []).length + 1}`;
  const nextEdge = { ...edge, id };
  const key = edgeKey(nextEdge);
  const index = (graph.links || []).findIndex((item) => edgeKey(item) === key);
  const links = [...(graph.links || [])];
  if (index >= 0) {
    links[index] = { ...links[index], ...nextEdge, id: links[index].id };
  } else {
    links.push(nextEdge);
  }
  return { ...graph, links };
}

export function addRelationCandidate(graph, rawCandidate) {
  const candidate = sanitizeRelationCandidate(rawCandidate);
  if (!candidate.source || !candidate.target || candidate.source === candidate.target) return graph;
  const id = candidate.id || `candidate-${Date.now()}-${(graph.relationCandidates || []).length + 1}`;
  const nextCandidate = { ...candidate, id };
  const key = relationCandidateKey(nextCandidate);
  const index = (graph.relationCandidates || []).findIndex((item) => relationCandidateKey(item) === key);
  const relationCandidates = [...(graph.relationCandidates || [])];
  if (index >= 0) {
    relationCandidates[index] = { ...relationCandidates[index], ...nextCandidate, id: relationCandidates[index].id };
  } else {
    relationCandidates.push(nextCandidate);
  }
  return { ...graph, relationCandidates };
}

export function relationCandidateToEdge(candidate, overrides = {}) {
  const safe = sanitizeRelationCandidate(candidate);
  const sourceRefs = overrides.sourceRefs || safe.sourceRefs;
  const hasQuote = sanitizeSourceRefs(sourceRefs).some((ref) => ref.quote);
  return sanitizeGraphEdgeV2({
    id: overrides.id || `edge-${safe.id || Date.now()}`,
    source: safe.source,
    target: safe.target,
    type: overrides.type || safe.suggestedType,
    role: overrides.role || safe.suggestedRole,
    label: overrides.label || safe.suggestedType,
    basis: overrides.basis || safe.basis,
    sourceRefs,
    verificationStatus: overrides.verificationStatus || (hasQuote ? 'asserted' : 'unverified'),
    assessment: overrides.assessment || {
      extractionConfidence: safe.confidence,
      sourceReliability: safe.sourceRefs.some((ref) => ref.quote) ? 'medium' : 'unknown',
      supportStrength: 'weak',
      legalSufficiency: 'not_applicable',
    },
    createdBy: overrides.createdBy || 'user',
  });
}

export function migrateGraphSnapshotV1ToV2(snapshot) {
  const payload = snapshot?.state && typeof snapshot.state === 'object' ? snapshot.state : snapshot;
  if (!payload || typeof payload !== 'object') return null;
  const version = Number(snapshot?.version ?? payload?.version ?? payload?.schemaVersion);
  if (version >= GRAPH_SCHEMA_VERSION || payload.schemaVersion >= GRAPH_SCHEMA_VERSION) return normalizeGraphSnapshotV2(snapshot);

  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.map((node) => sanitizeGraphNodeV2({
        ...node,
        importance: node.importance || node.layer,
        createdBy: 'migration',
      })).filter((node) => node.id)
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const relationCandidates = Array.isArray(payload.links)
    ? payload.links
        .map((link, index) => sanitizeRelationCandidate({
          id: `legacy-candidate-${link.id || index}`,
          source: link.source,
          target: link.target,
          suggestedType: 'LEGACY_RELATED_TO',
          suggestedRole: link.role || '',
          reason: 'legacy_undirected_relation',
          basis: [link.label, link.basis, link.strength].filter(Boolean).join(' · '),
          confidence: 'unknown',
          status: 'pending',
          createdBy: 'migration',
          sourceRefs: link.sourceRefs || [],
        }))
        .filter((candidate) => nodeIds.has(candidate.source) && nodeIds.has(candidate.target))
    : [];

  return {
    ...(snapshot || {}),
    version: GRAPH_SCHEMA_VERSION,
    kind: snapshot?.kind || 'knowledge_graph_snapshot',
    state: {
      ...(payload || {}),
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes,
      links: [],
      relationCandidates: uniqueCandidates(relationCandidates),
      clusters: Array.isArray(payload.clusters) ? payload.clusters : [],
      activeLegalTemplateId: payload.activeLegalTemplateId || 'none',
      analysisResults: payload.analysisResults || {},
    },
  };
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = relationCandidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeGraphSnapshotV2(value) {
  const snapshot = typeof value === 'string' ? safeJsonParse(value) : value;
  if (!snapshot || typeof snapshot !== 'object') return null;
  const source = snapshot.state && typeof snapshot.state === 'object' ? snapshot.state : snapshot;
  const version = Number(snapshot.version ?? source.version ?? source.schemaVersion);
  if (version && version < GRAPH_SCHEMA_VERSION) return migrateGraphSnapshotV1ToV2(snapshot);

  const nodes = Array.isArray(source.nodes) ? source.nodes.map(sanitizeGraphNodeV2).filter((node) => node.id) : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = Array.isArray(source.links)
    ? source.links.map(sanitizeGraphEdgeV2).filter((edge) => edge.id && nodeIds.has(edge.source) && nodeIds.has(edge.target))
    : [];
  const relationCandidates = Array.isArray(source.relationCandidates || source.relation_candidates)
    ? uniqueCandidates((source.relationCandidates || source.relation_candidates).map(sanitizeRelationCandidate).filter((candidate) => (
        candidate.id && nodeIds.has(candidate.source) && nodeIds.has(candidate.target)
      )))
    : [];

  return {
    ...(snapshot || {}),
    version: GRAPH_SCHEMA_VERSION,
    kind: snapshot.kind || 'knowledge_graph_snapshot',
    state: {
      ...source,
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes,
      links,
      relationCandidates,
      clusters: Array.isArray(source.clusters) ? source.clusters : [],
      activeLegalTemplateId: source.activeLegalTemplateId || 'none',
      analysisResults: source.analysisResults || {},
    },
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sentenceChunks(text) {
  return compactText(text)
    .split(/(?<=[.!?。！？])\s+|\n+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => chunk.length > 420 ? chunk.match(/.{1,420}(?:\s|$)/g) || [chunk] : [chunk])
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function claimLabelFromText(text, index = 0) {
  const cleaned = compactText(text)
    .replace(/^[#@$]\S+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？]+$/g, '')
    .trim();
  return (cleaned || `명제 ${index + 1}`).slice(0, 34);
}

function premiseTextFromClaim(text = '') {
  const cleaned = compactText(text)
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？]+$/g, '')
    .trim();
  if (!cleaned) return '이 주장을 이해하기 위한 전제 사실 확인 필요';
  if (/주장|진술|말했|설명|항의|요구|부인|인정/.test(cleaned)) {
    return `${cleaned}라는 진술 또는 주장이 존재한다.`;
  }
  if (/캡처|문자|카톡|메일|녹취|CCTV|영상|사진|파일|보고서|메모|진술서|계좌|송금내역/.test(cleaned)) {
    return `${cleaned}라는 자료가 근거로 언급된다.`;
  }
  return `${cleaned}라는 사실관계가 주장 구조의 전제가 된다.`;
}

function claimChunkScore(chunk, index = 0) {
  let score = Math.max(0, 20 - index);
  if (/[#@$]/.test(chunk)) score += 18;
  if (/말했|진술|주장|설명|통보|요구|거절|인정|부인|확인|제출|작성|송금|폭행|협박|촬영|게시|삭제|전송/.test(chunk)) score += 16;
  if (/CCTV|녹취|녹음|캡처|문자|카톡|메일|진술서|메모|PDF|보고서|게시글|댓글|사진|영상|파일|계좌|통화기록/i.test(chunk)) score += 12;
  if (/\d{4}|\d{1,2}\s*월|\d{1,2}\s*일|\d{1,2}\s*시/.test(chunk)) score += 8;
  if (chunk.length > 280) score -= 5;
  if (chunk.length < 12) score -= 12;
  return score;
}

function selectClaimChunks(sourceText, maxClaims = 6) {
  const chunks = sentenceChunks(sourceText);
  const seen = new Set();
  const ranked = chunks
    .map((chunk, index) => ({ chunk, index, score: claimChunkScore(chunk, index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter(({ chunk }) => {
      const key = chunk.replace(/\s+/g, ' ').slice(0, 160);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, Math.max(1, maxClaims))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.chunk);

  return ranked.length ? ranked : (sourceText ? [sourceText.slice(0, 420)] : []);
}

function normalizeEntityLabel(value = '') {
  return compactText(value)
    .replace(/^[@#$]\[?/, '')
    .replace(/\]?$/g, '')
    .replace(/[은는이가을를에게와과로부터명의]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function isEvidenceEntityLabel(label = '') {
  return /cctv|녹취|녹음|녹취록|캡처|문자|카톡|메일|진술서|메모|pdf|보고서|사진|영상|파일|출석부|상담록|회의록|압수물|통화기록|증거|자료|문서|게시글|게시물|댓글|블로그|카페글|sns|포렌식|계좌|송금내역|입금내역|영수증/i.test(label);
}

function isEventEntityLabel(label = '') {
  return /사건|사안|상황|회의|통화|제출|조사|상담|방문|폭행|협박|민원|신고|진술|발생|대화|면담|충돌|송금|입금|게시|삭제|전송|촬영|접촉|연락|보고|요청|거절/.test(label);
}

function isPersonEntityLabel(label = '') {
  const text = normalizeEntityLabel(label);
  if (!text || isEvidenceEntityLabel(text) || isEventEntityLabel(text)) return false;
  const blocked = new Set(['학생', '교사', '학부모', '담당자', '피해자', '가해자', '목격자', '관리자', '담임', '부장', '교감', '교장', '자신', '본인', '태블릿', '계좌', '원금', '보장', '사과', '요구', '메모', '자료', '있었']);
  if (blocked.has(text)) return false;
  if (/교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장|수사관|경찰|검사|피의자|참고인|진술자/.test(text)) return true;
  return /^[A-Z]$/.test(text) || /^[가-힣]{2,5}$/.test(text);
}

function uniqueEntityLabels(values = [], maxItems = 8) {
  const order = new Map();
  const normalized = values
    .map((value, index) => {
      const label = normalizeEntityLabel(value);
      if (label && !order.has(label)) order.set(label, index);
      return label;
    })
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const seen = new Set();
  const result = [];
  normalized.forEach((label) => {
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    if (result.some((existing) => existing.includes(label) && existing.length > label.length)) return;
    if (/^(?:메모|캡처|문자|자료|문서|기록|파일|보고서|증거)$/i.test(label)
      && result.some((existing) => existing.includes(label))) return;
    seen.add(key);
    result.push(label);
  });
  return result
    .sort((left, right) => (order.get(left) ?? 9999) - (order.get(right) ?? 9999))
    .slice(0, maxItems);
}

function extractPersonEntityLabels(sourceText = '') {
  const values = [];
  const blocked = new Set(['사건', '상황', '증거', '자료', '문서', '게시글', '게시물', '댓글', '메모', '기록', '계좌', '원금', '보장', '학생', '교사', '학부모', '자신', '본인', '태블릿', '있었', 'CCTV']);
  const symbolRefs = extractSymbolReferences(sourceText).filter((ref) => ref.trigger === '@');
  symbolRefs.forEach((ref) => values.push(ref.label));

  const namedRolePattern = /([가-힣]{2,5})\s*(교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장|수사관|경찰|검사|피의자|참고인|진술자)(?=\s*(?:은|는|이|가|을|를|에게|와|과|로부터|명의|쪽이|의))/g;
  let roleMatch;
  while ((roleMatch = namedRolePattern.exec(sourceText)) !== null) {
    const label = normalizeEntityLabel(`${roleMatch[1]} ${roleMatch[2]}`);
    if (!label || blocked.has(label) || !isPersonEntityLabel(label)) continue;
    values.push(label);
  }

  const pattern = /(^|[^\p{L}\p{N}_])([A-Z]|[가-힣]{2,5})(?=\s*(?:은|는|이|가|을|를|에게|와|과|로부터|명의|쪽이))/gu;
  let match;
  while ((match = pattern.exec(sourceText)) !== null) {
    const label = normalizeEntityLabel(match[2]);
    const around = sourceText.slice(Math.max(0, match.index - 4), match.index + 8);
    if (/CCTV|PDF|SNS|AI/i.test(around) && /^[A-Z]$/.test(label)) continue;
    if (!label || blocked.has(label) || !isPersonEntityLabel(label)) continue;
    values.push(label);
  }

  return uniqueEntityLabels(values, 8);
}

function extractEvidenceEntityLabels(sourceText = '') {
  const values = [];
  const symbolRefs = extractSymbolReferences(sourceText).filter((ref) => ref.trigger === '$');
  symbolRefs.forEach((ref) => values.push(ref.label));

  const pattern = /([가-힣A-Za-z0-9_.-]{0,16}\s*(?:CCTV|녹취|녹음|녹취록|캡처|문자\s*캡처|카톡|메일|진술서|메모|PDF|보고서|사진|영상|파일|출석부|상담록|회의록|통화기록|게시글|게시물|댓글|블로그|카페글|계좌내역|송금내역|입금내역|영수증))/gi;
  let match;
  while ((match = pattern.exec(sourceText)) !== null) {
    const label = normalizeEntityLabel(match[1])
      .replace(/^[A-Z가-힣]{1,8}\s*(?:은|는|이|가)\s*/g, '')
      .trim();
    if (!label || !isEvidenceEntityLabel(label)) continue;
    values.push(label);
  }

  return uniqueEntityLabels(values, 6);
}

function eventLabelFromChunk(chunk = '', index = 0) {
  const text = compactText(chunk);
  if (/폭행/.test(text)) return '폭행 사건';
  if (/협박/.test(text)) return '협박 사건';
  if (/파손/.test(text)) return '파손 관련 주장';
  if (/송금|입금/.test(text)) return '송금 사건';
  if (/게시|댓글/.test(text)) return '게시 행위';
  if (/통화|연락/.test(text)) return '통화·연락 장면';
  if (/제출/.test(text)) return '자료 제출';
  if (/부인|반박/.test(text)) return '주장 부인';
  if (/요구/.test(text)) return '요구 및 대응';
  if (/조사|면담|상담/.test(text)) return '조사·면담 장면';
  return `${claimLabelFromText(text, index).slice(0, 24)} 관련 장면`;
}

function eventSourceTermFromLabel(label = '') {
  const text = compactText(label);
  if (/폭행/.test(text)) return '폭행';
  if (/협박/.test(text)) return '협박';
  if (/송금/.test(text)) return '송금';
  if (/입금/.test(text)) return '입금';
  if (/게시/.test(text)) return '게시';
  if (/댓글/.test(text)) return '댓글';
  if (/통화/.test(text)) return '통화';
  if (/연락/.test(text)) return '연락';
  if (/제출/.test(text)) return '제출';
  if (/조사/.test(text)) return '조사';
  if (/면담/.test(text)) return '면담';
  if (/상담/.test(text)) return '상담';
  return text.replace(/\s*관련\s*장면$/g, '').replace(/\s*(사건|장면|행위)$/g, '').trim();
}

function extractEventEntityLabels(sourceText = '', claimChunks = []) {
  const values = [];
  const symbolRefs = extractSymbolReferences(sourceText).filter((ref) => ref.trigger === '#');
  symbolRefs.forEach((ref) => values.push(ref.label));

  claimChunks
    .filter((chunk) => /말했|진술|주장|요구|거절|부인|반박|제출|작성|송금|입금|폭행|협박|파손|촬영|게시|삭제|전송|통화|연락|신고|조사|상담|면담/.test(chunk))
    .slice(0, 5)
    .forEach((chunk, index) => values.push(eventLabelFromChunk(chunk, index)));

  return uniqueEntityLabels(values, 4);
}

function sourceRefForEntity(label = '', sourceText = '', sourceSpanId = '', evidenceClientId = '') {
  const startOffset = sourceText.indexOf(label);
  if (startOffset < 0) return [];
  return [{
    sourceNodeId: sourceSpanId,
    evidenceNodeId: evidenceClientId,
    fileName: '',
    pageNumber: null,
    paragraphIndex: null,
    startOffset,
    endOffset: startOffset + label.length,
    quote: label,
  }];
}

function bestClaimAnchorForEntity(nodes = [], entityNode = {}) {
  const searchTerms = [
    normalizeEntityLabel(entityNode.label),
    ...(entityNode.sourceRefs || []).map((ref) => normalizeEntityLabel(ref.quote)),
  ].filter(Boolean);

  return nodes.find((node) => (
    node.kind === 'claim'
    && searchTerms.some((term) => (
      String(node.claimText || '').includes(term)
      || String(node.note || '').includes(term)
      || (node.sourceRefs || []).some((ref) => String(ref.quote || '').includes(term))
    ))
  )) || nodes.find((node) => node.kind === 'claim') || nodes.find((node) => node.kind === 'source_span') || null;
}

export function createSourceClaimPatchFromText(text, options = {}) {
  const sourceText = compactText(text).slice(0, 16000);
  const chunks = selectClaimChunks(sourceText, options.maxClaims || 6);
  const evidenceClientId = options.evidenceClientId || 'manual-evidence-1';
  const fullSourceRef = {
    sourceNodeId: '',
    evidenceNodeId: evidenceClientId,
    fileName: options.fileName || '',
    pageNumber: null,
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: sourceText.length,
    quote: sourceText.slice(0, 1200),
  };
  const nodes = [{
    clientId: evidenceClientId,
    kind: 'evidence',
    label: options.evidenceLabel || '입력된 사안 근거',
    role: '근거 자료',
    importance: 'support',
    epistemicStatus: 'asserted',
    polarity: 'neutral',
    note: sourceText.slice(0, 1200),
    sourceRefs: [fullSourceRef],
    createdBy: 'rule',
  }];
  const links = [];
  const relation_candidates = [];

  const edgeKeys = new Set();
  const addLink = (source, target, type, label, sourceRefs = [], overrides = {}) => {
    if (!source || !target || source === target) return;
    const key = `${source}::${target}::${type}::${overrides.role || ''}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    links.push({
      source,
      target,
      type,
      directed: true,
      role: overrides.role || '',
      label,
      basis: overrides.basis || label,
      verificationStatus: overrides.verificationStatus || 'asserted',
      sourceRefs,
      assessment: {
        extractionConfidence: overrides.extractionConfidence || 'medium',
        sourceReliability: 'unknown',
        supportStrength: overrides.supportStrength || 'weak',
        legalSufficiency: 'not_applicable',
      },
      createdBy: 'rule',
    });
  };

  const personNodes = extractPersonEntityLabels(sourceText).map((label, index) => ({
      clientId: `person-${index + 1}`,
      kind: 'person',
      label,
      role: '관련 인물',
      importance: 'uncertain',
      epistemicStatus: 'asserted',
      polarity: 'neutral',
      note: '',
      sourceRefs: sourceRefForEntity(label, sourceText, '', evidenceClientId),
      createdBy: 'rule',
    }));

  const extraEvidenceNodes = extractEvidenceEntityLabels(sourceText).map((label, index) => ({
      clientId: `evidence-${index + 2}`,
      kind: 'evidence',
      label,
      role: '언급 근거',
      importance: 'support',
      epistemicStatus: 'asserted',
      polarity: 'neutral',
      note: '',
      sourceRefs: sourceRefForEntity(label, sourceText, '', evidenceClientId),
      createdBy: 'rule',
    }));

  const eventLabels = extractEventEntityLabels(sourceText, chunks);
  const eventNodes = (eventLabels.length ? eventLabels : chunks.slice(0, 3).map(eventLabelFromChunk)).map((label, index) => ({
      clientId: `event-${index + 1}`,
      kind: 'event',
      label,
      role: '주요사건',
      importance: index === 0 ? 'core' : 'support',
      epistemicStatus: 'asserted',
      polarity: 'neutral',
      note: chunks[index] || '',
      sourceRefs: sourceRefForEntity(eventSourceTermFromLabel(label), sourceText, '', evidenceClientId),
      createdBy: 'rule',
    }));

  [...eventNodes, ...personNodes, ...extraEvidenceNodes].forEach((node) => nodes.push(node));

  chunks.forEach((chunk, index) => {
    const claimId = `claim-${index + 1}`;
    const premiseId = `premise-${index + 1}`;
    const event = eventNodes[Math.min(index, Math.max(0, eventNodes.length - 1))];
    const relatedPeople = personNodes.filter((person) => chunk.includes(person.label)).slice(0, 4);
    const relatedEvidence = extraEvidenceNodes.filter((evidence) => chunk.includes(evidence.label)).slice(0, 3);
    const startOffset = sourceText.indexOf(chunk);
    const sourceRef = {
      sourceNodeId: '',
      evidenceNodeId: evidenceClientId,
      fileName: options.fileName || '',
      pageNumber: null,
      paragraphIndex: index,
      startOffset: startOffset >= 0 ? startOffset : null,
      endOffset: startOffset >= 0 ? startOffset + chunk.length : null,
      quote: chunk,
    };
    nodes.push({
      clientId: claimId,
      kind: 'claim',
      label: claimLabelFromText(chunk, index),
      role: '주장',
      importance: index === 0 ? 'core' : 'support',
      epistemicStatus: 'asserted',
      polarity: inferPolarity(chunk),
      note: chunk,
      claimText: chunk,
      sourceRefs: [sourceRef],
      createdBy: 'rule',
    });
    nodes.push({
      clientId: premiseId,
      kind: 'premise',
      label: `기반명제 ${index + 1}`,
      role: '기반명제',
      importance: 'support',
      epistemicStatus: 'inferred',
      polarity: inferPolarity(chunk),
      note: premiseTextFromClaim(chunk),
      claimText: premiseTextFromClaim(chunk),
      sourceRefs: [sourceRef],
      createdBy: 'rule',
    });

    addLink(evidenceClientId, claimId, 'SUPPORTS', '입력 근거가 주장을 뒷받침', [sourceRef], { extractionConfidence: 'high' });
    addLink(premiseId, claimId, 'SUPPORTS', '기반명제가 주장을 뒷받침', [sourceRef], { verificationStatus: 'unverified' });
    if (event) addLink(event.clientId, claimId, 'EXPLAINS', '주요사건에서 나온 주장', [sourceRef], { extractionConfidence: 'medium' });
    relatedPeople.forEach((person) => {
      if (event) addLink(event.clientId, person.clientId, 'PARTICIPATES_AS', '주요사건 관련 인물', person.sourceRefs?.length ? person.sourceRefs : [sourceRef], { role: 'related_person' });
      addLink(person.clientId, claimId, 'ASSERTS', '인물과 연결된 주장', [sourceRef], { verificationStatus: 'unverified', role: 'mentioned_actor' });
    });
    relatedEvidence.forEach((evidence) => {
      addLink(evidence.clientId, claimId, 'SUPPORTS', '근거 자료가 주장을 뒷받침', evidence.sourceRefs?.length ? evidence.sourceRefs : [sourceRef], { verificationStatus: 'unverified' });
    });
  });

  for (let index = 0; index < eventNodes.length - 1; index += 1) {
    addLink(eventNodes[index].clientId, eventNodes[index + 1].clientId, 'PRECEDES', '시간순 선행', eventNodes[index].sourceRefs || [], {
      verificationStatus: 'unverified',
      supportStrength: 'weak',
    });
  }

  const symbolRefs = extractSymbolReferences(sourceText);
  for (let index = 0; index < symbolRefs.length - 1; index += 1) {
    const left = symbolRefs[index];
    const right = symbolRefs[index + 1];
    if (left.label === right.label) continue;
    relation_candidates.push({
      source: left.label,
      target: right.label,
      suggestedType: 'LEGACY_RELATED_TO',
      reason: 'symbol_reference_context',
      basis: '명시 기호 참조가 같은 입력에 등장했으나 직접 관계 근거는 사용자가 승인해야 합니다.',
      confidence: 'low',
      status: 'pending',
      createdBy: 'rule',
      sourceRefs: [],
    });
  }

  return {
    summary: '입력된 사안을 주요사건 중심의 단방향 그래프로 정리했습니다.',
    nodes,
    links,
    relation_candidates,
    clusters: [],
    warnings: relation_candidates.length ? ['일부 기호 참조 관계는 후보로 남겼습니다.'] : [],
  };
}

function inferPolarity(text) {
  return /아니|않|없|부인|반박|거짓|불가능|미제공|미지급/.test(text) ? 'negative' : 'positive';
}

function extractSymbolReferences(text) {
  const refs = [];
  const re = /([@#$])([^\s@#$,.;:(){}\[\]'"“”‘’]+)/g;
  let match;
  while ((match = re.exec(text))) {
    refs.push({ trigger: match[1], label: match[2] });
  }
  return refs;
}

function acceptedSupportEdges(graph) {
  return (graph.links || []).filter((edge) => (
    ['SUPPORTS', 'SATISFIES', 'ASSERTS', 'DERIVED_FROM', 'CONTAINS', 'REQUIRED_FOR'].includes(edge.type)
    && !['rejected', 'unverified'].includes(edge.verificationStatus)
  ));
}

function attackingEdges(graph) {
  return (graph.links || []).filter((edge) => (
    ['ATTACKS', 'UNDERCUTS', 'CONTRADICTS'].includes(edge.type)
    && !['rejected', 'unverified'].includes(edge.verificationStatus)
  ));
}

export function buildGraphAdjacency(graph) {
  const out = new Map();
  const inbound = new Map();
  (graph.nodes || []).forEach((node) => {
    out.set(node.id, []);
    inbound.set(node.id, []);
  });
  (graph.links || []).forEach((edge) => {
    if (!out.has(edge.source) || !inbound.has(edge.target)) return;
    out.get(edge.source).push(edge);
    inbound.get(edge.target).push(edge);
  });
  return { out, inbound };
}

export function traceProvenancePaths(graph, targetNodeId, options = {}) {
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const { inbound } = buildGraphAdjacency(graph);
  const maxDepth = options.maxDepth || 8;
  const paths = [];
  const allowed = new Set(['ASSERTS', 'DERIVED_FROM', 'CONTAINS', 'SUPPORTS', 'SATISFIES']);

  function walk(nodeId, edgePath, nodePath, seen, depth) {
    const node = nodes.get(nodeId);
    if (!node || depth > maxDepth) return;
    const incoming = (inbound.get(nodeId) || []).filter((edge) => (
      allowed.has(edge.type) && !['rejected', 'unverified'].includes(edge.verificationStatus)
    ));
    if (node.kind === 'evidence' || !incoming.length) {
      if (edgePath.length) {
        paths.push({ nodeIds: [...nodePath, nodeId], edgeIds: edgePath.map((edge) => edge.id), sourceRefs: collectSourceRefs(edgePath, node) });
      }
      return;
    }

    incoming
      .forEach((edge) => {
        if (seen.has(edge.source)) return;
        walk(edge.source, [edge, ...edgePath], [edge.source, ...nodePath], new Set([...seen, edge.source]), depth + 1);
      });
  }

  walk(targetNodeId, [], [], new Set([targetNodeId]), 0);
  return paths.slice(0, options.limit || 30);
}

export function traceSupportPaths(graph, targetNodeId, options = {}) {
  const supportTypes = new Set(['SUPPORTS', 'SATISFIES', 'ASSERTS', 'DERIVED_FROM', 'CONTAINS']);
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const { inbound } = buildGraphAdjacency(graph);
  const paths = [];

  function walk(nodeId, edgePath, nodePath, seen, depth) {
    if (depth > (options.maxDepth || 8)) return;
    const incoming = (inbound.get(nodeId) || []).filter((edge) => (
      supportTypes.has(edge.type) && !['rejected', 'unverified'].includes(edge.verificationStatus)
    ));
    const node = nodes.get(nodeId);
    if (!incoming.length || node?.kind === 'evidence') {
      if (edgePath.length) {
        paths.push({ nodeIds: [...nodePath, nodeId], edgeIds: edgePath.map((edge) => edge.id), sourceRefs: collectSourceRefs(edgePath, node) });
      }
      return;
    }
    incoming.forEach((edge) => {
      if (seen.has(edge.source)) return;
      walk(edge.source, [edge, ...edgePath], [edge.source, ...nodePath], new Set([...seen, edge.source]), depth + 1);
    });
  }

  walk(targetNodeId, [], [], new Set([targetNodeId]), 0);
  return paths.slice(0, options.limit || 30);
}

function collectSourceRefs(edges, node) {
  const refs = [
    ...(node?.sourceRefs || []),
    ...edges.flatMap((edge) => edge.sourceRefs || []),
  ];
  const seen = new Set();
  return refs.filter((ref) => {
    const key = JSON.stringify(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function findUnsupportedLegalElements(graph, templateId = graph.activeLegalTemplateId || 'none') {
  const legalNodes = (graph.nodes || []).filter((node) => (
    node.kind === 'legal_element'
    && (!templateId || templateId === 'none' || node.templateId === templateId)
    && node.required !== false
  ));
  const attacksByTarget = new Map();
  attackingEdges(graph).forEach((edge) => {
    if (!attacksByTarget.has(edge.target)) attacksByTarget.set(edge.target, []);
    attacksByTarget.get(edge.target).push(edge);
  });

  return legalNodes.map((element) => {
    const supportingPaths = traceSupportPaths(graph, element.id);
    const attacking = attacksByTarget.get(element.id) || [];
    const hasSourceRoot = supportingPaths.some((path) => path.nodeIds.some((id) => (
      ['evidence', 'source_span'].includes(graph.nodes.find((node) => node.id === id)?.kind)
    )));
    const status = !supportingPaths.length || !hasSourceRoot
      ? 'unsupported'
      : attacking.length
        ? 'contested'
        : supportingPaths.length > 1
          ? 'supported_for_review'
          : 'weakly_supported';
    return {
      elementId: element.id,
      elementKey: element.elementKey,
      label: element.label,
      status,
      supportingPathIds: supportingPaths.map((path) => path.edgeIds),
      attackingPathIds: attacking.map((edge) => [edge.id]),
      missingLinkDescription: status === 'unsupported' ? `${element.label} 항목으로 이어지는 검증된 자료 경로가 없습니다.` : '',
      sourceRefs: supportingPaths.flatMap((path) => path.sourceRefs),
    };
  });
}

function evidenceRootsForPath(graph, path) {
  return path.nodeIds
    .map((id) => graph.nodes.find((node) => node.id === id))
    .filter((node) => node?.kind === 'evidence')
    .map((node) => node.id);
}

export function findSingleEvidenceDependencies(graph, templateId = graph.activeLegalTemplateId || 'none') {
  return findUnsupportedLegalElements(graph, templateId)
    .map((element) => {
      const paths = traceSupportPaths(graph, element.elementId);
      const evidenceRoots = [...new Set(paths.flatMap((path) => evidenceRootsForPath(graph, path)))];
      if (evidenceRoots.length !== 1) return null;
      return {
        elementId: element.elementId,
        elementKey: element.elementKey,
        evidenceNodeId: evidenceRoots[0],
        pathIds: paths.map((path) => path.edgeIds),
        sourceRefs: paths.flatMap((path) => path.sourceRefs),
      };
    })
    .filter(Boolean);
}

export function simulateEvidenceRemoval(graph, evidenceNodeId, templateId = graph.activeLegalTemplateId || 'none') {
  const removedSourceSpanIds = new Set((graph.links || [])
    .filter((edge) => edge.source === evidenceNodeId && edge.type === 'CONTAINS')
    .map((edge) => edge.target));
  const removedIds = new Set([evidenceNodeId, ...removedSourceSpanIds]);
  const nextGraph = {
    ...graph,
    nodes: (graph.nodes || []).filter((node) => !removedIds.has(node.id)),
    links: (graph.links || []).filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)),
  };
  const before = findUnsupportedLegalElements(graph, templateId);
  const after = findUnsupportedLegalElements(nextGraph, templateId);
  const affectedLegalElements = after.filter((item) => {
    const previous = before.find((beforeItem) => beforeItem.elementId === item.elementId);
    return previous?.status !== item.status || item.status === 'unsupported';
  });
  const affectedClaims = (graph.links || [])
    .filter((edge) => removedIds.has(edge.source) || removedIds.has(edge.target))
    .flatMap((edge) => [edge.source, edge.target])
    .map((id) => graph.nodes.find((node) => node.id === id))
    .filter((node) => node?.kind === 'claim');

  return {
    evidenceNodeId,
    affectedClaims: [...new Map(affectedClaims.map((node) => [node.id, node])).values()].map((node) => ({ id: node.id, label: node.label, claimText: node.claimText || node.note })),
    brokenProvenancePathIds: before.flatMap((item) => item.supportingPathIds).filter((edgeIds) => (
      edgeIds.some((edgeId) => (graph.links || []).find((edge) => edge.id === edgeId && (removedIds.has(edge.source) || removedIds.has(edge.target))))
    )),
    unsupportedLegalElements: affectedLegalElements,
    affectedHypotheses: compareHypotheses(nextGraph).filter((hypothesis) => hypothesis.supportingClaims.length === 0),
    hasAlternativePath: affectedLegalElements.some((item) => item.status !== 'unsupported'),
    singleEvidenceDependency: findSingleEvidenceDependencies(graph, templateId).some((item) => item.evidenceNodeId === evidenceNodeId),
  };
}

export function findExplicitContradictions(graph) {
  const claims = (graph.nodes || []).filter((node) => node.kind === 'claim');
  const contradictions = [];
  for (let leftIndex = 0; leftIndex < claims.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < claims.length; rightIndex += 1) {
      const left = claims[leftIndex];
      const right = claims[rightIndex];
      const sameTriple = left.subjectId && left.subjectId === right.subjectId
        && left.predicate && left.predicate === right.predicate
        && left.objectId && left.objectId === right.objectId;
      const sameTextStem = normalizeClaimText(left.claimText || left.note) === normalizeClaimText(right.claimText || right.note);
      const oppositePolarity = left.polarity !== 'neutral' && right.polarity !== 'neutral' && left.polarity !== right.polarity;
      if ((sameTriple || sameTextStem) && oppositePolarity) {
        contradictions.push({
          type: 'claim_polarity_conflict',
          nodeIds: [left.id, right.id],
          summary: '같은 명제 구조에 긍정·부정 polarity가 함께 존재합니다.',
          sourceRefs: [...(left.sourceRefs || []), ...(right.sourceRefs || [])],
        });
      }
    }
  }
  const precedes = (graph.links || []).filter((edge) => edge.type === 'PRECEDES' && !['rejected', 'unverified'].includes(edge.verificationStatus));
  detectCycles(precedes).forEach((cycle) => {
    contradictions.push({
      type: 'precedes_cycle',
      edgeIds: cycle,
      summary: 'PRECEDES 시간관계에 순환이 있어 선후관계 확인이 필요합니다.',
      sourceRefs: cycle.flatMap((id) => precedes.find((edge) => edge.id === id)?.sourceRefs || []),
    });
  });
  return contradictions;
}

function normalizeClaimText(text) {
  return compactText(text).replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

function detectCycles(edges) {
  const out = new Map();
  edges.forEach((edge) => {
    if (!out.has(edge.source)) out.set(edge.source, []);
    out.get(edge.source).push(edge);
  });
  const cycles = [];
  function visit(nodeId, stack, edgeStack) {
    if (stack.includes(nodeId)) {
      cycles.push(edgeStack.slice(stack.indexOf(nodeId)));
      return;
    }
    (out.get(nodeId) || []).forEach((edge) => visit(edge.target, [...stack, nodeId], [...edgeStack, edge.id]));
  }
  [...out.keys()].forEach((id) => visit(id, [], []));
  return cycles;
}

export function compareHypotheses(graph) {
  const hypotheses = (graph.nodes || []).filter((node) => node.kind === 'hypothesis');
  return hypotheses.map((hypothesis) => {
    const supporting = (graph.links || []).filter((edge) => edge.target === hypothesis.id && edge.type === 'SUPPORTS' && !['rejected', 'unverified'].includes(edge.verificationStatus));
    const attacking = (graph.links || []).filter((edge) => edge.target === hypothesis.id && ['ATTACKS', 'UNDERCUTS'].includes(edge.type) && !['rejected', 'unverified'].includes(edge.verificationStatus));
    const requiredElements = (graph.links || []).filter((edge) => edge.target === hypothesis.id && edge.type === 'REQUIRED_FOR');
    return {
      hypothesisId: hypothesis.id,
      label: hypothesis.label,
      status: hypothesis.hypothesisStatus,
      supportingClaims: supporting.map((edge) => edge.source),
      attackingClaims: attacking.map((edge) => edge.source),
      undercutInferences: attacking.filter((edge) => edge.type === 'UNDERCUTS').map((edge) => edge.source),
      unexplainedEvidenceOrClaims: (graph.nodes || []).filter((node) => ['evidence', 'claim'].includes(node.kind)).filter((node) => (
        !(graph.links || []).some((edge) => edge.source === node.id || edge.target === node.id)
      )).map((node) => node.id),
      unsupportedRequiredElements: requiredElements
        .map((edge) => findUnsupportedLegalElements(graph).find((item) => item.elementId === edge.source))
        .filter((item) => item && item.status === 'unsupported'),
      singleSourceDependencies: findSingleEvidenceDependencies(graph).filter((item) => requiredElements.some((edge) => edge.source === item.elementId)),
    };
  });
}

export function suggestEvidenceGaps(graph, templateId = graph.activeLegalTemplateId || 'none') {
  return findUnsupportedLegalElements(graph, templateId)
    .filter((item) => item.status === 'unsupported' || item.status === 'weakly_supported')
    .map((item) => {
      const template = legalIssueTemplates[templateId];
      const element = template?.elements?.find((entry) => entry.key === item.elementKey);
      return {
        elementId: item.elementId,
        elementKey: item.elementKey,
        priority: item.status === 'unsupported' ? 'high' : 'medium',
        gap: item.missingLinkDescription || `${item.label} 항목의 자료 경로가 약합니다.`,
        suggestedEvidenceTypes: element?.expectedEvidenceTypes || [],
      };
    });
}

function nodeById(graph, nodeId) {
  return (graph.nodes || []).find((node) => node.id === nodeId) || null;
}

function edgeById(graph, edgeId) {
  return (graph.links || []).find((edge) => edge.id === edgeId) || null;
}

function claimPropositionRisks(graph) {
  const claims = (graph.nodes || []).filter((node) => node.kind === 'claim');
  return claims.map((claim) => {
    const provenancePaths = traceProvenancePaths(graph, claim.id, { limit: 6 });
    const outgoing = (graph.links || []).filter((edge) => edge.source === claim.id && !['rejected'].includes(edge.verificationStatus));
    const incoming = (graph.links || []).filter((edge) => edge.target === claim.id && !['rejected'].includes(edge.verificationStatus));
    const sourceRefs = [
      ...(claim.sourceRefs || []),
      ...incoming.flatMap((edge) => edge.sourceRefs || []),
      ...outgoing.flatMap((edge) => edge.sourceRefs || []),
    ];
    const directQuoteCount = sourceRefs.filter((ref) => ref?.quote).length;
    const connectedEdges = [...incoming, ...outgoing].filter((edge) => (
      ['SUPPORTS', 'ATTACKS', 'UNDERCUTS', 'SATISFIES', 'EXPLAINS', 'ASSERTS'].includes(edge.type)
      && edge.verificationStatus !== 'rejected'
    ));
    const hasEventLink = connectedEdges.some((edge) => {
      const source = nodeById(graph, edge.source);
      const target = nodeById(graph, edge.target);
      return source?.kind === 'event' || target?.kind === 'event';
    });
    const hasEvidenceLink = connectedEdges.some((edge) => {
      const source = nodeById(graph, edge.source);
      const target = nodeById(graph, edge.target);
      return source?.kind === 'evidence' || target?.kind === 'evidence';
    });
    const hasPremiseLink = connectedEdges.some((edge) => {
      const source = nodeById(graph, edge.source);
      const target = nodeById(graph, edge.target);
      return source?.kind === 'premise' || target?.kind === 'premise';
    });
    const hasPersonLink = connectedEdges.some((edge) => {
      const source = nodeById(graph, edge.source);
      const target = nodeById(graph, edge.target);
      return source?.kind === 'person' || target?.kind === 'person';
    });
    const pendingCandidates = (graph.relationCandidates || []).filter((candidate) => (
      candidate.status === 'pending' && (candidate.source === claim.id || candidate.target === claim.id)
    ));
    const risks = [
      !directQuoteCount ? '이 주장을 뒷받침하는 직접 발췌나 입력 근거가 부족합니다.' : '',
      !provenancePaths.length && !hasEvidenceLink ? '주장과 근거(증거)를 잇는 경로가 약합니다.' : '',
      !hasEventLink ? '어느 주요사건에서 나온 주장인지 연결이 필요합니다.' : '',
      !hasPersonLink ? '누구의 말이나 행위와 연결되는 주장인지 확인이 필요합니다.' : '',
      !hasPremiseLink ? '이 주장을 받치는 기반명제가 부족합니다.' : '',
      claim.epistemicStatus === 'unknown' || claim.epistemicStatus === 'inferred' ? '주장인지 추정인지 지위가 더 분명해야 합니다.' : '',
    ].filter(Boolean);
    return risks.length ? {
      claimId: claim.id,
      label: claim.label,
      claimText: claim.claimText || claim.note || claim.label,
      risks,
      provenancePathIds: provenancePaths.map((path) => path.edgeIds),
      pendingCandidateIds: pendingCandidates.map((candidate) => candidate.id),
      sourceRefs: sourceRefs.slice(0, 6),
    } : null;
  }).filter(Boolean);
}

function unverifiedArgumentEdges(graph) {
  return (graph.links || [])
    .filter((edge) => (
      ['SUPPORTS', 'ATTACKS', 'UNDERCUTS', 'SATISFIES', 'EXPLAINS', 'REQUIRED_FOR'].includes(edge.type)
      && (
        ['unverified', 'disputed'].includes(edge.verificationStatus)
        || !(edge.sourceRefs || []).some((ref) => ref?.quote)
      )
    ))
    .map((edge) => {
      const source = nodeById(graph, edge.source);
      const target = nodeById(graph, edge.target);
      return {
        edgeId: edge.id,
        type: edge.type,
        label: edge.label,
        sourceLabel: source?.label || edge.source,
        targetLabel: target?.label || edge.target,
        weakness: edge.verificationStatus === 'disputed'
          ? '관계가 다투어지는 상태입니다.'
          : '근거 발췌 또는 검증 상태가 부족합니다.',
        sourceRefs: edge.sourceRefs || [],
      };
    });
}

function evidenceRemovalRisks(graph, templateId) {
  return (graph.nodes || [])
    .filter((node) => (
      node.kind === 'evidence'
      && !/입력된\s*사안\s*근거|전체\s*입력|manual/i.test(`${node.label || ''} ${node.role || ''}`)
    ))
    .slice(0, 12)
    .map((node) => {
      const result = simulateEvidenceRemoval(graph, node.id, templateId);
      const impactCount = (result.affectedClaims || []).length
        + (result.unsupportedLegalElements || []).length
        + (result.affectedHypotheses || []).length
        + (result.brokenProvenancePathIds || []).length;
      if (!impactCount && !result.singleEvidenceDependency) return null;
      return {
        evidenceNodeId: node.id,
        label: node.label,
        impactCount,
        singleEvidenceDependency: result.singleEvidenceDependency,
        affectedClaims: result.affectedClaims || [],
        unsupportedLegalElements: result.unsupportedLegalElements || [],
        affectedHypotheses: result.affectedHypotheses || [],
        hasAlternativePath: result.hasAlternativePath,
      };
    })
    .filter(Boolean);
}

function candidateRelationRisks(graph) {
  return (graph.relationCandidates || [])
    .filter((candidate) => candidate.status === 'pending')
    .slice(0, 24)
    .map((candidate) => ({
      candidateId: candidate.id,
      source: candidate.source,
      target: candidate.target,
      suggestedType: candidate.suggestedType,
      reason: candidate.reason,
      weakness: (candidate.sourceRefs || []).some((ref) => ref?.quote)
        ? '근거 발췌는 있으나 아직 승인되지 않은 관계입니다.'
        : '직접 근거 발췌가 부족해 후보 관계로 남아 있습니다.',
      basis: candidate.basis || '',
      sourceRefs: candidate.sourceRefs || [],
    }));
}

export function analyzeArgumentVulnerabilities(graph, templateId = graph.activeLegalTemplateId || 'none') {
  const argumentGaps = findUnsupportedLegalElements(graph, templateId);
  const singleEvidenceDependencies = findSingleEvidenceDependencies(graph, templateId);
  const contradictions = findExplicitContradictions(graph);
  const hypotheses = compareHypotheses(graph);
  const propositionRisks = claimPropositionRisks(graph);
  const weakArgumentEdges = unverifiedArgumentEdges(graph);
  const removalRisks = evidenceRemovalRisks(graph, templateId);
  const candidateRisks = candidateRelationRisks(graph);
  const evidencePlan = suggestEvidenceGaps(graph, templateId);

  const priorityFixes = [
    ...argumentGaps
      .filter((gap) => ['unsupported', 'weakly_supported', 'contested'].includes(gap.status))
      .slice(0, 5)
      .map((gap) => ({
        kind: 'argument_gap',
        title: `${gap.elementKey || gap.label || '검토 항목'} 근거 보강`,
        summary: gap.missingLinkDescription || '검토 경로가 비어 있거나 약합니다.',
        nodeIds: [gap.elementId].filter(Boolean),
        edgeIds: [...(gap.supportingPathIds || []), ...(gap.attackingPathIds || [])].flat(),
        sourceRefs: gap.sourceRefs || [],
      })),
    ...propositionRisks.slice(0, 6).map((risk) => ({
      kind: 'claim_weakness',
      title: `${risk.label || '주장'} 정리`,
      summary: risk.risks.join(' '),
      nodeIds: [risk.claimId],
      edgeIds: risk.provenancePathIds.flat(),
      sourceRefs: risk.sourceRefs || [],
    })),
    ...removalRisks.slice(0, 4).map((risk) => ({
      kind: 'evidence_dependency',
      title: `${risk.label || risk.evidenceNodeId} 의존성 점검`,
      summary: `이 증거를 제외하면 영향 항목 ${risk.impactCount}개가 발생합니다.${risk.singleEvidenceDependency ? ' 단일 증거 의존 가능성이 있습니다.' : ''}`,
      nodeIds: [risk.evidenceNodeId, ...(risk.affectedClaims || []).map((claim) => claim.id)].filter(Boolean),
      edgeIds: [],
      sourceRefs: [],
    })),
    ...contradictions.slice(0, 4).map((item) => ({
      kind: 'contradiction',
      title: '명제 또는 시간관계 모순 점검',
      summary: item.summary || item.type,
      nodeIds: item.nodeIds || [],
      edgeIds: item.edgeIds || [],
      sourceRefs: item.sourceRefs || [],
    })),
  ].slice(0, 18);

  return {
    summary: {
      argumentGapCount: argumentGaps.filter((item) => item.status !== 'supported_for_review').length,
      propositionRiskCount: propositionRisks.length,
      weakArgumentEdgeCount: weakArgumentEdges.length,
      evidenceRemovalRiskCount: removalRisks.length,
      contradictionCount: contradictions.length,
      hypothesisCount: hypotheses.length,
      pendingCandidateCount: candidateRisks.length,
    },
    priorityFixes,
    argumentGaps,
    provenanceRisks: weakArgumentEdges,
    evidenceRemovalRisks: removalRisks,
    singleEvidenceDependencies,
    hypothesisRisks: hypotheses,
    contradictions,
    propositionRisks,
    candidateRisks,
    evidencePlan,
  };
}

export function classifyGraphCommand(command = '') {
  const text = String(command).toLowerCase();
  if (/취약|약점|보완|보강|보안점|종합|공략|vulnerab|weakness/.test(text)) return 'vulnerability_analysis';
  if (/공백|구성요건|검토항목|unsupported|gap/.test(text)) return 'legal_gap';
  if (/근거\s*경로|출처|provenance|trace/.test(text)) return 'provenance_trace';
  if (/제거|빼면|삭제|removal/.test(text)) return 'evidence_removal';
  if (/단일\s*증거|하나의\s*증거|single/.test(text)) return 'single_source_dependency';
  if (/모순|충돌|contradiction/.test(text)) return 'contradiction_check';
  if (/가설|hypothesis|경쟁/.test(text)) return 'hypothesis_comparison';
  if (/확보|보강|다음.*자료|evidence plan/.test(text)) return 'evidence_plan';
  return 'freeform';
}

export function runDeterministicGraphCommand(graph, command, options = {}) {
  const type = options.analysisType || classifyGraphCommand(command);
  const templateId = options.templateId || graph.activeLegalTemplateId || 'none';
  const targetNodeId = options.targetNodeId || graph.selectedNodeId || '';
  const evidenceNodeId = options.evidenceNodeId || (graph.nodes || []).find((node) => node.kind === 'evidence')?.id || '';

  if (type === 'legal_gap') return { analysis_type: type, findings: findUnsupportedLegalElements(graph, templateId), limitations: ['relationCandidates는 계산에서 제외했습니다.'] };
  if (type === 'provenance_trace') return { analysis_type: type, findings: targetNodeId ? traceProvenancePaths(graph, targetNodeId) : [], limitations: targetNodeId ? [] : ['대상 노드가 선택되지 않았습니다.'] };
  if (type === 'evidence_removal') return { analysis_type: type, findings: evidenceNodeId ? [simulateEvidenceRemoval(graph, evidenceNodeId, templateId)] : [], limitations: evidenceNodeId ? [] : ['제거할 증거 노드가 없습니다.'] };
  if (type === 'single_source_dependency') return { analysis_type: type, findings: findSingleEvidenceDependencies(graph, templateId), limitations: [] };
  if (type === 'contradiction_check') return { analysis_type: type, findings: findExplicitContradictions(graph), limitations: ['거리나 이동 가능성이 입력되지 않은 경우 물리적 불가능은 단정하지 않았습니다.'] };
  if (type === 'hypothesis_comparison') return { analysis_type: type, findings: compareHypotheses(graph), limitations: ['가설의 승패나 유무죄 가능성은 계산하지 않습니다.'] };
  if (type === 'evidence_plan') return { analysis_type: type, findings: suggestEvidenceGaps(graph, templateId), limitations: [] };
  if (type === 'vulnerability_analysis') {
    return {
      analysis_type: type,
      findings: analyzeArgumentVulnerabilities(graph, templateId),
      limitations: [
        '자동 판단이 아니라 현재 그래프 연결을 기준으로 한 보완점 분석입니다.',
      ],
    };
  }
  return {
    analysis_type: type,
    findings: {
      validation: validateGraphSemantics(graph),
      gaps: findUnsupportedLegalElements(graph, templateId),
      contradictions: findExplicitContradictions(graph),
      dependencies: findSingleEvidenceDependencies(graph, templateId),
    },
    limitations: ['자유 명령은 로컬 엔진의 기본 분석 패키지를 우선 제공합니다.'],
  };
}

export function buildGraphQueryPackage(graph, command, options = {}) {
  const engineResult = options.engineResult || runDeterministicGraphCommand(graph, command, options);
  const relevantIds = new Set();
  collectIds(engineResult.findings, relevantIds);
  if (options.targetNodeId) relevantIds.add(options.targetNodeId);
  if (!relevantIds.size) (graph.nodes || []).slice(0, 12).forEach((node) => relevantIds.add(node.id));

  const expandedIds = expandNeighborhood(graph, relevantIds, options.hops || 2);
  const nodes = (graph.nodes || []).filter((node) => expandedIds.has(node.id)).map(minNodeForPackage);
  const links = (graph.links || []).filter((edge) => expandedIds.has(edge.source) && expandedIds.has(edge.target)).map(minEdgeForPackage);
  const sourceSpans = nodes.filter((node) => node.kind === 'source_span').slice(0, 20);
  const excludedRelationCandidates = (graph.relationCandidates || []).filter((candidate) => candidate.status !== 'accepted').length;

  return {
    kind: 'graph_query_package',
    schemaVersion: GRAPH_SCHEMA_VERSION,
    command,
    analysisType: engineResult.analysis_type,
    engineResult,
    nodes,
    links,
    sourceSpans,
    legalTemplate: legalIssueTemplates[graph.activeLegalTemplateId || 'none'] || legalIssueTemplates.none,
    excludedRelationCandidates,
    truncated: nodes.length < expandedIds.size || links.length < (graph.links || []).length,
    warnings: [
      'relationCandidates는 결정론적 계산에서 제외되었습니다.',
      'LLM은 엔진 결과 설명에만 사용되며 새 근거 경로를 만들 수 없습니다.',
    ],
  };
}

function collectIds(value, set) {
  if (!value) return;
  if (typeof value === 'string') {
    if (/^(person|event|evidence|source|span|claim|inference|legal|hypothesis|node|edge|link|candidate)-/.test(value)) set.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectIds(item, set));
    return;
  }
  if (typeof value === 'object') {
    ['nodeId', 'node_id', 'elementId', 'hypothesisId', 'evidenceNodeId'].forEach((key) => {
      if (value[key]) set.add(value[key]);
    });
    ['nodeIds', 'edgeIds', 'supportingClaims', 'attackingClaims'].forEach((key) => {
      if (Array.isArray(value[key])) value[key].forEach((id) => set.add(id));
    });
    Object.values(value).forEach((item) => collectIds(item, set));
  }
}

function expandNeighborhood(graph, seedIds, hops) {
  const ids = new Set(seedIds);
  for (let depth = 0; depth < hops; depth += 1) {
    (graph.links || []).forEach((edge) => {
      if (ids.has(edge.source)) ids.add(edge.target);
      if (ids.has(edge.target)) ids.add(edge.source);
    });
  }
  return ids;
}

function minNodeForPackage(node) {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    role: node.role,
    epistemicStatus: node.epistemicStatus,
    polarity: node.polarity,
    claimText: node.claimText,
    elementKey: node.elementKey,
    templateId: node.templateId,
    hypothesisStatus: node.hypothesisStatus,
    note: compactText(node.note).slice(0, 500),
    sourceRefs: (node.sourceRefs || []).slice(0, 4),
  };
}

function minEdgeForPackage(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    role: edge.role,
    label: edge.label,
    verificationStatus: edge.verificationStatus,
    assessment: edge.assessment,
    basis: compactText(edge.basis).slice(0, 500),
    sourceRefs: (edge.sourceRefs || []).slice(0, 4),
  };
}

export function buildKnowledgeGraphGuidanceV2(graph) {
  const templateId = graph.activeLegalTemplateId || 'none';
  const gaps = findUnsupportedLegalElements(graph, templateId);
  const dependencies = findSingleEvidenceDependencies(graph, templateId);
  const contradictions = findExplicitContradictions(graph);
  const candidateCount = (graph.relationCandidates || []).filter((candidate) => candidate.status === 'pending').length;
  return [
    '[출처 추적형 증거-논증 그래프 v2]',
    `- 노드: ${(graph.nodes || []).length}개 / accepted 관계: ${(graph.links || []).length}개 / 후보 관계: ${candidateCount}개`,
    `- 검토항목 세트: ${legalIssueTemplates[templateId]?.label || '없음'}`,
    '',
    '[검토항목 공백]',
    ...(gaps.length ? gaps.map((item) => `- ${item.elementKey || item.label}: ${item.status}${item.missingLinkDescription ? ` · ${item.missingLinkDescription}` : ''}`) : ['- 선택된 필수 검토항목이 없거나 아직 공백 탐지가 필요 없습니다.']),
    '',
    '[단일 증거 의존성]',
    ...(dependencies.length ? dependencies.map((item) => `- ${item.elementKey}: ${item.evidenceNodeId} 하나에 의존`) : ['- 단일 증거 의존성은 아직 탐지되지 않았습니다.']),
    '',
    '[명시적 모순]',
    ...(contradictions.length ? contradictions.map((item) => `- ${item.type}: ${item.summary}`) : ['- 명시적으로 확인된 모순은 아직 없습니다.']),
    '',
    '주의: 노드 수, 관계 수, 그래프 밀도는 사건의 강도나 법적 충분성을 의미하지 않습니다.',
  ].join('\n');
}
