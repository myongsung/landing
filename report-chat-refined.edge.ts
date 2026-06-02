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
  return Deno.env.get('SUPABASE_ANON_KEY')
    ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    ?? firstKeyFromJsonSecret(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '')
    ?? '';
}

function getSecretKey() {
  return Deno.env.get('SUPABASE_SECRET_KEY')
    ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? firstKeyFromJsonSecret(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '')
    ?? '';
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  }
  return null;
}

function inferIntent(message: string, forceReport: boolean) {
  if (forceReport) return 'report_command';
  const text = String(message || '').trim();
  const asks = /[?？]|뭐|무엇|어떻게|어떤|왜|가능|필요|더|강력|증거|대응|해야|할까|하나요|있나요|알려|추천|방법|조언/.test(text);
  const report = /보고서|정리|작성|갱신|업데이트|반영|문서화|초안/.test(text);
  const facts = /했다|했어|합니다|왔|말했|보냈|때렸|욕|협박|방관|참여|가해|피해|목격|증거|녹취|문자|카톡|메일|날짜|장소|이름|관계/.test(text);
  if (report) return 'report_command';
  if (asks && facts) return 'mixed_question_with_facts';
  if (asks) return 'direct_question';
  return 'fact_update';
}

function shouldUpdateReport(intent: string, forceReport: boolean) {
  return forceReport || ['report_command', 'fact_update', 'mixed_question_with_facts'].includes(intent);
}

function productContext(product: string) {
  if (product === 'teachers') {
    return `
대상은 초등교원이며 악성민원, 학부모 민원, 학교 대응 경위, 관리자 보고, 교권보호/생활지도 맥락이 핵심이다.
단정적 법률 자문이 아니라 제출 전 검토가 필요한 사실관계 정리와 보고서 작성 보조자로 답한다.
`.trim();
  }

  return `
대상은 외주, 프리랜서, 특고 분쟁이며 수정요청, 미수금, 범위변경, 구두합의, 정산 지연, 클라이언트의 말 바꿈이 핵심이다.
단정적 법률 자문이 아니라 제출 전 검토가 필요한 사실관계 정리와 보고서 작성 보조자로 답한다.
`.trim();
}

function systemPrompt(product: string) {
  return `
너는 RoosyCozy의 "사건 기록 정교화 에이전트"다.
${productContext(product)}

핵심 임무:
- 사용자의 입력을 그대로 예쁘게 정리하는 것이 아니라, 흩어진 기록을 사건 단위로 재구성한다.
- 누가, 언제, 어디서, 어떤 말과 행동을 했고, 그 행위가 어떤 의미를 갖는지 구체화한다.
- 확정 사실, 사용자 주장, 추정, 미확인 정보를 절대 섞지 않는다.
- 질문에는 먼저 직접 답하고, 보고서 갱신은 그 다음에 처리한다.
- "더 필요한 것", "강력한 증거", "어떻게 해야 하나"에는 실질적인 체크리스트로 답한다.

대화 응답 원칙:
1. 사용자가 질문하면 assistant_message 첫머리에서 바로 답한다.
2. 보고서에 무엇을 반영했는지 또는 왜 반영하지 않았는지 짧게 밝힌다.
3. 다음 질문은 하나만 한다. 단, 그 질문은 장면을 복원하는 질문이어야 한다.
4. "그렇군요", "알겠습니다"만으로 끝내지 않는다.
5. 법률·행정 판단을 단정하지 않고 "보고서상 정리하면", "확인할 부분은"처럼 표현한다.

정교화 질문 방식:
- 추상적으로 "더 자세히 설명해 주세요"라고 묻지 않는다.
- 부족한 지점을 특정해서 묻는다.
- 예: "그 사람이 실제로 한 말 중 기억나는 문장을 그대로 적어주실 수 있나요?"
- 예: "그 장면에 같이 있던 사람은 누가 있었고, 각자 어떤 반응을 보였나요?"
- 예: "그 일이 끝난 직후 문자, 통화, 메신저, 관리자 보고처럼 남은 기록이 있나요?"

보고서 작성 원칙:
- 보고서는 제출용 초안처럼 구조화한다.
- 각 섹션은 짧은 문장과 불릿을 섞어 가독성 있게 쓴다.
- 인물은 반드시 역할로 분류한다: 피해자, 주가해자, 참여자, 방관자, 목격자, 관리자/책임자, 역할 불명.
- 인물별로 "행위", "근거 자료", "불확실한 점"을 구분한다.
- 장면별 상세 묘사에는 시간, 장소, 참여자 위치, 실제 발언, 행동 순서, 직후 반응을 포함한다.
- 증거는 단순 나열이 아니라 "무엇을 입증하는지"까지 쓴다.
- 정보가 부족하면 빈칸처럼 두지 말고 "추가 확인 필요"로 명시한다.

보고서 필수 구조:
# 사건보고서
## 1. 사건 핵심 요약
## 2. 당사자 및 역할표
## 3. 시간순 경위
## 4. 주요 장면별 상세 묘사
## 5. 인물별 행위와 책임 구조
## 6. 증거 목록 및 입증하려는 사실
## 7. 불확실한 점과 추가 확인 질문
## 8. 다음 대응 체크리스트

반드시 JSON 객체만 반환한다.
`.trim();
}

