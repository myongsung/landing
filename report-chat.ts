// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const openAiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const defaultModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const modelSequence = uniqueStrings([
  defaultModel,
  'gpt-4o-mini',
]);

function firstKeyFromJsonSecret(value: string) {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
    if (Array.isArray(parsed)) return parsed.find((item) => typeof item === 'string') ?? '';
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).find((item) => typeof item === 'string') ?? '';
    }
  } catch {
    return value;
  }
  return '';
}

function getPublishableKey() {
  return (
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    firstKeyFromJsonSecret(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '') ??
    ''
  );
}

function getSecretKey() {
  return (
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    firstKeyFromJsonSecret(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '') ??
    ''
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function compactText(value: unknown, max = 12000) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result;
}

function isFatalOpenAiError(message: string) {
  return /authentication|unauthorized|forbidden|invalid api key|insufficient_quota/i.test(message);
}

function fallbackAiObject(content: string, mode: string) {
  const assistantMessage = compactText(content || '요청을 처리했지만 구조화 응답을 만들지 못했습니다.', 5000);

  if (mode === 'graph_extract') {
    return {
      assistant_message: assistantMessage,
      graph_patch: {
        summary: assistantMessage,
        nodes: [],
        links: [],
        relation_candidates: [],
        clusters: [],
        warnings: ['AI 응답을 구조화하지 못해 그래프 패치를 만들지 않았습니다.'],
      },
    };
  }

  if (mode === 'graph_command') {
    return {
      assistant_message: assistantMessage,
      analysis_type: 'freeform',
      findings: [],
      citations: [],
      limitations: ['AI 응답을 구조화하지 못했습니다. 프론트엔드 로컬 분석 결과를 우선 확인하세요.'],
    };
  }

  return {
    title: '사안 분석',
    assistant_message: assistantMessage,
    status: 'draft',
    report_markdown: '',
  };
}

function normalizeGraphLabel(value: unknown, fallback = '') {
  return String(value ?? fallback)
    .replace(/[@#$]/g, '')
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function uniqueLabels(values: string[], limit = 12) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const label = normalizeGraphLabel(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= limit) break;
  }

  return result;
}

function extractSymbolRefs(text: string, symbol: string) {
  const pattern = new RegExp(`\\${symbol}(\\[[^\\]]+\\]|[가-힣A-Za-z0-9_.-]{2,30})`, 'g');
  const values: string[] = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    values.push(match[1].replace(/^\[|\]$/g, ''));
  }

  return values;
}

function inferPersonLabels(text: string) {
  const values = extractSymbolRefs(text, '@');
  const pattern = /([가-힣A-Za-z0-9]{2,14}(?:교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장|수사관|검사|경찰|피의자|참고인)|[가-힣]{2,5})(?:\s*)(?:이|가|은|는|을|를|에게|와|과|로부터|쪽이)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    values.push(match[1]);
  }

  return uniqueLabels(values, 10);
}

function inferEvidenceLabels(text: string) {
  const values = extractSymbolRefs(text, '$');
  const pattern = /([가-힣A-Za-z0-9_.-]{0,16}(?:CCTV|녹취|녹음|캡처|문자|카톡|메일|진술서|메모|PDF|보고서|사진|영상|파일|출석부|상담록|회의록|압수물|통화기록))/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    values.push(match[1]);
  }

  return uniqueLabels(values, 10);
}

