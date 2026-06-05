// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const openAiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const reportModel = Deno.env.get('OPENAI_REPORT_MODEL') ?? 'gpt-4o-mini';

const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_CHARS = 1500;
const MAX_CURRENT_REPORT_CHARS = 14000;
const MAX_CLIENT_GUIDANCE_CHARS = 7000;
const MAX_REPORT_CHARS = 24000;

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
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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

function safeString(value: unknown, maxLength = 4000) {
  return String(value ?? '').slice(0, maxLength);
}

function safeJson(value: unknown, maxLength = 4000) {
  try {
    return JSON.stringify(value ?? {}, null, 2).slice(0, maxLength);
  } catch {
    return '{}';
  }
}

function compactText(value: unknown) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function inferIntent(message: string, forceReport: boolean) {
  if (forceReport) return 'report_command';

  const text = String(message || '').trim();
  const hasQuestion =
    /[?？]|뭐|무엇|어떻게|어떤|왜|가능|필요|더|강력|증거|대응|해야|할까|하나요|있나요|알려|추천|방법|조언|도움|대처|제출|신고|민원|고소|내용증명/.test(
      text,
    );
  const asksForReport = /보고서|정리|작성|갱신|업데이트|반영|문서화|초안|최종본|제출용|진술서/.test(text);
  const containsFacts =
    /했다|했어|합니다|왔|말했|보냈|때렸|욕|협박|방관|참여|가해|피해|목격|증거|녹취|문자|카톡|메일|날짜|장소|이름|관계|수정|미수금|민원|학부모|교장|교감|관리자|클라이언트|계약|합의/.test(
      text,
    );

  if (asksForReport) return 'report_command';
  if (hasQuestion && containsFacts) return 'mixed_question_with_facts';
  if (hasQuestion) return 'direct_question';
  return 'fact_update';
}

function normalizeIntent(value: unknown, message: string, forceReport: boolean) {
  const intent = String(value ?? '').trim();
  const allowed = new Set([
    'report_command',
    'mixed_question_with_facts',
    'direct_question',
    'fact_update',
    'smalltalk',
  ]);

  return allowed.has(intent) ? intent : inferIntent(message, forceReport);
}

function shouldUpdateReport(intent: string, forceReport: boolean, clientPolicy: unknown) {
  if (forceReport) return true;

  if (clientPolicy && typeof clientPolicy === 'object') {
    const value = clientPolicy.shouldUpdateReport;
    if (typeof value === 'boolean') return value;
  }

  return ['report_command', 'fact_update', 'mixed_question_with_facts'].includes(intent);
}

function defaultTitle(product: string) {
  return product === 'teachers' ? '교원 민원 사건' : '외주 분쟁 사건';
}

function normalizeReportMarkdown(report: string, fallback = '') {
  const next = compactText(report);

  if (!next) return compactText(fallback);
  if (next.startsWith('#')) return next.slice(0, MAX_REPORT_CHARS);
  return `# 사건보고서\n\n${next}`.slice(0, MAX_REPORT_CHARS);
}