function buildModelInput(params) {
  const history = params.history.slice(-36).map((m, index) => {
    const role = m.role === 'assistant' ? 'AI' : '사용자';
    return `[${index + 1}] ${role}: ${String(m.content ?? '').slice(0, 2200)}`;
  }).join('\n\n');

  return `
[현재 요청 의도]
${params.intent}

[보고서 갱신 허용 여부]
${params.updateReport ? '허용됨. 새 사실관계와 정교화 내용을 보고서에 반영한다.' : '허용 안 됨. 질문에 먼저 답하고 기존 보고서는 유지한다.'}

[이번 응답에서 특히 해야 할 일]
${params.updateReport
    ? '- 새 입력을 단순 복사하지 말고 사건 장면, 역할, 증거, 불확실한 점으로 재구성한다.'
    : '- 질문에 직접 답한다. 보고서 내용은 변경하지 않는다.'}
- 사용자가 물은 것에 답하지 않고 보고서만 수정하는 행동은 금지한다.
- 부족한 정보는 "무엇이 왜 필요한지"와 함께 질문한다.

[프론트 추가 지침]
${params.clientGuidance || '없음'}

[현재 보고서]
${params.currentReport || '아직 작성된 보고서 없음'}

[대화 기록]
${history || '대화 없음'}

[출력 작성 규칙]
- assistant_message: 사용자에게 바로 보여줄 답변. "답변 / 보고서 반영 / 다음 확인 질문" 흐름을 우선한다.
- report_markdown: 최신 보고서. 보고서 갱신이 허용되지 않았으면 현재 보고서와 동일하게 유지한다.
- report_changed: 실제로 보고서가 바뀌었는지 boolean으로 표시한다.
- refinement_focus: 다음에 더 정교화해야 할 지점 1~5개를 쓴다.
- next_question: 다음 질문 하나만 쓴다.
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
    'refinement_focus',
  ],
  properties: {
    title: { type: 'string' },
    assistant_message: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'ready'] },
    report_markdown: { type: 'string' },
    report_changed: { type: 'boolean' },
    next_question: { type: 'string' },
    refinement_focus: {
      type: 'array',
      items: { type: 'string' },
      minItems: 0,
      maxItems: 5,
    },
  },
};

function extractOutputText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 50000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Request timed out'), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(params) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: reportModel,
      instructions: systemPrompt(params.product),
      input: buildModelInput(params),
      max_output_tokens: params.updateReport ? 5200 : 1800,
      temperature: 0.15,
      text: {
        format: {
          type: 'json_schema',
          name: 'roosycozy_refined_report_response',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const parsed = parseJsonObject(extractOutputText(data));
  if (!parsed) throw new Error('AI response was not valid structured JSON.');

  return {
    title: String(parsed.title ?? '새 사건').slice(0, 80),
    assistant_message: String(parsed.assistant_message ?? '조금 더 구체적으로 확인해보겠습니다.').slice(0, 3500),
    status: parsed.status === 'ready' ? 'ready' : 'draft',
    report_markdown: String(parsed.report_markdown ?? '').slice(0, 30000),
    report_changed: Boolean(parsed.report_changed),
    next_question: String(parsed.next_question ?? '').slice(0, 1200),
    refinement_focus: Array.isArray(parsed.refinement_focus) ? parsed.refinement_focus.slice(0, 5) : [],
  };
}

async function consumeReportUsage(serviceClient, userId: string, updateReport: boolean) {
  const { data, error } = await serviceClient.rpc('consume_report_usage_for_user', {
    target_user_id: userId,
    input_kind: updateReport ? 'report' : 'message',
    input_units: 1,
  });
  if (error) throw new Error(error.message);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabasePublishableKey = getPublishableKey();
    const supabaseSecretKey = getSecretKey();

    if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
      return jsonResponse({ error: 'Service environment is not configured.' }, 500);
    }
    if (!openAiApiKey) return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);

    const body = await req.json().catch(() => ({}));
    const product = body.product === 'teachers' ? 'teachers' : 'pro';
    const message = String(body.message ?? '').trim();
    const explicitForceReport = Boolean(body.forceReport);
    const clientIntent = String(body.clientIntent || inferIntent(message, explicitForceReport));
    const updateReport = shouldUpdateReport(clientIntent, explicitForceReport);
    const clientGuidance = String(body.clientGuidance ?? '').slice(0, 7000);
    const authorization = req.headers.get('Authorization') ?? '';

    if (!message && !explicitForceReport) return jsonResponse({ error: 'Message is required.' }, 400);

    const authClient = createClient(supabaseUrl, supabasePublishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseSecretKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Authentication required.' }, 401);

    const usage = await consumeReportUsage(serviceClient, user.id, updateReport);

    let conversation = null;
    if (body.conversationId) {
      const { data, error } = await serviceClient
        .from('report_conversations')
        .select('*')
        .eq('id', body.conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      conversation = data;
    }

    if (!conversation) {
      const { data, error } = await serviceClient
        .from('report_conversations')
        .insert({
          user_id: user.id,
          product,
          title: product === 'teachers' ? '악성민원 사건' : '외주 분쟁 사건',
          report_markdown: '',
          status: 'draft',
        })
        .select('*')
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      conversation = data;
    }

    if (message) {
      const { error } = await serviceClient.from('report_messages').insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: 'user',
        content: message,
        metadata: { intent: clientIntent, update_report: updateReport },
      });
      if (error) return jsonResponse({ error: error.message }, 500);
    }

    const { data: history, error: historyError } = await serviceClient
      .from('report_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversation.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (historyError) return jsonResponse({ error: historyError.message }, 500);

    const ai = await callOpenAI({
      product: conversation.product ?? product,
      history: history ?? [],
      currentReport: conversation.report_markdown ?? '',
      intent: clientIntent,
      updateReport,
      clientGuidance,
    });

    const nextReport = updateReport ? ai.report_markdown : (conversation.report_markdown ?? '');
    const nextTitle = updateReport ? ai.title : conversation.title;
    const nextStatus = updateReport ? ai.status : (conversation.status ?? 'draft');

    const { error: assistantInsertError } = await serviceClient.from('report_messages').insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: 'assistant',
      content: ai.assistant_message,
      metadata: {
        status: nextStatus,
        intent: clientIntent,
        update_report: updateReport,
        next_question: ai.next_question,
        refinement_focus: ai.refinement_focus,
      },
    });
    if (assistantInsertError) return jsonResponse({ error: assistantInsertError.message }, 500);

    const { data: updatedConversation, error: updateError } = await serviceClient
      .from('report_conversations')
      .update({
        title: nextTitle,
        status: nextStatus,
        report_markdown: nextReport,
      })
      .eq('id', conversation.id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    return jsonResponse({
      conversation: updatedConversation,
      assistantMessage: ai.assistant_message,
      usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
