// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const openAiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const modelSequence = unique([
  Deno.env.get('OPENAI_MODEL') ?? '',
  Deno.env.get('OPENAI_REPORT_MODEL') ?? '',
  Deno.env.get('OPENAI_MESSAGE_MODEL') ?? '',
  'gpt-4o-mini',
]);

const MAX_MESSAGE_CHARS = 9000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 1000;
const OPENAI_TIMEOUT_MS = numberEnv('OPENAI_TIMEOUT_MS', 45000, 15000, 60000);
const MAX_OUTPUT_TOKENS = numberEnv('OPENAI_MAX_OUTPUT_TOKENS', 1800, 800, 3600);

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(Deno.env.get(name));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function unique(values: string[]) {
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function compactText(value: unknown, max = 4000) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

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

function titleFromMessage(message: string) {
  return compactText(message, 42).replace(/\s+/g, ' ') || '분쟁 대응 전략';
}

function productName(product: string) {
  return product === 'teachers' ? '교원 분쟁대응' : '분쟁대응';
}

function systemPrompt(product: string) {
  return `
너는 ROOSY-X, ${productName(product)} 전략 에이전트다.
사용자가 분쟁상황, 민원, 학생지도, 학부모 문자, 공공기관 대응 고민을 입력하면 바로 실행 가능한 대응 전략으로 정리한다.

원칙:
- 법률 자문, 징계 판단, 행정 처분, 위법성, 책임 인정 여부를 단정하지 않는다.
- 확인된 사실, 추정, 감정 표현, 위험 문장, 기록 포인트를 분리한다.
- 답변은 짧고 실무적으로 쓴다.
- 사용자가 바로 복사할 수 있는 문장 초안을 포함한다.

반드시 이 구조로 답한다:
1. 핵심 진단
2. 전략 1: 차분한 사실확인형
3. 전략 2: 공식 절차 전환형
4. 전략 3: 기록 보강형
5. 먼저 하지 말 것
6. 지금 남길 기록
7. 다음 확인 질문 1개
`.trim();
}

function buildInput(params: {
  product: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  guidance: string;
}) {
  const historyText = params.history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => {
      const role = item.role === 'assistant' ? 'ROOSY-X' : '사용자';
      return `${role}: ${compactText(item.content, MAX_HISTORY_CHARS)}`;
    })
    .join('\n\n');

  return `
[현재 요청]
${compactText(params.message, MAX_MESSAGE_CHARS)}

[최근 대화]
${historyText || '없음'}

[추가 지침]
${compactText(params.guidance || '없음', 2500)}
`.trim();
}

function responseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'assistant_message'],
    properties: {
      title: { type: 'string' },
      assistant_message: { type: 'string' },
    },
  };
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