function systemPrompt(product: string) {
  const productContext =
    product === 'teachers'
      ? [
          '대상은 초등교원이다.',
          '핵심 상황은 악성민원, 학부모 상담, 학생 관련 갈등, 학교 관리자 대응, 교육청/학교 제출용 경위 정리다.',
          '교사 개인의 감정 호소가 아니라 사실, 순서, 증거, 학교 대응 필요사항을 정리한다.',
        ].join(' ')
      : [
          '대상은 외주, 프리랜서, 특고 분쟁이다.',
          '핵심 상황은 수정요청, 미수금, 범위변경, 구두합의, 정산 지연, 계약 불명확성, 플랫폼 일방 변경이다.',
          '감정적 주장보다 계약 범위, 요청 변화, 지급 약속, 결과물 인도, 증거를 정리한다.',
        ].join(' ');

  return `
너는 RoosyCozy의 AI 사건보고서 에이전트다.
${productContext}

정체성:
- 너는 사용자의 말을 단순 요약하는 기록원이 아니다.
- 너는 흩어진 진술을 시간, 장소, 인물, 행위, 증거, 불확실성으로 재구성하는 사건 정교화 에이전트다.
- 사용자가 짧고 거칠게 말해도, 보고서에는 제출자가 나중에 바로 검토할 수 있도록 구체적인 문장과 구조로 정리한다.
- 다만 사용자가 말하지 않은 사실을 지어내지 않는다. 필요한 추론은 "추정", "확인 필요", "가능성"으로 표시한다.
- 법률 자문처럼 승소 가능성이나 위법성을 단정하지 않는다. 사실관계 정리, 대응 준비, 증거 정리 보조자로 답한다.

대화 원칙:
1. 사용자가 질문하면 assistant_message의 첫 문단에서 반드시 직접 답한다.
2. 질문에 답하지 않고 보고서만 수정하지 않는다.
3. "무엇이 더 필요해?", "더 강력한 게 뭐야?", "어떻게 대응해?" 같은 질문에는 실행 가능한 체크리스트와 우선순위를 제시한다.
4. 사용자가 새 사실을 말했거나 보고서 갱신을 요청한 경우에만 보고서를 갱신한다.
5. 보고서 갱신이 허용되지 않은 경우 report_markdown은 기존 보고서를 그대로 유지한다.
6. "그렇군요" 같은 막힌 답변으로 끝내지 말고, 다음에 확인할 질문 하나를 제시한다.
7. 한 번에 질문은 하나만 한다. 단, assistant_message 안의 체크리스트는 가능하다.
8. 사용자가 감정적으로 말하면 감정은 받아주되, 곧바로 사실 확인 질문으로 연결한다.
9. 사용자가 "정리해줘", "보고서로 만들어줘"라고 하면 최신 보고서 전체를 체계적으로 갱신한다.
10. 사용자의 질문이 조언인지 사실 추가인지 헷갈리면, 먼저 직접 답하고 "방금 내용 중 사실로 반영할 부분"을 구분한다.

사건 정교화 방식:
- 모든 진술을 다음 6개 층으로 분리한다.
  1) 확정 사실: 사용자가 명확히 말한 내용
  2) 주장: 사용자 또는 상대방이 주장한 내용
  3) 추정: 맥락상 가능하지만 확인이 필요한 내용
  4) 증거: 캡처, 문자, 메일, 녹취, 출입기록, 목격자, 파일, 계약서
  5) 공백: 시간, 장소, 발언 원문, 순서, 당사자 역할 등 부족한 부분
  6) 다음 행동: 확보, 정리, 문의, 제출 전 확인
- 인물은 반드시 역할로 분류한다.
  피해자, 주가해자, 참여자, 방관자, 목격자, 관리자/책임자, 역할 불명 중 하나 이상으로 분리한다.
- 각 인물별로 다음을 구분한다.
  관계, 구체 행위, 행위 시점, 근거 증거, 불확실한 점, 다음 확인 질문.
- "관계"만 쓰지 말고 "누가 무엇을 했고, 그 행동이 사건에서 어떤 의미인지"를 쓴다.
- 장면 묘사는 다음 항목을 최대한 채운다.
  시간, 장소, 참여자 위치, 실제 발언, 행동 순서, 주변 목격자, 직후 반응, 남은 기록.
- 증거는 "증거명"만 나열하지 말고 "무엇을 입증하는지"와 "부족한 보완자료"를 붙인다.

보고서 문체:
- 전문적이되 과장하지 않는다.
- 문장은 짧고 명확하게 쓴다.
- "피해를 입었다"만 쓰지 말고, 어떤 행위가 어떤 결과를 낳았는지 쓴다.
- 불명확한 내용은 삭제하지 말고 "확인 필요"로 남긴다.
- 사용자가 말한 표현이 거칠어도 보고서 문장은 제출 가능한 표현으로 정제한다.

보고서 필수 구조:
# 사건보고서

## 1. 사건 핵심 요약
- 한 문단으로 사건의 핵심을 정리한다.
- 누가, 누구에게, 어떤 상황에서, 어떤 행위가 문제인지 드러나야 한다.

## 2. 당사자 및 역할 분류
| 구분 | 인물/주체 | 관계 | 현재 파악된 행위 | 근거 | 확인 필요 |

## 3. 시간순 경위
| 순서 | 시점 | 장소/채널 | 관련자 | 발생 내용 | 남은 기록 |

## 4. 주요 장면별 상세 묘사
- 장면마다 실제 발언, 행동 순서, 반응, 목격자, 기록 여부를 쓴다.

## 5. 인물별 행위와 책임 구조
- 주가해자/참여자/방관자/관리자/목격자를 분리한다.
- 각 인물의 역할이 불명확하면 그렇게 표시한다.

## 6. 증거 목록 및 입증 취지
| 증거 | 보유 여부 | 입증하려는 사실 | 보완 필요 |

## 7. 미확인 정보와 추가 질문
- 보고서 완성도를 높이기 위해 필요한 질문을 우선순위로 정리한다.

## 8. 다음 대응 체크리스트
- 지금 바로 할 일, 추가 확보할 자료, 제출 전 확인할 내용을 구분한다.

## 9. 제출 전 검토 메모
- 단정 표현, 개인정보, 확인 안 된 추정, 날짜 오류를 점검하도록 쓴다.

출력 규칙:
- 반드시 JSON 객체만 반환한다.
- assistant_message는 사용자에게 보이는 자연스러운 답변이다.
- report_markdown은 완성도 높은 최신 보고서다.
- next_question은 다음에 물을 질문 하나다.
- report_changed는 실제로 보고서를 바꿨을 때만 true다.
`.trim();
}

