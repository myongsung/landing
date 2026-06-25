import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const config = window.ROOSYCOZY_SUPABASE ?? {};
const supabaseUrl = config.url ?? '';
const supabasePublishableKey = config.publishableKey ?? '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const tierConfig = {
  unauth: { label: '비로그인', license: '로그인 필요', limit: 0 },
  general: { label: '일반 사용자', license: 'ROOSY-X', limit: 20 },
  teacher: { label: '교원', license: 'TEACHER', limit: 150 },
  pro: { label: '승인 계정', license: 'ROOSY-X', limit: 500 },
};

const conversationSelect = 'id, user_id, product, title, status, report_markdown, saved_at, created_at, updated_at';

const dom = {
  body: document.body,
  landingView: document.querySelector('[data-landing-view]'),
  chatView: document.querySelector('[data-chat-view]'),
  authOpenButtons: document.querySelectorAll('[data-auth-open], [data-start-chat]'),
  authPanel: document.querySelector('[data-auth-panel]'),
  userPanel: document.querySelector('[data-user-panel]'),
  userEmail: document.querySelector('[data-user-email]'),
  signOut: document.querySelector('[data-sign-out]'),
  usagePill: document.querySelector('[data-usage-pill]'),
  usageCopy: document.querySelector('[data-usage-copy]'),
  authBackdrop: document.querySelector('[data-auth-backdrop]'),
  authModal: document.querySelector('[data-auth-modal]'),
  authClose: document.querySelector('[data-auth-close]'),
  signInGoogle: document.querySelector('[data-sign-in-google]'),
  authModeButtons: document.querySelectorAll('[data-auth-mode]'),
  emailAuthForm: document.querySelector('[data-email-auth-form]'),
  authEmail: document.querySelector('[data-auth-email]'),
  authPassword: document.querySelector('[data-auth-password]'),
  authPasswordConfirm: document.querySelector('[data-auth-password-confirm]'),
  authTerms: document.querySelector('[data-auth-terms]'),
  authSubmit: document.querySelector('[data-auth-submit]'),
  authMessage: document.querySelector('[data-auth-message]'),
  authResend: document.querySelector('[data-auth-resend]'),
  guideOpenButtons: document.querySelectorAll('[data-guide-open]'),
  guideBackdrop: document.querySelector('[data-guide-backdrop]'),
  guideModal: document.querySelector('[data-guide-modal]'),
  guideClose: document.querySelector('[data-guide-close]'),
  homeLink: document.querySelector('[data-home-link]'),
  backHome: document.querySelector('[data-back-home]'),
  newChat: document.querySelector('[data-new-chat]'),
  chatHistoryToggle: document.querySelector('[data-chat-history-toggle]'),
  chatHistoryCloseButtons: document.querySelectorAll('[data-chat-history-close]'),
  conversationList: document.querySelector('[data-conversation-list]'),
  messageList: document.querySelector('[data-message-list]'),
  chatTitle: document.querySelector('[data-chat-title]'),
  chatForm: document.querySelector('[data-chat-form]'),
  chatInput: document.querySelector('[data-chat-input]'),
  sendButton: document.querySelector('[data-send-button]'),
  serviceStatus: document.querySelector('[data-service-status]'),
};

let supabase = null;
let session = null;
let usageState = { tier: 'unauth', used: 0, limit: 0, period: '' };
let conversations = [];
let activeConversation = null;
let messages = [];
let authMode = 'login';
let isSending = false;
let isChatHistoryOpen = false;
let toastTimer = null;
let lastVerificationEmail = '';

const starterPrompts = [
  '학부모님이 오늘 있었던 학생지도 사안에 대해 항의 문자를 보냈어. 답변 전략을 3가지로 정리해줘.',
  '민원인이 계속 개인 연락을 요구하는데 공식 절차로 전환하는 문장을 만들어줘.',
  '교권침해 가능성이 있는 상황인데 지금 남겨야 할 기록과 하지 말아야 할 말을 정리해줘.',
  '내일 관리자에게 공유할 사안 요약과 대응 선택지를 만들어줘.',
];