function outputText(data: any) {
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

function shouldRetryPlain(error: unknown) {
  return /json_schema|text\.format|schema|structured|invalid|unsupported|unknown parameter/i.test(
    String(error instanceof Error ? error.message : error),
  );
}

function isFatalOpenAiError(error: unknown) {
  return /authentication|unauthorized|forbidden|invalid api key|insufficient_quota/i.test(
    String(error instanceof Error ? error.message : error),
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestOpenAI(payload: Record<string, unknown>) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, OPENAI_TIMEOUT_MS);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 700)}`);
  }

  return response.json();
}

function openAiPayload(params: {
  model: string;
  product: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  guidance: string;
  structured: boolean;
}) {
  const payload: Record<string, unknown> = {
    model: params.model,
    instructions: systemPrompt(params.product),
    input: buildInput(params),
    max_output_tokens: MAX_OUTPUT_TOKENS,
  };

  if (params.structured) {
    payload.text = {
      format: {
        type: 'json_schema',
        name: 'roosy_x_strategy_response',
        strict: true,
        schema: responseSchema(),
      },
    };
  }

  return payload;
}

async function callOpenAI(params: {
  product: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  guidance: string;
}) {
  let lastError: unknown = null;

  for (const model of modelSequence) {
    try {
      let data;
      try {
        data = await requestOpenAI(openAiPayload({ ...params, model, structured: true }));
      } catch (error) {
        if (!shouldRetryPlain(error)) throw error;
        data = await requestOpenAI(openAiPayload({ ...params, model, structured: false }));
      }

      const text = outputText(data);
      const parsed = parseJsonObject(text);
      return {
        model,
        title: compactText(parsed?.title || titleFromMessage(params.message), 80),
        assistant_message: compactText(parsed?.assistant_message || text, 7000),
      };
    } catch (error) {
      lastError = error;
      if (isFatalOpenAiError(error)) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI request failed.');
}

async function getUser(authClient: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');
  return user;
}

async function consumeUsage(serviceClient: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await serviceClient.rpc('consume_report_usage_for_user', {
    target_user_id: userId,
    input_kind: 'message',
    input_units: 1,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function findOrCreateConversation(
  serviceClient: ReturnType<typeof createClient>,
  params: { conversationId?: string; userId: string; product: string; message: string },
) {
  if (params.conversationId) {
    const { data, error } = await serviceClient
      .from('report_conversations')
      .select('*')
      .eq('id', params.conversationId)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const { data, error } = await serviceClient
    .from('report_conversations')
    .insert({
      user_id: params.userId,
      product: params.product,
      title: titleFromMessage(params.message),
      status: 'draft',
      report_markdown: '',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function loadHistory(serviceClient: ReturnType<typeof createClient>, conversationId: string, userId: string) {
  const { data, error } = await serviceClient
    .from('report_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);
  if (error) throw new Error(error.message);
  return (data ?? []).slice().reverse();
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

async function updateConversation(
  serviceClient: ReturnType<typeof createClient>,
  params: { conversation: any; userId: string; title: string },
) {
  const { data, error } = await serviceClient
    .from('report_conversations')
    .update({
      title: params.conversation.title || params.title,
      status: 'draft',
    })
    .eq('id', params.conversation.id)
    .eq('user_id', params.userId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const publishableKey = getPublishableKey();
    const secretKey = getSecretKey();
    if (!supabaseUrl || !publishableKey || !secretKey) {
      return jsonResponse({ error: 'Service environment is not configured.' }, 500);
    }
    if (!openAiApiKey) return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);

    const body = await req.json().catch(() => ({}));
    const message = compactText(body.message, MAX_MESSAGE_CHARS);
    const product = body.product === 'teachers' ? 'teachers' : 'pro';
    const guidance = compactText(body.clientGuidance, 2500);
    if (!message) return jsonResponse({ error: 'Message is required.' }, 400);

    const authClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const serviceClient = createClient(supabaseUrl, secretKey);
    const user = await getUser(authClient);

    const conversation = await findOrCreateConversation(serviceClient, {
      conversationId: body.conversationId ? String(body.conversationId) : '',
      userId: user.id,
      product,
      message,
    });

    await insertMessage(serviceClient, {
      conversationId: conversation.id,
      userId: user.id,
      role: 'user',
      content: message,
      metadata: { mode: 'strategy_chat', product },
    });

    const [history, usage] = await Promise.all([
      loadHistory(serviceClient, conversation.id, user.id),
      consumeUsage(serviceClient, user.id),
    ]);
    const ai = await callOpenAI({ product, message, history, guidance });

    await insertMessage(serviceClient, {
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      content: ai.assistant_message,
      metadata: { mode: 'strategy_chat', model: ai.model },
    });

    const updatedConversation = await updateConversation(serviceClient, {
      conversation,
      userId: user.id,
      title: ai.title,
    });

    return jsonResponse({
      conversation: updatedConversation,
      assistantMessage: ai.assistant_message,
      usage,
      meta: {
        mode: 'strategy_chat',
        model: ai.model,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /Authentication required/i.test(message) ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