function inferEventLabels(text: string) {
  const symbolRefs = extractSymbolRefs(text, '#');
  if (symbolRefs.length) return uniqueLabels(symbolRefs, 10);

  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) || '';
  const keyed = firstLine.match(/(?:사건명|사안명|상황명|제목)\s*[:：]\s*(.+)/i)?.[1] || '';
  const title = normalizeGraphLabel(keyed || firstLine.replace(/[@#$]\[?[^\s\]]+\]?/g, '').trim(), '상황 기록');
  return uniqueLabels([title || '상황 기록'], 3);
}

function inferEventDateTime(text: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = '';
  let day = '';
  const iso = text.match(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})\s*일?/);
  const korean = text.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);

  if (iso) {
    year = Number(iso[1]);
    month = iso[2];
    day = iso[3];
  } else if (korean) {
    year = korean[1] ? Number(korean[1]) : year;
    month = korean[2];
    day = korean[3];
  }

  const timeMatch = text.match(/(오전|오후)?\s*(\d{1,2})\s*(?:시|:)\s*(?:(\d{1,2})\s*분?)?/);
  let eventTime = '';
  if (timeMatch) {
    let hour = Number(timeMatch[2]);
    const minute = Number(timeMatch[3] || 0);
    if (timeMatch[1] === '오후' && hour < 12) hour += 12;
    if (timeMatch[1] === '오전' && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      eventTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  return {
    eventDate: month && day
      ? `${String(year).padStart(4, '0')}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
      : '',
    eventTime,
  };
}

function sentenceChunks(text: string) {
  return compactText(text, 16000)
    .split(/(?<=[.!?。！？])\s+|\n+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => chunk.length > 420 ? chunk.match(/.{1,420}(?:\s|$)/g) || [chunk] : [chunk])
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function inferClaimPolarity(text: string) {
  return /아니|않|없|부인|반박|거짓|불가능|미제공|미지급/.test(text) ? 'negative' : 'positive';
}

function compactLabel(text: string, fallback: string) {
  return compactText(text, 500)
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？]+$/g, '')
    .slice(0, 34)
    || fallback;
}

function eventLabelFromChunk(chunk: string, index: number) {
  if (/폭행/.test(chunk)) return '폭행 사건';
  if (/협박/.test(chunk)) return '협박 사건';
  if (/파손/.test(chunk)) return '파손 관련 주장';
  if (/송금|입금/.test(chunk)) return '송금 사건';
  if (/게시|댓글/.test(chunk)) return '게시 행위';
  if (/통화|연락/.test(chunk)) return '통화·연락 장면';
  if (/제출/.test(chunk)) return '자료 제출';
  if (/부인|반박/.test(chunk)) return '주장 부인';
  if (/요구/.test(chunk)) return '요구 및 대응';
  if (/조사|면담|상담/.test(chunk)) return '조사·면담 장면';
  return compactLabel(chunk, `주요 사건 ${index + 1}`);
}

function premiseTextFromClaim(text: string) {
  const cleaned = compactText(text, 600).replace(/[.!?。！？]+$/g, '').trim();
  if (!cleaned) return '이 주장을 이해하기 위한 전제 사실 확인 필요';
  if (/주장|진술|말했|설명|항의|요구|부인|인정/.test(cleaned)) {
    return `${cleaned}라는 진술 또는 주장이 존재한다.`;
  }
  if (/캡처|문자|카톡|메일|녹취|CCTV|영상|사진|파일|보고서|메모|진술서|계좌|송금내역/.test(cleaned)) {
    return `${cleaned}라는 자료가 근거로 언급된다.`;
  }
  return `${cleaned}라는 사실관계가 주장 구조의 전제가 된다.`;
}

function normalizeShortLabel(value: string) {
  return compactText(value, 120)
    .replace(/[은는이가을를에게와과로부터명의]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueLabels(values: string[], maxItems: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const label = normalizeShortLabel(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result.slice(0, maxItems);
}

function extractPersonLabels(text: string) {
  const blocked = new Set(['학생', '교사', '학부모', '자신', '본인', '태블릿', '있었', 'CCTV']);
  const values: string[] = [];
  const rolePattern = /([가-힣]{2,5})\s*(교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장|수사관|경찰|검사|피의자|참고인|진술자)(?=\s*(?:은|는|이|가|을|를|에게|와|과|로부터|명의|쪽이|의))/g;
  let roleMatch;
  while ((roleMatch = rolePattern.exec(text)) !== null) {
    values.push(`${roleMatch[1]} ${roleMatch[2]}`);
  }
  const simplePattern = /(^|[^\p{L}\p{N}_])([A-Z]|[가-힣]{2,5})(?=\s*(?:은|는|이|가|을|를|에게|와|과|로부터|명의|쪽이))/gu;
  let match;
  while ((match = simplePattern.exec(text)) !== null) {
    const label = normalizeShortLabel(match[2]);
    const around = text.slice(Math.max(0, match.index - 4), match.index + 8);
    if (/CCTV|PDF|SNS|AI/i.test(around) && /^[A-Z]$/.test(label)) continue;
    if (blocked.has(label)) continue;
    values.push(label);
  }
  return uniqueLabels(values, 10);
}

function extractEvidenceLabels(text: string) {
  const values: string[] = [];
  const pattern = /([가-힣A-Za-z0-9_.-]{0,16}\s*(?:CCTV|녹취|녹음|녹취록|캡처|문자\s*캡처|카톡|메일|진술서|메모|PDF|보고서|사진|영상|파일|출석부|상담록|회의록|통화기록|게시글|게시물|댓글|계좌내역|송금내역|입금내역|영수증))/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) values.push(match[1]);
  return uniqueLabels(values, 8);
}

function deterministicGraphPatch(body: any, summary = '') {
  const text = compactText(body?.message || body?.structuredInput?.sourceText || '', 16000);
  const chunks = sentenceChunks(text).slice(0, 6);
  const evidenceClientId = 'manual-evidence-1';
  const sourceRef = {
    sourceNodeId: '',
    evidenceNodeId: evidenceClientId,
    fileName: '',
    pageNumber: null,
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: text.length,
    quote: text.slice(0, 1200),
  };
  const nodes = [{
    clientId: evidenceClientId,
    kind: 'evidence',
    label: '입력된 사안 근거',
    role: '근거 자료',
    importance: 'support',
    epistemicStatus: 'asserted',
    polarity: 'neutral',
    note: text.slice(0, 1200),
    sourceRefs: [sourceRef],
    timeStart: '',
    timeEnd: '',
    timePrecision: '',
    place: '',
    createdBy: 'rule',
  }];
  const links: any[] = [];

  const addLink = (source: string, target: string, type: string, label: string, refs: any[], extra: any = {}) => {
    if (!source || !target || source === target) return;
    if (links.some((link) => link.source === source && link.target === target && link.type === type && link.role === (extra.role || ''))) return;
    links.push({
      source,
      target,
      type,
      directed: true,
      role: extra.role || '',
      label,
      basis: extra.basis || label,
      sourceRefs: refs,
      verificationStatus: extra.verificationStatus || 'asserted',
      assessment: {
        extractionConfidence: extra.extractionConfidence || 'medium',
        sourceReliability: 'unknown',
        supportStrength: extra.supportStrength || 'weak',
        legalSufficiency: 'not_applicable',
      },
      createdBy: 'rule',
    });
  };

  const eventCount = Math.max(1, Math.min(5, chunks.length || 1));
  const eventNodes = chunks.slice(0, eventCount).map((chunk, index) => {
    const dateTime = parseDateTime(chunk);
    return {
      clientId: `event-${index + 1}`,
      kind: 'event',
      label: eventLabelFromChunk(chunk, index),
      role: '주요사건',
      importance: index === 0 ? 'core' : 'support',
      epistemicStatus: 'asserted',
      polarity: 'neutral',
      note: chunk,
      sourceRefs: [{
        ...sourceRef,
        paragraphIndex: index,
        quote: chunk,
      }],
      timeStart: dateTime.eventDate || '',
      timeEnd: '',
      timePrecision: dateTime.eventTime ? 'minute' : dateTime.eventDate ? 'day' : '',
      place: '',
      createdBy: 'rule',
      eventDate: dateTime.eventDate || '',
      eventTime: dateTime.eventTime || '',
    };
  });
  nodes.push(...eventNodes);

  const personNodes = extractPersonLabels(text).map((label, index) => ({
    clientId: `person-${index + 1}`,
    kind: 'person',
    label,
    role: '관련 인물',
    importance: 'uncertain',
    epistemicStatus: 'asserted',
    polarity: 'neutral',
    note: '',
    sourceRefs: [],
    timeStart: '',
    timeEnd: '',
    timePrecision: '',
    place: '',
    createdBy: 'rule',
  }));
  const extraEvidenceNodes = extractEvidenceLabels(text).map((label, index) => ({
    clientId: `evidence-${index + 2}`,
    kind: 'evidence',
    label,
    role: '근거 자료',
    importance: 'support',
    epistemicStatus: 'asserted',
    polarity: 'neutral',
    note: '',
    sourceRefs: [],
    timeStart: '',
    timeEnd: '',
    timePrecision: '',
    place: '',
    createdBy: 'rule',
  }));
  nodes.push(...personNodes, ...extraEvidenceNodes);

  chunks.forEach((chunk, index) => {
    const claimId = `claim-${index + 1}`;
    const premiseId = `premise-${index + 1}`;
    const event = eventNodes[Math.min(index, eventNodes.length - 1)];
    const relatedPeople = personNodes.filter((person) => chunk.includes(person.label.split(' ')[0])).slice(0, 4);
    const relatedEvidence = extraEvidenceNodes.filter((evidence) => chunk.includes(evidence.label)).slice(0, 3);
    const startOffset = text.indexOf(chunk);
    const chunkRef = {
      sourceNodeId: '',
      evidenceNodeId: evidenceClientId,
      fileName: '',
      pageNumber: null,
      paragraphIndex: index,
      startOffset: startOffset >= 0 ? startOffset : null,
      endOffset: startOffset >= 0 ? startOffset + chunk.length : null,
      quote: chunk,
    };
    nodes.push({
      clientId: claimId,
      kind: 'claim',
      label: compactLabel(chunk, `주장 ${index + 1}`),
      role: '주장',
      importance: index === 0 ? 'core' : 'support',
      epistemicStatus: 'asserted',
      polarity: inferClaimPolarity(chunk),
      note: chunk,
      sourceRefs: [chunkRef],
      claimText: chunk,
      subjectId: '',
      predicate: '',
      objectId: '',
      value: '',
      timeStart: '',
      timeEnd: '',
      timePrecision: '',
      place: '',
      createdBy: 'rule',
    });
    nodes.push({
      clientId: premiseId,
      kind: 'premise',
      label: `기반명제 ${index + 1}`,
      role: '기반명제',
      importance: 'support',
      epistemicStatus: 'inferred',
      polarity: inferClaimPolarity(chunk),
      note: premiseTextFromClaim(chunk),
      sourceRefs: [chunkRef],
      claimText: premiseTextFromClaim(chunk),
      timeStart: '',
      timeEnd: '',
      timePrecision: '',
      place: '',
      createdBy: 'rule',
    });
    if (event) addLink(event.clientId, claimId, 'EXPLAINS', '주요사건에서 나온 주장', [chunkRef], { extractionConfidence: 'medium' });
    addLink(evidenceClientId, claimId, 'SUPPORTS', '입력 근거가 주장을 뒷받침', [chunkRef], { extractionConfidence: 'high' });
    addLink(premiseId, claimId, 'SUPPORTS', '기반명제가 주장을 뒷받침', [chunkRef], { verificationStatus: 'unverified' });
    relatedPeople.forEach((person) => {
      if (event) addLink(event.clientId, person.clientId, 'PARTICIPATES_AS', '주요사건 관련 인물', [chunkRef], { role: 'related_person' });
      addLink(person.clientId, claimId, 'ASSERTS', '인물과 연결된 주장', [chunkRef], { verificationStatus: 'unverified', role: 'mentioned_actor' });
    });
    relatedEvidence.forEach((evidence) => {
      addLink(evidence.clientId, claimId, 'SUPPORTS', '근거 자료가 주장을 뒷받침', [chunkRef], { verificationStatus: 'unverified' });
    });
  });

  for (let index = 0; index < eventNodes.length - 1; index += 1) {
    addLink(eventNodes[index].clientId, eventNodes[index + 1].clientId, 'PRECEDES', '시간순 선행', eventNodes[index].sourceRefs || [], {
      verificationStatus: 'unverified',
    });
  }

  return {
    summary: summary || '입력된 사안을 주요사건 중심의 단방향 그래프로 정리했습니다.',
    nodes,
    links,
    relation_candidates: [],
    clusters: [],
    warnings: ['AI 의미 분석 없이 주요사건, 주장, 근거, 기반명제의 최소 연결 구조를 보존했습니다.'],
  };
}

function hasGraphPatchContent(patch: any) {
  return Boolean(
    patch &&
    typeof patch === 'object' &&
    (
      (Array.isArray(patch.nodes) && patch.nodes.length) ||
      (Array.isArray(patch.links) && patch.links.length) ||
      (Array.isArray(patch.relationships) && patch.relationships.length) ||
      (Array.isArray(patch.relation_candidates) && patch.relation_candidates.length) ||
      (Array.isArray(patch.relationCandidates) && patch.relationCandidates.length) ||
      (Array.isArray(patch.clusters) && patch.clusters.length)
    )
  );
}

function graphPatchFromAi(ai: any, body: any) {
  const patch =
    ai?.graph_patch ??
    ai?.graphPatch ??
    ai?.patch ??
    ai?.result?.graph_patch ??
    ai?.result?.graphPatch ??
    ai?.meta?.graph_patch ??
    ai?.meta?.graphPatch;

  if (hasGraphPatchContent(patch)) return patch;
  return deterministicGraphPatch(body, ai?.assistant_message || ai?.assistantMessage || '');
}

function responseFormatForMode(mode: string) {
  if (mode === 'graph_extract') {
    return {
      type: 'json_schema',
      name: 'roosycozy_graph_extract_response',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['assistant_message', 'graph_patch'],
        properties: {
          assistant_message: { type: 'string' },
          graph_patch: {
            type: 'object',
            additionalProperties: false,
            required: ['summary', 'nodes', 'links', 'relation_candidates', 'clusters', 'warnings'],
            properties: {
              summary: { type: 'string' },
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['clientId', 'kind', 'label', 'role', 'importance', 'epistemicStatus', 'polarity', 'note', 'sourceRefs', 'timeStart', 'timeEnd', 'timePrecision', 'place', 'createdBy'],
                  properties: {
                    clientId: { type: 'string' },
                    id: { type: 'string' },
                    kind: { type: 'string', enum: ['person', 'event', 'evidence', 'claim', 'premise'] },
                    label: { type: 'string' },
                    role: { type: 'string' },
                    importance: { type: 'string', enum: ['core', 'support', 'uncertain'] },
                    epistemicStatus: { type: 'string', enum: ['asserted', 'corroborated', 'disputed', 'inferred', 'unknown'] },
                    polarity: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                    note: { type: 'string' },
                    sourceRefs: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                    timeStart: { type: 'string' },
                    timeEnd: { type: 'string' },
                    timePrecision: { type: 'string' },
                    place: { type: 'string' },
                    createdBy: { type: 'string', enum: ['user', 'ai', 'rule', 'migration'] },
                    eventDate: { type: 'string' },
                    eventTime: { type: 'string' },
                    claimText: { type: 'string' },
                    subjectId: { type: 'string' },
                    predicate: { type: 'string' },
                    objectId: { type: 'string' },
                    value: { type: 'string' },
                    templateId: { type: 'string' },
                    elementKey: { type: 'string' },
                    required: { type: 'boolean' },
                    description: { type: 'string' },
                    expectedEvidenceTypes: { type: 'array', items: { type: 'string' } },
                    hypothesisStatus: { type: 'string', enum: ['active', 'alternative', 'weakened', 'unsupported'] },
                  },
                },
              },
              links: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['source', 'target', 'type', 'directed', 'role', 'label', 'basis', 'sourceRefs', 'verificationStatus', 'assessment', 'createdBy'],
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    type: { type: 'string', enum: ['CONTAINS', 'ASSERTS', 'DERIVED_FROM', 'PARTICIPATES_AS', 'SUPPORTS', 'ATTACKS', 'UNDERCUTS', 'SATISFIES', 'REQUIRED_FOR', 'PRECEDES', 'OVERLAPS', 'CONTRADICTS', 'EXPLAINS', 'ALTERNATIVE_TO', 'INCOMPATIBLE_WITH', 'LEGACY_RELATED_TO'] },
                    directed: { type: 'boolean' },
                    role: { type: 'string' },
                    label: { type: 'string' },
                    basis: { type: 'string' },
                    sourceRefs: { type: 'array', items: { type: 'object' } },
                    verificationStatus: { type: 'string', enum: ['unverified', 'asserted', 'corroborated', 'disputed', 'rejected'] },
                    assessment: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['extractionConfidence', 'sourceReliability', 'supportStrength', 'legalSufficiency'],
                      properties: {
                        extractionConfidence: { type: 'string', enum: ['unknown', 'low', 'medium', 'high'] },
                        sourceReliability: { type: 'string', enum: ['unknown', 'low', 'medium', 'high'] },
                        supportStrength: { type: 'string', enum: ['unknown', 'weak', 'moderate', 'strong'] },
                        legalSufficiency: { type: 'string', enum: ['not_applicable', 'unknown', 'insufficient', 'contested', 'potentially_sufficient'] },
                      },
                    },
                    createdBy: { type: 'string', enum: ['user', 'ai', 'rule', 'migration'] },
                  },
                },
              },
              relation_candidates: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'source', 'target', 'suggestedType', 'suggestedRole', 'reason', 'basis', 'sourceRefs', 'confidence', 'status', 'createdBy', 'createdAt', 'reviewedAt'],
                  properties: {
                    id: { type: 'string' },
                    source: { type: 'string' },
                    target: { type: 'string' },
                    suggestedType: { type: 'string' },
                    suggestedRole: { type: 'string' },
                    reason: { type: 'string' },
                    basis: { type: 'string' },
                    sourceRefs: { type: 'array', items: { type: 'object' } },
                    confidence: { type: 'string', enum: ['unknown', 'low', 'medium', 'high'] },
                    status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
                    createdBy: { type: 'string', enum: ['user', 'ai', 'rule', 'migration'] },
                    createdAt: { type: 'string' },
                    reviewedAt: { type: 'string' },
                  },
                },
              },
              clusters: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['label', 'focus', 'nodeLabels', 'note'],
                  properties: {
                    label: { type: 'string' },
                    focus: { type: 'string' },
                    nodeLabels: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    note: { type: 'string' },
                  },
                },
              },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    };
  }

  if (mode === 'graph_command') {
    return {
      type: 'json_schema',
      name: 'roosycozy_graph_command_response',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['assistant_message', 'analysis_type', 'findings', 'citations', 'limitations'],
        properties: {
          assistant_message: { type: 'string' },
          analysis_type: { type: 'string' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'summary', 'status', 'node_ids', 'edge_ids', 'source_refs', 'limitations'],
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                status: { type: 'string' },
                node_ids: { type: 'array', items: { type: 'string' } },
                edge_ids: { type: 'array', items: { type: 'string' } },
                source_refs: { type: 'array', items: { type: 'object' } },
                limitations: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          citations: { type: 'array', items: { type: 'object' } },
          limitations: { type: 'array', items: { type: 'string' } },
        },
      },
    };
  }

  return {
    type: 'json_schema',
    name: 'roosycozy_chat_response',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'assistant_message', 'status', 'report_markdown'],
      properties: {
        title: { type: 'string' },
        assistant_message: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'ready'] },
        report_markdown: { type: 'string' },
      },
    },
  };
}

function outputTokenLimitForMode(mode: string) {
  if (mode === 'graph_extract') return 4200;
  if (mode === 'graph_command') return 2200;
  return 3200;
}

function timeoutForMode(mode: string) {
  if (mode === 'graph_extract') return 70000;
  if (mode === 'graph_command') return 50000;
  return 60000;
}

function responseBodyForMode(body: any, mode: string, model: string, useStructuredFormat = true) {
  const payload: Record<string, unknown> = {
    model,
    instructions: systemPrompt(mode, body.product),
    input: buildInput(body, mode),
    max_output_tokens: outputTokenLimitForMode(mode),
  };

  if (useStructuredFormat) {
    payload.text = {
      format: responseFormatForMode(mode),
    };
  }

  return payload;
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;

  const chunks: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.value === 'string') chunks.push(content.value);
    }
  }

  return chunks.join('\n').trim();
}

function shouldRetryWithoutStructuredFormat(error: unknown) {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();
  return /json_schema|text\.format|response_format|structured|schema|unsupported parameter|unknown parameter|invalid value/i.test(message);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function systemPrompt(mode: string, product: string) {
  if (mode === 'graph_extract') {
    return `
너는 RoosyCozy의 사건 중심 지식그래프 변환 에이전트다.
사용자의 줄글 사안을 인물, 주요사건, 주장, 근거(증거), 기반명제 다섯 블록으로만 분해한다.
법률 판단, 유무죄, 책임 인정, 징계 판단은 단정하지 않는다.
사용자가 말하지 않은 고의, 공모, 인식, 인과관계, 신빙성, 법적 충족을 만들어내지 않는다.
사용자에게 보이는 label, summary, warning, assistant_message에는 내부 ID나 영문 스키마명을 노출하지 않는다.

반드시 JSON만 반환한다.

노드 생성 규칙:
- 허용 kind는 person, event, claim, evidence, premise뿐이다.
- event는 주요사건이다. 시간순으로 1~5개만 추출한다.
- person은 인물 또는 기관 관계자다. 게시글, 댓글, 캡처, 메모, 계좌내역, 문서, 자료는 person이 아니라 evidence다.
- claim은 당사자 주장 또는 쟁점이 되는 진술이다.
- evidence는 주장과 연결되는 근거 자료다.
- premise는 주장을 이해하기 위한 전제 사실 또는 기반명제다.
- 새 노드는 clientId를 반드시 갖는다. 링크 source/target은 clientId 또는 기존 id를 사용한다.
- 알 수 없는 시각, 장소, 역할은 추측하지 말고 빈 문자열 또는 "확인 필요"로 둔다.

관계선 생성 규칙:
- 모든 링크는 단방향이다.
- 주요 흐름은 event -> person, event -> claim, evidence -> claim, premise -> claim, event -> event(PRECEDES)다.
- 모든 claim은 최소 하나의 event와 연결되어야 한다.
- 모든 evidence와 premise는 최소 하나의 claim과 연결되어야 한다.
- 모든 person은 최소 하나의 event 또는 claim과 연결되어야 한다.
- 같은 문장에 등장했다는 이유만으로 법적 결론이나 책임을 만들지 말고, "어떤 사건/주장/근거에 붙는가"만 표현한다.
- accepted link에는 type, directed=true, verificationStatus, assessment, sourceRefs를 넣는다.
- sourceRefs.quote는 실제 입력에 존재하는 정확한 발췌문이어야 한다.
- 직접 발췌가 애매하면 verificationStatus를 unverified로 낮추되, 그래프 이해에 필요한 기본 연결은 만든다.
- relation_candidates는 확정하기 어려운 보조 관계에만 사용한다.
`.trim();
  }

  if (mode === 'graph_command') {
    return `
너는 RoosyCozy의 증거-논증 그래프 명령 설명 에이전트다.
프론트엔드가 먼저 실행한 로컬 결정론 분석 결과를 설명하는 역할만 한다.
엔진 결과에 없는 경로, 증거, 법적 충족 사실을 새로 만들지 않는다.
보고서 전체를 다시 쓰지 않는다.
법률 판단, 수사 결론, 유무죄, 책임 인정은 단정하지 않는다.
답변은 짧고 정곡을 찔러야 한다.
내부 ID, 영문 스키마명, relationCandidates 같은 구현 용어를 사용자 문장에 노출하지 않는다.
그래프의 인물, 주요사건, 주장, 근거, 기반명제 연결을 보고 "무엇이 약한지"와 "무엇을 바로 보강할지"만 말한다.
assistant_message는 최대 5문장으로 쓴다.
findings는 최대 3개만 반환한다.
각 finding의 title은 20자 안팎의 한국어 제목으로 쓴다.
summary는 한 문장으로 쓴다.
반드시 JSON만 반환한다.
형식: {
  "assistant_message": "핵심 취약점과 바로 할 일",
  "analysis_type": "vulnerability_analysis | legal_gap | provenance_trace | evidence_removal | single_source_dependency | contradiction_check | hypothesis_comparison | evidence_plan | freeform",
  "findings": [
    {
      "title": "짧은 제목",
      "summary": "엔진 결과 기반 요약",
      "status": "검토 상태",
      "node_ids": ["관련 노드 id"],
      "edge_ids": ["관련 edge id"],
      "source_refs": [],
      "limitations": ["한계"]
    }
  ],
  "citations": [],
  "limitations": []
}
`.trim();
  }

  return `
너는 RoosyCozy의 사안 분석 보조 에이전트다.
사용자 자료를 사실, 주장, 추정, 확인 필요로 나누어 정리한다.
법률 판단이나 수사·행정 결론은 단정하지 않는다.
반드시 JSON만 반환한다.
형식: {
  "title": "짧은 제목",
  "assistant_message": "답변",
  "status": "draft 또는 ready",
  "report_markdown": "# 정밀 사안 분석 보고서\\n..."
}
`.trim();
}

function buildInput(body: any, mode: string) {
  const message = compactText(body.message, 16000);
  const structuredInput = compactText(JSON.stringify(body.structuredInput ?? {}, null, 2), 18000);
  const clientGuidance = compactText(body.clientGuidance, 8000);

  return [
    `[mode]\n${mode}`,
    `[product]\n${body.product === 'teachers' ? 'teachers' : 'pro'}`,
    `[user_message]\n${message}`,
    `[structured_input]\n${structuredInput}`,
    `[client_guidance]\n${clientGuidance}`,
  ].join('\n\n');
}

async function requestOpenAIResponses(payload: Record<string, unknown>, timeoutMs: number) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, timeoutMs);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 900)}`);
  }

  return response;
}