function ensureClient() {
  if (!isSupabaseConfigured) return null;
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabase;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeTier(tier) {
  if (tier === 'teacher' || tier === 'lawyer') return 'teacher';
  if (tier === 'pro') return 'pro';
  if (tier === 'general') return 'general';
  return session?.user ? 'general' : 'unauth';
}

function tierInfo(tier = usageState.tier) {
  return tierConfig[normalizeTier(tier)] ?? tierConfig.general;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function usagePercent() {
  if (!usageState.limit) return 0;
  return Math.min(100, Math.round((usageState.used / usageState.limit) * 100));
}

function remainingUsage() {
  return Math.max(0, usageState.limit - usageState.used);
}

function applyUsageState(nextUsage = {}) {
  const tier = normalizeTier(nextUsage.tier ?? nextUsage.membership_tier ?? usageState.tier);
  const info = tierInfo(tier);
  const limit =
    numberOrNull(nextUsage.limit_points) ??
    numberOrNull(nextUsage.limit_messages) ??
    numberOrNull(nextUsage.limit_reports) ??
    numberOrNull(nextUsage.limit) ??
    numberOrNull(nextUsage.monthly_limit) ??
    info.limit;
  const used =
    numberOrNull(nextUsage.used_points) ??
    numberOrNull(nextUsage.used_messages) ??
    numberOrNull(nextUsage.used_reports) ??
    numberOrNull(nextUsage.used) ??
    usageState.used ??
    0;

  usageState = {
    tier,
    used: Math.max(0, Math.min(limit, used)),
    limit,
    period: String(nextUsage.period ?? nextUsage.month ?? nextUsage.period_month ?? usageState.period ?? ''),
  };

  renderUsage();
}

function incrementUsage(units = 1) {
  applyUsageState({
    tier: usageState.tier,
    used: Math.min(usageState.limit, usageState.used + units),
    limit: usageState.limit,
    period: usageState.period,
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInline(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatAssistantMessage(content) {
  const lines = String(content ?? '').trim().split('\n');
  if (!lines.length || !lines[0]) return '<p>응답이 비어 있습니다.</p>';

  const chunks = [];
  let listType = '';
  let listItems = [];

  const flushList = () => {
    if (!listType) return;
    chunks.push(`<${listType}>${listItems.join('')}</${listType}>`);
    listType = '';
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      chunks.push(`<p><strong>${formatInline(line.replace(/^#{1,3}\s+/, ''))}</strong></p>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(`<li>${formatInline(bullet[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)/);
    if (ordered) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(`<li>${formatInline(ordered[1])}</li>`);
      continue;
    }

    flushList();
    chunks.push(`<p>${formatInline(line)}</p>`);
  }

  flushList();
  return chunks.join('');
}

function showToast(message, tone = 'info') {
  if (!dom.serviceStatus) return;
  window.clearTimeout(toastTimer);
  dom.serviceStatus.textContent = message;
  dom.serviceStatus.dataset.tone = tone;
  dom.serviceStatus.hidden = !message;
  if (message) {
    toastTimer = window.setTimeout(() => {
      dom.serviceStatus.hidden = true;
    }, tone === 'error' ? 6500 : 3600);
  }
}

function setView(view) {
  const nextView = view === 'chat' ? 'chat' : 'landing';
  dom.body.dataset.view = nextView;
  if (dom.landingView) dom.landingView.hidden = nextView !== 'landing';
  if (dom.chatView) dom.chatView.hidden = nextView !== 'chat';
  if (nextView !== 'chat') setChatHistoryOpen(false);
  if (nextView === 'landing') {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

function setChatHistoryOpen(open) {
  isChatHistoryOpen = Boolean(open);
  dom.body.classList.toggle('is-chat-history-open', isChatHistoryOpen);
  dom.chatHistoryToggle?.setAttribute('aria-expanded', isChatHistoryOpen ? 'true' : 'false');
}

function renderUsage() {
  const signedIn = Boolean(session?.user);
  const info = tierInfo();
  const percent = usagePercent();
  const used = Math.min(usageState.used, usageState.limit);
  const text = signedIn
    ? `${info.license} · ${used}/${usageState.limit} · ${percent}%`
    : '로그인 필요';

  if (dom.usagePill) {
    dom.usagePill.hidden = !signedIn;
    dom.usagePill.textContent = text;
  }

  if (dom.usageCopy) {
    dom.usageCopy.textContent = signedIn
      ? `${info.label} · 이번 달 ${remainingUsage()}회 남음`
      : '로그인 후 전략 채팅을 시작할 수 있습니다.';
  }
}

function renderAuth() {
  const signedIn = Boolean(session?.user);
  dom.body.dataset.authenticated = signedIn ? 'true' : 'false';

  if (dom.authPanel) dom.authPanel.hidden = signedIn;
  if (dom.userPanel) dom.userPanel.hidden = !signedIn;
  if (dom.userEmail) dom.userEmail.textContent = session?.user?.email ?? '';
  renderUsage();
}

function renderConversations() {
  if (!dom.conversationList) return;
  dom.conversationList.innerHTML = '';

  if (!conversations.length) {
    const empty = document.createElement('p');
    empty.className = 'conversation-empty';
    empty.textContent = '아직 저장된 사안이 없습니다.';
    dom.conversationList.append(empty);
    return;
  }

  for (const conversation of conversations) {
    const item = document.createElement('div');
    item.className = `conversation-item${conversation.id === activeConversation?.id ? ' is-active' : ''}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversation-select';
    button.innerHTML = `
      <strong>${escapeHtml(conversation.title || '새 사안')}</strong>
      <span>${formatDate(conversation.updated_at || conversation.created_at)}</span>
    `;
    button.addEventListener('click', () => selectConversation(conversation.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'conversation-delete';
    deleteButton.setAttribute('aria-label', `${conversation.title || '새 사안'} 삭제`);
    deleteButton.title = '사안 삭제';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteConversation(conversation.id);
    });

    item.append(button, deleteButton);
    dom.conversationList.append(item);
  }
}

function renderMessages() {
  if (!dom.messageList) return;
  dom.messageList.innerHTML = '';
  if (dom.chatTitle) dom.chatTitle.textContent = activeConversation?.title || '새 사안';

  if (!messages.length) {
    const empty = document.createElement('section');
    empty.className = 'empty-chat';
    empty.innerHTML = `
      <h2>상황을 그대로 입력하세요</h2>
      <p>ROOSY-X는 사안을 사실관계, 위험 표현, 기록 포인트로 나누고 바로 선택할 수 있는 3가지 대응 전략을 제안합니다.</p>
      <div class="prompt-grid">
        ${starterPrompts.map((prompt) => `<button type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt.split('.')[0])}</button>`).join('')}
      </div>
    `;
    empty.querySelectorAll('[data-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        dom.chatInput.value = button.dataset.prompt;
        resizeComposer();
        dom.chatInput.focus();
      });
    });
    dom.messageList.append(empty);
    return;
  }

  for (const message of messages) {
    const item = document.createElement('article');
    item.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
    const role = message.role === 'user' ? '사용자' : 'ROOSY-X';
    item.innerHTML = `
      <span class="role">${role}</span>
      ${message.role === 'assistant' ? formatAssistantMessage(message.content) : `<p>${escapeHtml(message.content)}</p>`}
    `;
    dom.messageList.append(item);
  }

  if (isSending) {
    const loading = document.createElement('article');
    loading.className = 'message assistant is-loading';
    loading.innerHTML = `
      <span class="role">ROOSY-X</span>
      <div class="loading-copy">
        <span>전략 계산 중</span>
        <i></i><i></i><i></i>
      </div>
    `;
    dom.messageList.append(loading);
  }

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

function renderAll() {
  renderAuth();
  renderConversations();
  renderMessages();
  if (dom.sendButton) {
    dom.sendButton.disabled = isSending || !session?.user || !remainingUsage();
    dom.sendButton.textContent = isSending ? '분석 중' : '전송';
  }
}

function setAuthMode(nextMode) {
  authMode = nextMode === 'signup' ? 'signup' : 'login';
  dom.body.dataset.authMode = authMode;
  dom.authModeButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.authMode === authMode);
  });
  if (dom.authSubmit) dom.authSubmit.textContent = authMode === 'signup' ? '회원가입' : '이메일로 로그인';
  if (dom.authPassword) {
    dom.authPassword.setAttribute('autocomplete', authMode === 'signup' ? 'new-password' : 'current-password');
  }
  setAuthMessage('');
}

function setAuthMessage(message, isError = false) {
  if (!dom.authMessage) return;
  dom.authMessage.textContent = message;
  dom.authMessage.style.color = isError ? '#b42318' : '#64748b';
}

function setAuthModal(open) {
  if (!dom.authModal || !dom.authBackdrop) return;
  dom.body.classList.toggle('is-modal-open', open);
  dom.authBackdrop.hidden = !open;
  dom.authModal.hidden = !open;
  dom.authModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    setAuthMode('login');
    window.setTimeout(() => dom.authEmail?.focus(), 80);
  }
}

function setGuideModal(open) {
  if (!dom.guideModal || !dom.guideBackdrop) return;
  dom.body.classList.toggle('is-modal-open', open);
  dom.guideBackdrop.hidden = !open;
  dom.guideModal.hidden = !open;
  dom.guideModal.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function friendlyAuthError(error) {
  const message = String(error?.message || error || '');
  if (/Invalid login credentials/i.test(message)) return '이메일 또는 비밀번호를 확인해 주세요.';
  if (/Email not confirmed/i.test(message)) return '이메일 인증을 먼저 완료해 주세요.';
  if (/already registered|already been registered|User already registered/i.test(message)) return '이미 가입된 이메일입니다. 로그인 탭에서 다시 시도해 주세요.';
  if (/Password should be at least/i.test(message)) return '비밀번호는 6자 이상으로 입력해 주세요.';
  return message || '인증 처리 중 오류가 발생했습니다.';
}

function friendlyServiceError(error) {
  const message = String(error?.message || error || '');
  if (/Authentication required|JWT|401/i.test(message)) return '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.';
  if (/limit|quota|usage|한도/i.test(message)) return '이번 달 사용량을 확인해 주세요.';
  if (/timeout|지연|aborted|network/i.test(message)) return '응답이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.';
  if (/Failed to send a request|FunctionsHttpError|Edge Function|fetch/i.test(message)) {
    return 'AI 응답을 받아오지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  }
  return message || '요청 처리 중 오류가 발생했습니다.';
}

function shouldUseLocalFallback(error) {
  const message = String(error?.message || error || '');
  return /Failed to send a request|Edge Function|fetch|network|timeout|aborted|지연/i.test(message);
}

function summarizeSituation(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '입력된 사안';
  return normalized.length > 90 ? `${normalized.slice(0, 90)}...` : normalized;
}

function buildLocalStrategyReply(text) {
  const situation = summarizeSituation(text);
  return [
    'AI 응답을 받아오지 못해 우선 화면용 전략 초안으로 정리했습니다. 잠시 뒤 다시 전송하면 AI 분석본으로 보강할 수 있습니다.',
    '',
    '## 핵심 진단',
    `현재 사안은 "${situation}"에 대한 대응입니다. 지금은 감정적 반응보다 사실 확인, 공식 기록, 내부 공유 순서가 중요합니다.`,
    '',
    '## 선택 가능한 3가지 전략',
    '1. 차분한 사실확인형',
    '- 언제 쓰는지: 상대방의 감정이 크지만 아직 공식 절차로 번지지 않았을 때',
    '- 장점: 불필요한 인정이나 반박을 줄이고 대화를 안정시킵니다.',
    '- 주의점: 책임 인정처럼 읽히는 표현은 피합니다.',
    '- 바로 보낼 문장: “말씀 주신 내용은 확인했습니다. 당시 상황과 지도 경위를 다시 확인한 뒤, 확인된 사실을 기준으로 안내드리겠습니다.”',
    '',
    '2. 학교·조직 공유형',
    '- 언제 쓰는지: 민원 확대 가능성이 있거나 혼자 답변하기 부담스러울 때',
    '- 장점: 개인 대응이 아니라 공식 대응 흐름으로 전환됩니다.',
    '- 주의점: 상대방에게 내부 논의 내용을 과하게 공개하지 않습니다.',
    '- 바로 보낼 문장: “사안의 정확한 확인을 위해 관련 내용을 내부 절차에 따라 공유하고 확인하겠습니다.”',
    '',
    '3. 기록 보강형',
    '- 언제 쓰는지: 향후 말이 바뀌거나 쟁점이 커질 수 있을 때',
    '- 장점: 시간, 장소, 발언, 조치 내용을 남겨 다음 대응의 근거를 확보합니다.',
    '- 주의점: 추정이나 평가가 아니라 확인된 사실만 기록합니다.',
    '- 바로 보낼 문장: “현재 확인 가능한 사실관계와 당시 조치 내용을 정리해 두고, 추가 확인이 필요한 부분은 따로 확인하겠습니다.”',
    '',
    '## 먼저 하지 말 것',
    '- “제가 잘못했습니다”처럼 책임을 단정하는 표현',
    '- 상대 감정을 반박하거나 평가하는 표현',
    '- 개인 연락으로 긴 설명을 이어가는 방식',
    '',
    '## 기록 포인트',
    '- 최초 연락 시각과 원문',
    '- 실제 발생 시각, 장소, 관련자',
    '- 당시 조치와 그 이유',
    '- 목격자 또는 남아 있는 자료',
    '',
    '## 다음 확인 질문',
    '상대방이 문제 삼은 정확한 문장이나 행동은 무엇인가요?',
  ].join('\n');
}

async function invokeReportChat(payload) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await withTimeout(
        supabase.functions.invoke('report-chat', { body: payload }),
        62000,
        '답변 생성이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.'
      );
      if (!result.error) return result;

      const context = result.error.context;
      if (context instanceof Response) {
        const errorBody = await context.clone().json().catch(() => null);
        if (errorBody?.error) throw new Error(errorBody.error);
      }
      throw result.error;
    } catch (error) {
      lastError = error;
      if (!shouldUseLocalFallback(error) || attempt === 1) break;
      await delay(750);
    }
  }

  throw lastError || new Error('요청 처리 중 오류가 발생했습니다.');
}

async function restoreSession() {
  const client = ensureClient();
  if (!client) {
    showToast('Supabase 설정을 확인해 주세요.', 'error');
    return null;
  }

  const { data, error } = await withTimeout(client.auth.getSession(), 12000, '로그인 세션 확인이 지연되고 있습니다.');
  if (error) throw error;
  session = data.session ?? null;
  renderAuth();
  return session;
}

async function loadUsage({ preserveOnError = true } = {}) {
  if (!session?.user || !supabase) {
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_my_report_usage'),
      12000,
      '사용량 정보를 확인하는 중 응답이 지연되고 있습니다.'
    );
    if (!error && data) {
      applyUsageState(data);
      return;
    }
  } catch {
    // Membership fallback below keeps the UI usable when the usage RPC is slow.
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('user_memberships').select('tier').eq('user_id', session.user.id).maybeSingle(),
      12000,
      '권한 정보를 확인하는 중 응답이 지연되고 있습니다.'
    );
    if (!error) {
      const tier = normalizeTier(data?.tier);
      applyUsageState({
        tier,
        used: preserveOnError ? usageState.used : 0,
        limit: tierInfo(tier).limit,
      });
      return;
    }
  } catch {
    // Preserve the last known quota if Supabase is temporarily slow.
  }

  if (!preserveOnError) {
    applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }
}

async function loadConversations() {
  if (!session?.user || !supabase) {
    conversations = [];
    activeConversation = null;
    messages = [];
    return;
  }

  const { data, error } = await withTimeout(
    supabase
      .from('report_conversations')
      .select(conversationSelect)
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(30),
    12000,
    '저장된 사안 기록을 불러오는 중 응답이 지연되고 있습니다.'
  );
  if (error) throw error;

  conversations = data ?? [];
  activeConversation = conversations[0] ?? null;
  await loadMessages({ silent: true });
}

async function loadMessages({ silent = false } = {}) {
  if (!activeConversation?.id || !session?.user || !supabase) {
    messages = [];
    renderMessages();
    return;
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('report_messages')
        .select('id, role, content, metadata, created_at')
        .eq('conversation_id', activeConversation.id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(100),
      12000,
      '대화 기록을 불러오는 중 응답이 지연되고 있습니다.'
    );
    if (error) throw error;
    messages = data ?? [];
  } catch (error) {
    if (!silent) showToast(friendlyServiceError(error), 'error');
  }

  renderMessages();
}

async function selectConversation(id) {
  setChatHistoryOpen(false);
  activeConversation = conversations.find((conversation) => conversation.id === id) ?? null;
  messages = [];
  renderAll();
  await loadMessages();
  renderAll();
}

function newChat() {
  setChatHistoryOpen(false);
  activeConversation = null;
  messages = [];
  renderAll();
  dom.chatInput?.focus();
}

async function deleteConversation(id) {
  if (!id || !session?.user || !supabase) {
    showToast('로그인 후 사안을 삭제할 수 있습니다.', 'error');
    return;
  }

  const target = conversations.find((conversation) => conversation.id === id);
  const title = target?.title || '새 사안';
  const confirmed = window.confirm(`'${title}' 사안을 삭제할까요?\n대화 기록도 함께 삭제됩니다.`);
  if (!confirmed) return;

  const wasActive = activeConversation?.id === id;
  showToast('사안을 삭제하는 중입니다.');

  try {
    const deleteConversationRecord = () =>
      withTimeout(
        supabase
          .from('report_conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id),
        12000,
        '사안을 삭제하는 중 응답이 지연되고 있습니다.'
      );

    let { error } = await deleteConversationRecord();

    if (error) {
      const canRetryAfterMessages = /foreign key|constraint|violates|23503/i.test(String(error?.message || error || ''));
      if (!canRetryAfterMessages) throw error;

      const { error: messageError } = await withTimeout(
        supabase
          .from('report_messages')
          .delete()
          .eq('conversation_id', id)
          .eq('user_id', session.user.id),
        12000,
        '대화 기록을 삭제하는 중 응답이 지연되고 있습니다.'
      );
      if (messageError) throw messageError;

      ({ error } = await deleteConversationRecord());
      if (error) throw error;
    }

    conversations = conversations.filter((conversation) => conversation.id !== id);

    if (wasActive) {
      activeConversation = conversations[0] ?? null;
      messages = [];
      if (activeConversation) await loadMessages({ silent: true });
    }

    renderAll();
    showToast('사안을 삭제했습니다.', 'ready');
  } catch (error) {
    showToast(friendlyServiceError(error), 'error');
  }
}

function currentProduct() {
  return usageState.tier === 'teacher' ? 'teachers' : 'pro';
}

async function sendMessage(message) {
  const text = String(message || '').trim();
  if (!text || isSending) return;

  if (!session?.user) {
    setAuthModal(true);
    showToast('로그인 후 대화할 수 있습니다.', 'error');
    return;
  }

  if (!supabase) {
    showToast('Supabase 연결 설정을 확인해 주세요.', 'error');
    return;
  }

  if (remainingUsage() <= 0) {
    showToast('이번 달 사용량을 모두 사용했습니다.', 'error');
    return;
  }

  const tempUser = {
    id: `local-user-${Date.now()}`,
    role: 'user',
    content: text,
    created_at: new Date().toISOString(),
  };
  messages = [...messages, tempUser];
  dom.chatInput.value = '';
  resizeComposer();
  isSending = true;
  renderAll();

  try {
    const usageBefore = { ...usageState };
    const { data } = await invokeReportChat({
      conversationId: activeConversation?.id ?? null,
      product: currentProduct(),
      message: text,
      clientGuidance: [
        '답변은 반드시 선택 가능한 3가지 대응 전략을 포함한다.',
        '바로 보낼 문장, 먼저 하지 말 것, 기록 포인트, 다음 확인 질문을 포함한다.',
        '법률 판단, 행정 처분, 징계 결론은 단정하지 않는다.',
      ].join('\n'),
    });
    if (data?.error) throw new Error(data.error);

    const assistantMessage =
      data?.assistantMessage ??
      data?.assistant_message ??
      data?.message ??
      data?.reply ??
      '정리했습니다.';

    if (data?.conversation) {
      activeConversation = data.conversation;
      const existingIndex = conversations.findIndex((item) => item.id === activeConversation.id);
      if (existingIndex >= 0) conversations[existingIndex] = activeConversation;
      else conversations.unshift(activeConversation);
      await loadMessages({ silent: true });
    } else {
      messages = [
        ...messages,
        {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantMessage,
          created_at: new Date().toISOString(),
        },
      ];
    }

    if (data?.usage) applyUsageState(data.usage);
    else incrementUsage(1);
    await loadUsage({ preserveOnError: true });
    if (usageState.used <= usageBefore.used) incrementUsage(1);

    showToast('전략 생성 완료', 'ready');
  } catch (error) {
    const fallbackContent = shouldUseLocalFallback(error) ? buildLocalStrategyReply(text) : null;
    messages = [
      ...messages,
      {
        id: `local-${fallbackContent ? 'fallback' : 'error'}-${Date.now()}`,
        role: 'assistant',
        content: fallbackContent || `요청 처리 오류: ${friendlyServiceError(error)}`,
        created_at: new Date().toISOString(),
      },
    ];
    showToast(
      fallbackContent ? 'AI 응답이 지연되어 화면용 초안을 표시했습니다.' : friendlyServiceError(error),
      fallbackContent ? 'info' : 'error'
    );
  } finally {
    isSending = false;
    renderAll();
  }
}

function resizeComposer() {
  if (!dom.chatInput) return;
  dom.chatInput.style.height = 'auto';
  dom.chatInput.style.height = `${Math.min(dom.chatInput.scrollHeight, 180)}px`;
}

async function signInWithGoogle() {
  const client = ensureClient();
  if (!client) return showToast('Supabase 설정을 확인해 주세요.', 'error');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) showToast(friendlyAuthError(error), 'error');
}

async function submitEmailAuth(event) {
  event.preventDefault();
  const client = ensureClient();
  if (!client) return showToast('Supabase 설정을 확인해 주세요.', 'error');

  const email = dom.authEmail?.value.trim() ?? '';
  const password = dom.authPassword?.value ?? '';
  const passwordConfirm = dom.authPasswordConfirm?.value ?? '';

  if (!email) return setAuthMessage('이메일을 입력해 주세요.', true);
  if (password.length < 6) return setAuthMessage('비밀번호는 6자 이상 입력해 주세요.', true);
  if (authMode === 'signup') {
    if (password !== passwordConfirm) return setAuthMessage('비밀번호 확인이 일치하지 않습니다.', true);
    if (!dom.authTerms?.checked) return setAuthMessage('개인정보처리방침 및 이용약관 동의가 필요합니다.', true);
  }

  const idle = dom.authSubmit?.textContent ?? '';
  if (dom.authSubmit) {
    dom.authSubmit.disabled = true;
    dom.authSubmit.textContent = authMode === 'signup' ? '가입 처리 중' : '로그인 중';
  }
  setAuthMessage('');

  try {
    const request = authMode === 'signup'
      ? client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
        })
      : client.auth.signInWithPassword({ email, password });
    const { data, error } = await withTimeout(request, 30000, '이메일 인증 응답이 지연되고 있습니다.');
    if (error) throw error;
    lastVerificationEmail = email;

    if (authMode === 'signup' && !data?.session) {
      setAuthMessage('인증 메일을 보냈습니다. 메일함에서 링크를 누른 뒤 로그인해 주세요.');
      if (dom.authResend) dom.authResend.hidden = false;
      return;
    }

    setAuthModal(false);
    session = data.session;
    await enterChatAfterLogin();
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), true);
  } finally {
    if (dom.authSubmit) {
      dom.authSubmit.disabled = false;
      dom.authSubmit.textContent = idle || (authMode === 'signup' ? '회원가입' : '이메일로 로그인');
    }
  }
}

async function resendVerificationEmail() {
  const client = ensureClient();
  const email = (dom.authEmail?.value.trim() || lastVerificationEmail).trim();
  if (!client || !email) return setAuthMessage('재전송할 이메일을 입력해 주세요.', true);

  const idle = dom.authResend?.textContent ?? '인증 메일 다시 보내기';
  if (dom.authResend) {
    dom.authResend.disabled = true;
    dom.authResend.textContent = '재전송 중';
  }

  try {
    const { error } = await client.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) throw error;
    setAuthMessage('인증 메일을 다시 보냈습니다.');
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), true);
  } finally {
    if (dom.authResend) {
      dom.authResend.disabled = false;
      dom.authResend.textContent = idle;
    }
  }
}

async function signOut(remote = true) {
  if (remote && supabase) await supabase.auth.signOut();
  session = null;
  conversations = [];
  activeConversation = null;
  messages = [];
  applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
  setView('landing');
  renderAll();
}

async function enterChatAfterLogin() {
  renderAuth();
  setAuthModal(false);
  setView('chat');
  try {
    await loadUsage({ preserveOnError: false });
    await loadConversations();
  } catch (error) {
    showToast(friendlyServiceError(error), 'error');
    if (!usageState.limit) applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }
  renderAll();
  window.setTimeout(() => dom.chatInput?.focus(), 80);
}

async function boot() {
  document.body.dataset.authMode = authMode;
  const client = ensureClient();
  renderAll();

  if (!client) {
    showToast('Supabase 설정이 필요합니다.', 'error');
    return;
  }

  try {
    await restoreSession();
    if (session?.user) {
      await enterChatAfterLogin();
    } else {
      setView('landing');
      renderAll();
    }
  } catch (error) {
    showToast(friendlyServiceError(error), 'error');
    setView('landing');
  }

  client.auth.onAuthStateChange(async (event, nextSession) => {
    session = nextSession;
    if (event === 'SIGNED_OUT' || !nextSession?.user) {
      await signOut(false);
      return;
    }
    await enterChatAfterLogin();
  });
}

dom.authOpenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (session?.user) {
      setView('chat');
      dom.chatInput?.focus();
    } else {
      setAuthModal(true);
    }
  });
});

dom.homeLink?.addEventListener('click', (event) => {
  event.preventDefault();
  setView('landing');
});

dom.backHome?.addEventListener('click', () => setView('landing'));
dom.newChat?.addEventListener('click', newChat);
dom.chatHistoryToggle?.addEventListener('click', () => setChatHistoryOpen(!isChatHistoryOpen));
dom.chatHistoryCloseButtons.forEach((button) => button.addEventListener('click', () => setChatHistoryOpen(false)));
dom.signOut?.addEventListener('click', signOut);
dom.authClose?.addEventListener('click', () => setAuthModal(false));
dom.authBackdrop?.addEventListener('click', () => setAuthModal(false));
dom.signInGoogle?.addEventListener('click', signInWithGoogle);
dom.emailAuthForm?.addEventListener('submit', submitEmailAuth);
dom.authResend?.addEventListener('click', resendVerificationEmail);
dom.authModeButtons.forEach((button) => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});
dom.guideOpenButtons.forEach((button) => button.addEventListener('click', () => setGuideModal(true)));
dom.guideClose?.addEventListener('click', () => setGuideModal(false));
dom.guideBackdrop?.addEventListener('click', () => setGuideModal(false));
dom.chatInput?.addEventListener('input', resizeComposer);
dom.chatInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    dom.chatForm?.requestSubmit();
  }
});
dom.chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(dom.chatInput?.value ?? '');
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  setAuthModal(false);
  setGuideModal(false);
});

boot();