function buildModelInput(params: {
  product: string;
  history: Array<{ role: string; content: string; created_at?: string }>;
  currentReport: string;
  intent: string;
  updateReport: boolean;
  clientGuidance: string;
  clientPolicy: unknown;
  latestMessage: string;
}) {
  const history = params.history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message, index) => {
      const role = message.role === 'assistant' ? 'AI' : '사용자';
      const when = message.created_at ? ` (${message.created_at})` : '';
      return `[${index + 1}] ${role}${when}: ${safeString(message.content, MAX_HISTORY_CHARS)}`;
    })
    .join('\n\n');

  return `
[현재 상품]
${params.product === 'teachers' ? 'RoosyCozy Teacher / 교원 민원 보고서' : 'RoosyCozy PRO / 외주·프리랜서 분쟁 보고서'}

[현재 사용자 요청]
${params.latestMessage || '(명시 메시지 없음: 보고서 갱신 요청)'}

[서버가 판단한 요청 의도]
${params.intent}

[보고서 갱신 허용 여부]
${params.updateReport ? '허용됨. 새 사실과 기존 보고서를 통합해 최신 보고서를 작성한다.' : '허용 안 됨. 질문에 직접 답하고 report_markdown은 기존 보고서와 동일하게 유지한다.'}

[프론트 정책]
${safeJson(params.clientPolicy, 3000)}

[프론트 추가 지침]
${safeString(params.clientGuidance || '없음', MAX_CLIENT_GUIDANCE_CHARS)}

[현재 보고서]
${safeString(params.currentReport || '아직 작성된 보고서 없음', MAX_CURRENT_REPORT_CHARS)}

[최근 대화 기록]
${history || '대화 없음'}

[이번 응답에서 반드시 할 일]
1. assistant_message 첫머리에서 사용자 요청에 직접 답한다.
2. 새 사실이 있다면 기존 보고서와 합쳐 정교화한다.
3. 인물의 역할, 행위, 증거, 확인 필요 사항을 구분한다.
4. 부족한 정보는 "미확인 정보"로 남긴다.
5. 다음 확인 질문은 가장 중요한 것 하나만 제시한다.
6. 보고서를 갱신하지 않는 상황이면 기존 report_markdown을 그대로 반환한다.
`.trim();
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'assistant_message',
    'status',
    'report_markdown',
    'report_changed',
    'next_question',
    'missing_detail_questions',
    'evidence_gaps',
    'role_clarity_notes',
  ],
  properties: {
    title: { type: 'string' },
    assistant_message: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'ready'] },
    report_markdown: { type: 'string' },
    report_changed: { type: 'boolean' },
    next_question: { type: 'string' },
    missing_detail_questions: {
      type: 'array',
      items: { type: 'string' },
    },
    evidence_gaps: {
      type: 'array',
      items: { type: 'string' },
    },
    role_clarity_notes: { type: 'string' },
  },
};

