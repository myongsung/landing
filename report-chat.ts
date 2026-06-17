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
        clusters: [],
      },
    };
  }

  if (mode === 'graph_command') {
    return { assistant_message: assistantMessage };
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

function deterministicGraphPatch(body: any, summary = '') {
  const text = compactText(body?.message || body?.structuredInput?.sourceText || '', 16000);
  const dateTime = inferEventDateTime(text);
  const eventLabels = inferEventLabels(text);
  const personLabels = inferPersonLabels(text);
  const evidenceLabels = inferEvidenceLabels(text);
  const centralEvent = eventLabels[0] || '상황 기록';

  const nodes = [
    ...eventLabels.map((label) => ({
      kind: 'event',
      label,
      role: '상황 사건',
      layer: 'core',
      note: text.slice(0, 1200),
      eventDate: dateTime.eventDate,
      eventTime: dateTime.eventTime,
    })),
    ...personLabels.map((label) => ({
      kind: 'person',
      label,
      role: '관련 인물',
      layer: 'uncertain',
      note: text.slice(0, 900),
      eventDate: '',
      eventTime: '',
    })),
    ...evidenceLabels.map((label) => ({
      kind: 'evidence',
      label,
      role: '증거 자료',
      layer: 'support',
      note: text.slice(0, 900),
      eventDate: dateTime.eventDate,
      eventTime: '',
    })),
  ];

  const links = [
    ...eventLabels.flatMap((eventLabel) => personLabels.map((personLabel) => ({
      source: personLabel,
      target: eventLabel,
      sourceKind: 'person',
      targetKind: 'event',
      label: '사건 관련',
      basis: '같은 상황 기록에서 인물과 사건이 함께 언급됨. 세부 행위와 관계 강도는 확인 필요.',
      strength: 'weak',
    }))),
    ...eventLabels.flatMap((eventLabel) => evidenceLabels.map((evidenceLabel) => ({
      source: evidenceLabel,
      target: eventLabel,
      sourceKind: 'evidence',
      targetKind: 'event',
      label: '증거 연결',
      basis: '같은 상황 기록에서 증거 자료와 사건이 함께 언급됨. 원본성, 작성 시점, 보관 경로는 확인 필요.',
      strength: 'likely',
    }))),
    ...evidenceLabels.flatMap((evidenceLabel) => personLabels.map((personLabel) => ({
      source: evidenceLabel,
      target: personLabel,
      sourceKind: 'evidence',
      targetKind: 'person',
      label: '증거 관련',
      basis: '같은 상황 기록에서 증거 자료와 인물이 함께 언급됨. 해당 증거가 어떤 행위 또는 진술을 뒷받침하는지는 확인 필요.',
      strength: 'weak',
    }))),
    ...eventLabels.slice(1).map((eventLabel) => ({
      source: centralEvent,
      target: eventLabel,
      sourceKind: 'event',
      targetKind: 'event',
      label: '시간·맥락',
      basis: '같은 상황 기록에서 복수 사건으로 추출됨. 선후관계와 시간 간격은 확인 필요.',
      strength: 'weak',
    })),
  ];

  const nodeLabels = nodes.map((node) => node.label);
  const clusters = nodeLabels.length >= 2
    ? [{
        label: `${centralEvent} 묶음`,
        focus: '상황 기록 기반 자동 묶음',
        nodeLabels,
        note: 'AI 응답이 비었거나 구조화되지 않은 경우에도 그래프 생성을 보장하기 위한 기본 묶음입니다.',
      }]
    : [];

  return {
    summary: summary || '상황 기록을 기반으로 기본 수사지식그래프 패치를 생성했습니다.',
    nodes,
    links,
    clusters,
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
            required: ['summary', 'nodes', 'links', 'clusters'],
            properties: {
              summary: { type: 'string' },
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['kind', 'label', 'role', 'layer', 'note', 'eventDate', 'eventTime'],
                  properties: {
                    kind: { type: 'string', enum: ['person', 'event', 'evidence'] },
                    label: { type: 'string' },
                    role: { type: 'string' },
                    layer: { type: 'string', enum: ['core', 'support', 'uncertain'] },
                    note: { type: 'string' },
                    eventDate: { type: 'string' },
                    eventTime: { type: 'string' },
                  },
                },
              },
              links: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['source', 'target', 'sourceKind', 'targetKind', 'label', 'basis', 'strength'],
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    sourceKind: { type: 'string', enum: ['person', 'event', 'evidence'] },
                    targetKind: { type: 'string', enum: ['person', 'event', 'evidence'] },
                    label: { type: 'string' },
                    basis: { type: 'string' },
                    strength: { type: 'string', enum: ['confirmed', 'likely', 'weak'] },
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
        required: ['assistant_message'],
        properties: {
          assistant_message: { type: 'string' },
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
너는 RoosyCozy의 수사지식그래프 변환 에이전트다.
사용자의 줄글 사안을 인물 노드, 사건 노드, 증거 노드, 관계선, 클러스터 후보로 변환한다.
법률 판단, 유무죄, 책임 인정, 징계 판단은 단정하지 않는다.
사용자가 말하지 않은 사실은 만들지 말고, 추론은 note 또는 basis에 "확인 필요"로 표시한다.

반드시 JSON만 반환한다.
형식:
{
  "assistant_message": "짧은 처리 요약",
  "graph_patch": {
    "summary": "그래프 변환 요약",
    "nodes": [
      {
        "kind": "person | event | evidence",
        "label": "짧은 노드명",
        "role": "역할 또는 유형",
        "layer": "core | support | uncertain",
        "note": "확인된 내용, 주장, 추정, 확인 필요를 구분한 메모",
        "eventDate": "YYYY-MM-DD 또는 빈 문자열",
        "eventTime": "HH:MM 또는 빈 문자열"
      }
    ],
    "links": [
      {
        "source": "노드명",
        "target": "노드명",
        "sourceKind": "person | event | evidence",
        "targetKind": "person | event | evidence",
        "label": "관계명",
        "basis": "관계 근거와 한계",
        "strength": "confirmed | likely | weak"
      }
    ],
    "clusters": [
      {
        "label": "묶음명",
        "focus": "분석 초점",
        "nodeLabels": ["포함 노드명"],
        "note": "왜 같은 묶음인지"
      }
    ]
  }
}

노드 생성 규칙:
- 사람, 학생, 교사, 학부모, 관리자, 기관은 person.
- 날짜·시간이 있거나 장면·회의·통화·제출·조사·충돌은 event.
- CCTV, 진술서, 메모, 통화기록, 카카오톡 캡처, PDF, 사진, 영상, 녹취 등은 evidence.
- 같은 문장 또는 같은 장면에서 함께 언급된 노드는 관계선으로 연결한다.
- 사건 노드는 날짜와 시간이 명시되면 반드시 eventDate/eventTime에 넣는다.

관계선 생성 규칙:
- evidence 노드는 단독으로 두지 말고 가능한 한 event 또는 person 중 최소 1개 이상과 연결한다.
- person이 어떤 event에 관여하거나 등장하면 person -> event 관계를 만든다.
- evidence가 특정 event를 뒷받침하면 evidence -> event 관계를 만든다.
- evidence가 특정 person의 발언, 행위, 위치, 제출물, 통화, 메시지를 뒷받침하면 evidence -> person 관계를 만든다.
- 관계가 확정되지 않았으면 strength는 weak로 두고 basis에 "확인 필요"를 적는다.
- 하나의 장면에 person, event, evidence가 같이 나오면 person-event, evidence-event, evidence-person의 삼각 연결을 우선 생성한다.
`.trim();
  }

  if (mode === 'graph_command') {
    return `
너는 RoosyCozy의 수사지식그래프 명령 실행 에이전트다.
오른쪽 그래프의 노드, 관계선, 클러스터, 시간축을 바탕으로 사용자의 명령에만 답한다.
보고서 전체를 다시 쓰지 않는다.
법률 판단, 수사 결론, 유무죄, 책임 인정은 단정하지 않는다.
반드시 JSON만 반환한다.
형식: { "assistant_message": "명령 실행 결과" }
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
      });
      return jsonResponse({
        conversation,
        assistantMessage,
        output: assistantMessage,
        usage,
        meta: { mode },
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