async function callOpenAIWithModel(body: any, mode: string, model: string) {
  const timeoutMs = timeoutForMode(mode);
  let response: Response;

  try {
    response = await requestOpenAIResponses(responseBodyForMode(body, mode, model, true), timeoutMs);
  } catch (error) {
    if (!shouldRetryWithoutStructuredFormat(error)) throw error;
    response = await requestOpenAIResponses(responseBodyForMode(body, mode, model, false), timeoutMs);
  }

  const data = await response.json();
  const content = extractOutputText(data);
  const parsed = parseJsonObject(content);
  return parsed || fallbackAiObject(content, mode);
}

async function callOpenAI(body: any, mode: string) {
  let lastError = '';

  for (const model of modelSequence) {
    try {
      return await callOpenAIWithModel(body, mode, model);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'OpenAI request failed.';
      if (isFatalOpenAiError(lastError)) throw error;
    }
  }

  if (mode === 'graph_extract') {
    return {
      assistant_message: `AI 모델 응답이 지연되어 기본 그래프 패치를 생성했습니다. 원인: ${lastError}`,
      graph_patch: deterministicGraphPatch(body, 'AI 모델 응답 지연으로 기본 그래프 패치를 생성했습니다.'),
    };
  }

  throw new Error(lastError || 'OpenAI request failed.');
}