function extractOutputText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;

  const chunks = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.value === 'string') chunks.push(content.value);
    }
  }

  return chunks.join('\n').trim();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 50000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestOpenAI(body: unknown) {
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) return response;

      const text = await response.text();
      lastError = `OpenAI request failed (${response.status}): ${text.slice(0, 700)}`;

      if (![408, 409, 429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(lastError);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'OpenAI request failed.';
      if (attempt === 1) throw new Error(lastError);
    }

    await delay(700);
  }

  throw new Error(lastError || 'OpenAI request failed.');
}

function toStringArray(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, maxItems);
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeUsageSnapshot(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;

  if (!row || typeof row !== 'object') {
    return row;
  }

  const usedMessages = numberOrNull(row.used_messages) ?? 0;
  const usedReports = numberOrNull(row.used_reports) ?? 0;
  const hasSeparateUsage = row.used_messages !== undefined || row.used_reports !== undefined;
  const rawLimit =
    numberOrNull(row.limit_points) ??
    numberOrNull(row.limit_messages) ??
    numberOrNull(row.limit_reports) ??
    numberOrNull(row.limit) ??
    numberOrNull(row.monthly_limit) ??
    numberOrNull(row.monthly_messages);
  const rawRemaining =
    numberOrNull(row.remaining_points) ??
    numberOrNull(row.remaining_messages) ??
    numberOrNull(row.remaining);
  const used =
    numberOrNull(row.used_points) ??
    numberOrNull(row.used) ??
    (hasSeparateUsage ? usedMessages + usedReports : null) ??
    (rawLimit !== null && rawRemaining !== null ? Math.max(0, rawLimit - rawRemaining) : null) ??
    0;
  const limit = rawLimit ?? Math.max(used, 0);

  return {
    ...row,
    tier: row.tier ?? row.membership_tier,
    used,
    limit,
    used_points: used,
    limit_points: limit,
    remaining: Math.max(0, limit - used),
  };
}

async function callOpenAI(params: {
  product: string;
  history: Array<{ role: string; content: string; created_at?: string }>;
  currentReport: string;
  intent: string;
  updateReport: boolean;
  clientGuidance: string;
  clientPolicy: unknown;
  latestMessage: string;
}) {
  const body = {
    model: reportModel,
    instructions: systemPrompt(params.product),
    input: buildModelInput(params),
    max_output_tokens: params.updateReport ? 3600 : 1500,
    text: {
      format: {
        type: 'json_schema',
        name: 'roosycozy_report_response',
        strict: true,
        schema: responseSchema,
      },
    },
  };

  const response = await requestOpenAI(body);
  const data = await response.json();
  const parsed = parseJsonObject(extractOutputText(data));

  if (!parsed) {
    throw new Error('AI response was not valid structured JSON.');
  }

  return {
    title: safeString(parsed.title || defaultTitle(params.product), 80),
    assistant_message: safeString(parsed.assistant_message || '다음 상황을 조금 더 구체적으로 알려주세요.', 3600),
    status: parsed.status === 'ready' ? 'ready' : 'draft',
    report_markdown: normalizeReportMarkdown(parsed.report_markdown || params.currentReport || ''),
    report_changed: Boolean(parsed.report_changed),
    next_question: safeString(parsed.next_question || '', 1000),
    missing_detail_questions: toStringArray(parsed.missing_detail_questions),
    evidence_gaps: toStringArray(parsed.evidence_gaps),
    role_clarity_notes: safeString(parsed.role_clarity_notes || '', 1600),
  };
}

async function consumeReportUsage(serviceClient: ReturnType<typeof createClient>, userId: string, updateReport: boolean) {
  const { data, error } = await serviceClient.rpc('consume_report_usage_for_user', {
    target_user_id: userId,
    input_kind: updateReport ? 'report' : 'message',
    input_units: 1,
  });

  if (error) throw new Error(error.message);
  return normalizeUsageSnapshot(data);
}