async function consumeUsage(serviceClient: ReturnType<typeof createClient>, userId: string, body: any, mode: string) {
  const inputKind = body.forceReport ? 'report' : 'message';
  const units = Math.max(1, Math.min(10, Math.round(Number(body.usageUnits ?? 1) || 1)));
  const { data, error } = await serviceClient.rpc('consume_report_usage_for_user', {
    target_user_id: userId,
    input_kind: inputKind,
    input_units: units,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function findOrCreateConversation(serviceClient: ReturnType<typeof createClient>, body: any, userId: string) {
  if (body.conversationId) {
    const { data, error } = await serviceClient
      .from('report_conversations')
      .select('*')
      .eq('id', String(body.conversationId))
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const title = compactText(body.message, 48) || '수사지식그래프';
  const { data, error } = await serviceClient
    .from('report_conversations')
    .insert({
      user_id: userId,
      product: body.product === 'teachers' ? 'teachers' : 'pro',
      title,
      status: 'draft',
      report_markdown: '',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function insertMessage(serviceClient: ReturnType<typeof createClient>, conversation: any, userId: string, role: string, content: string, metadata: Record<string, unknown>) {
  const { error } = await serviceClient.from('report_messages').insert({
    conversation_id: conversation.id,
    user_id: userId,
    role,
    content,
    metadata,
  });
  if (error) throw new Error(error.message);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const publishableKey = getPublishableKey();
    const secretKey = getSecretKey();
    if (!supabaseUrl || !publishableKey || !secretKey) {
      return jsonResponse({ error: 'Service environment is not configured.' }, 500);
    }
    if (!openAiApiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || '').trim() || (body.clientPolicy?.mode === 'graph_command' ? 'graph_command' : 'chat');
    const authorization = req.headers.get('Authorization') ?? '';
    const authClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const serviceClient = createClient(supabaseUrl, secretKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Authentication required.' }, 401);

    const usage = await consumeUsage(serviceClient, user.id, body, mode);
    const conversation = await findOrCreateConversation(serviceClient, body, user.id);
    const userMessage = compactText(body.message, 16000);

    if (userMessage) {
      await insertMessage(serviceClient, conversation, user.id, 'user', userMessage, {
        mode,
        structured_input_kind: body.structuredInput?.kind ?? null,
      });
    }

    const ai = await callOpenAI(body, mode);

    if (mode === 'graph_extract') {
      const graphPatch = graphPatchFromAi(ai, body);
      const assistantMessage = compactText(ai.assistant_message || ai.assistantMessage || graphPatch?.summary || '그래프 패치를 생성했습니다.', 2000);
      await insertMessage(serviceClient, conversation, user.id, 'assistant', assistantMessage, {
        kind: 'graph_extraction_result',
        graph_patch: graphPatch,
      });
      return jsonResponse({
        conversation,
        assistantMessage,
        graphPatch,
        graph_patch: graphPatch,
        usage,
        meta: {
          mode,
          graphPatch,
        },
      });
    }

    if (mode === 'graph_command') {
      const assistantMessage = compactText(ai.assistant_message || ai.output || ai.answer || '', 5000);
      await insertMessage(serviceClient, conversation, user.id, 'assistant', assistantMessage, {
        kind: 'graph_command_result',
        command: body.command ?? body.message ?? '',
        analysis_type: ai.analysis_type || 'freeform',
        findings: ai.findings || [],
        citations: ai.citations || [],
        limitations: ai.limitations || [],
      });
      return jsonResponse({
        conversation,
        assistantMessage,
        output: assistantMessage,
        result: {
          assistant_message: assistantMessage,
          analysis_type: ai.analysis_type || 'freeform',
          findings: Array.isArray(ai.findings) ? ai.findings : [],
          citations: Array.isArray(ai.citations) ? ai.citations : [],
          limitations: Array.isArray(ai.limitations) ? ai.limitations : [],
        },
        usage,
        meta: {
          mode,
          analysis_type: ai.analysis_type || 'freeform',
          findings: Array.isArray(ai.findings) ? ai.findings : [],
          citations: Array.isArray(ai.citations) ? ai.citations : [],
          limitations: Array.isArray(ai.limitations) ? ai.limitations : [],
        },
      });
    }

    const reportMarkdown = compactText(ai.report_markdown || conversation.report_markdown || '', 36000);
    const { data: updatedConversation, error: updateError } = await serviceClient
      .from('report_conversations')
      .update({
        title: compactText(ai.title || conversation.title || '사안 분석', 80),
        status: ai.status === 'ready' ? 'ready' : 'draft',
        report_markdown: reportMarkdown,
      })
      .eq('id', conversation.id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);

    const assistantMessage = compactText(ai.assistant_message || '정리했습니다.', 5000);
    await insertMessage(serviceClient, updatedConversation, user.id, 'assistant', assistantMessage, {
      kind: 'chat_result',
      report_changed: Boolean(reportMarkdown),
    });

    return jsonResponse({
      conversation: updatedConversation,
      assistantMessage,
      usage,
      meta: {
        mode,
        reportChanged: Boolean(reportMarkdown),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