async function findConversation(serviceClient: ReturnType<typeof createClient>, conversationId: string, userId: string) {
  const { data, error } = await serviceClient
    .from('report_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function createConversation(serviceClient: ReturnType<typeof createClient>, userId: string, product: string) {
  const { data, error } = await serviceClient
    .from('report_conversations')
    .insert({
      user_id: userId,
      product,
      title: defaultTitle(product),
      report_markdown: '',
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function insertMessage(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await serviceClient.from('report_messages').insert({
    conversation_id: params.conversationId,
    user_id: params.userId,
    role: params.role,
    content: params.content,
    metadata: params.metadata ?? {},
  });

  if (error) throw new Error(error.message);
}

async function loadHistory(serviceClient: ReturnType<typeof createClient>, conversationId: string, userId: string) {
  const { data, error } = await serviceClient
    .from('report_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function updateConversation(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    conversationId: string;
    userId: string;
    title: string;
    status: string;
    reportMarkdown: string;
  },
) {
  const { data, error } = await serviceClient
    .from('report_conversations')
    .update({
      title: params.title,
      status: params.status,
      report_markdown: params.reportMarkdown,
    })
    .eq('id', params.conversationId)
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabasePublishableKey = getPublishableKey();
    const supabaseSecretKey = getSecretKey();

    if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
      return jsonResponse({ error: 'Service environment is not configured.' }, 500);
    }

    if (!openAiApiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const product = body.product === 'teachers' ? 'teachers' : 'pro';
    const message = compactText(body.message ?? '');
    const explicitForceReport = Boolean(body.forceReport);
    const clientPolicy = body.clientPolicy ?? {};
    const clientIntent = normalizeIntent(body.clientIntent, message, explicitForceReport);
    const updateReport = shouldUpdateReport(clientIntent, explicitForceReport, clientPolicy);
    const clientGuidance = safeString(body.clientGuidance ?? '', MAX_CLIENT_GUIDANCE_CHARS);
    const authorization = req.headers.get('Authorization') ?? '';

    if (!message && !explicitForceReport) {
      return jsonResponse({ error: 'Message is required.' }, 400);
    }

    const authClient = createClient(supabaseUrl, supabasePublishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseSecretKey);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const usage = await consumeReportUsage(serviceClient, user.id, updateReport);

    let conversation = null;
    if (body.conversationId) {
      conversation = await findConversation(serviceClient, String(body.conversationId), user.id);
    }

    if (!conversation) {
      conversation = await createConversation(serviceClient, user.id, product);
    }

    if (message) {
      await insertMessage(serviceClient, {
        conversationId: conversation.id,
        userId: user.id,
        role: 'user',
        content: message,
        metadata: {
          intent: clientIntent,
          update_report: updateReport,
          source: 'report-chat',
        },
      });
    }

    const history = await loadHistory(serviceClient, conversation.id, user.id);

    const ai = await callOpenAI({
      product: conversation.product ?? product,
      history,
      currentReport: conversation.report_markdown ?? '',
      intent: clientIntent,
      updateReport,
      clientGuidance,
      clientPolicy,
      latestMessage: message,
    });

    const previousReport = conversation.report_markdown ?? '';
    const nextReport = updateReport ? normalizeReportMarkdown(ai.report_markdown, previousReport) : previousReport;
    const nextTitle = updateReport ? ai.title : conversation.title;
    const nextStatus = updateReport ? ai.status : conversation.status ?? 'draft';
    const reportChanged = updateReport && nextReport.trim() !== previousReport.trim();

    await insertMessage(serviceClient, {
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      content: ai.assistant_message,
      metadata: {
        status: nextStatus,
        intent: clientIntent,
        update_report: updateReport,
        report_changed: reportChanged,
        next_question: ai.next_question,
        missing_detail_questions: ai.missing_detail_questions,
        evidence_gaps: ai.evidence_gaps,
        role_clarity_notes: ai.role_clarity_notes,
        model: reportModel,
      },
    });

    const updatedConversation = await updateConversation(serviceClient, {
      conversationId: conversation.id,
      userId: user.id,
      title: nextTitle,
      status: nextStatus,
      reportMarkdown: nextReport,
    });

    return jsonResponse({
      conversation: updatedConversation,
      assistantMessage: ai.assistant_message,
      usage,
      meta: {
        intent: clientIntent,
        updateReport,
        reportChanged,
        nextQuestion: ai.next_question,
        missingDetailQuestions: ai.missing_detail_questions,
        evidenceGaps: ai.evidence_gaps,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
