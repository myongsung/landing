import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const config = window.ROOSYCOZY_SUPABASE ?? {};
const supabaseUrl = config.url ?? '';
const supabasePublishableKey = config.publishableKey ?? '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

document.body.dataset.supabaseConfigured = isSupabaseConfigured ? 'true' : 'false';

const reportChatBehaviorGuide = `
RoosyCozy 상담 응답 원칙:
1. 사용자가 질문하면 먼저 질문에 직접 답한다. 질문 답변을 사건보고서 문장으로만 바꾸지 않는다.
2. 새 사실관계가 들어오면 보고서를 자동 갱신하되, 대화 응답에는 무엇을 반영했는지 짧게 설명한다.
3. "더 필요한 것", "강력한 증거", "어떻게 해야 하나" 같은 질문에는 실행 가능한 체크리스트로 답한다.
4. 단순히 "그렇군요"로 끝내지 말고, 다음에 확인할 핵심 질문 1개를 제시한다.
5. 당사자는 역할을 분리한다: 피해자, 주가해자, 참여자, 방관자, 목격자, 관리자/책임자, 역할 불명.
6. 각 인물마다 "누가 / 언제 / 어디서 / 무엇을 했는지 / 증거 / 현재 불확실한 점"을 구분한다.
7. 사건보고서는 관계 설명만 하지 말고 행위별 책임 구조, 방관/가담 여부, 증거 공백, 다음 확보 자료를 포함한다.
8. 사용자가 보고서 정리를 명시하지 않은 질문성 입력이면 보고서 수정보다 답변을 우선한다.
9. 갈피를 잃지 않도록 매 응답은 가능하면 "답변", "보고서 반영", "다음 확인 질문" 순서로 짧게 구성한다.
10. 상황 묘사가 부족하면 추상 질문 대신 장면을 복원하는 질문을 한다: 시간, 장소, 참여자 위치, 말한 문장, 행동 순서, 주변 목격자, 직후 반응, 남은 기록.
11. 보고서에는 사용자가 한 말을 그대로 요약하지 말고, 사건 장면이 떠오르도록 구체적 행위와 맥락을 재구성한다.
12. 확정 사실과 추정/주장/미확인 정보를 섞지 말고 각각 분리한다.
13. "강력한 자료"는 녹취/문자/카톡/메일/사진/영상/출입기록/목격자/진료기록/민원 접수 내역/업무 지시 내역처럼 유형별로 제안한다.
14. 사용자가 거칠게 입력한 표현은 제출 가능한 문장으로 정제하되, 말하지 않은 사실을 지어내지 않는다.
15. 확인되지 않은 내용은 삭제하지 말고 "확인 필요"로 남긴다.
16. 보고서는 반드시 다음 구조를 우선한다:
   - 사건 핵심 요약
   - 당사자 및 역할표
   - 시간순 경위
   - 주요 장면별 상세 묘사
   - 인물별 행위와 책임 구조
   - 증거 목록 및 입증하려는 사실
   - 부족한 정보와 추가 질문
   - 다음 대응 체크리스트
   - 제출 전 검토 메모
17. 각 섹션은 짧은 제목과 불릿을 사용해 제출용 문서처럼 읽히게 작성한다.
`.trim();

const dom = {
  authPanel: document.querySelector('[data-auth-panel]'),
  userPanel: document.querySelector('[data-user-panel]'),
  authMessage: document.querySelector('[data-auth-message]'),
  serviceStatus: document.querySelector('[data-service-status]'),
  authOpen: document.querySelector('[data-auth-open]'),
  authBackdrop: document.querySelector('[data-auth-backdrop]'),
  authModal: document.querySelector('[data-auth-modal]'),
  authClose: document.querySelector('[data-auth-close]'),
  authModeButtons: document.querySelectorAll('[data-auth-mode]'),
  emailAuthForm: document.querySelector('[data-email-auth-form]'),
  authEmail: document.querySelector('[data-auth-email]'),
  authPassword: document.querySelector('[data-auth-password]'),
  authPasswordConfirm: document.querySelector('[data-auth-password-confirm]'),
  passwordMatchMessage: document.querySelector('[data-password-match-message]'),
  authTerms: document.querySelector('[data-auth-terms]'),
  authSubmit: document.querySelector('[data-auth-submit]'),
  authLegalOpenButtons: document.querySelectorAll('[data-auth-legal-open]'),
  authLegalBackdrop: document.querySelector('[data-auth-legal-backdrop]'),
  authLegalModal: document.querySelector('[data-auth-legal-modal]'),
  authLegalTitle: document.querySelector('[data-auth-legal-title]'),
  authLegalContent: document.querySelector('[data-auth-legal-content]'),
  authLegalClose: document.querySelector('[data-auth-legal-close]'),
  authResend: document.querySelector('[data-auth-resend]'),
  signInGoogle: document.querySelector('[data-sign-in-google]'),
  signOut: document.querySelector('[data-sign-out]'),
  userEmail: document.querySelector('[data-user-email]'),
  newConversation: document.querySelector('[data-new-conversation]'),
  conversationList: document.querySelector('[data-conversation-list]'),
  activeProduct: document.querySelector('[data-active-product]'),
  activeTitle: document.querySelector('[data-active-title]'),
  messageList: document.querySelector('[data-message-list]'),
  form: document.querySelector('[data-chat-form]'),
  input: document.querySelector('[data-chat-input]'),
  generateReport: document.querySelector('[data-generate-report]'),
  reportPreview: document.querySelector('[data-report-preview]'),
  saveCaseButtons: document.querySelectorAll('[data-save-case]'),
  licenseName: document.querySelector('[data-license-name]'),
  licenseLabel: document.querySelector('[data-license-label]'),
  licenseLines: document.querySelectorAll('[data-license-line]'),
  usagePercent: document.querySelector('[data-usage-percent]'),
  usageBar: document.querySelector('[data-usage-bar]'),
  usageCopy: document.querySelector('[data-usage-copy]'),
  composerNote: document.querySelector('[data-composer-note]'),
  menuToggle: document.querySelector('[data-menu-toggle]'),
  topActions: document.querySelector('[data-top-actions]'),
  historyToggle: document.querySelector('[data-history-toggle]'),
  historyClose: document.querySelector('[data-history-close]'),
  historyBackdrop: document.querySelector('[data-history-backdrop]'),
  historyDrawer: document.querySelector('[data-history-drawer]'),
  reportToggle: document.querySelector('[data-report-toggle]'),
  reportClose: document.querySelector('[data-report-close]'),
  reportBackdrop: document.querySelector('[data-report-backdrop]'),
  licenseOpenButtons: document.querySelectorAll('[data-license-open]'),
  licenseBackdrop: document.querySelector('[data-license-backdrop]'),
  licenseModal: document.querySelector('[data-license-modal]'),
  licenseClose: document.querySelector('[data-license-close]'),
};

const tierConfig = {
  unauth: {
    label: '비로그인',
    license: '대화 불가',
    limit: 0,
    rank: 0,
    tone: 'locked',
  },
  general: {
    label: '일반 사용자',
    license: 'GENERAL',
    limit: 20,
    rank: 1,
    tone: 'general',
  },
  teacher: {
    label: 'TEACHER',
    license: 'TEACHER',
    limit: 150,
    rank: 2,
    tone: 'teacher',
  },
  pro: {
    label: 'PRO',
    license: 'PRO',
    limit: 500,
    rank: 3,
    tone: 'pro',
  },
};

let supabase = null;
let session = null;
let lastKnownSession = null;
let conversations = [];
let activeConversation = null;
let messages = [];
let isSending = false;
let usageState = {
  tier: 'unauth',
  used: 0,
  limit: 0,
  period: '',
};
let authMode = 'login';
let lastVerificationEmail = '';

function setAuthMessage(message, isError = false) {
  if (!dom.authMessage) return;
  dom.authMessage.textContent = message;
  dom.authMessage.style.color = isError ? '#b42318' : '#667085';
}

function setAuthResendVisible(isVisible, email = '') {
  if (!dom.authResend) return;
  if (email) lastVerificationEmail = email;
  dom.authResend.hidden = !isVisible;
  dom.authResend.disabled = false;
}

function setPasswordMatchMessage(message = '', status = 'idle') {
  if (!dom.passwordMatchMessage) return;
  dom.passwordMatchMessage.textContent = message;
  dom.passwordMatchMessage.dataset.status = status;
}

function syncPasswordMatchMessage() {
  if (authMode !== 'signup') {
    setPasswordMatchMessage();
    return true;
  }

  const password = dom.authPassword?.value ?? '';
  const passwordConfirm = dom.authPasswordConfirm?.value ?? '';

  if (!password && !passwordConfirm) {
    setPasswordMatchMessage();
    return false;
  }

  if (password.length > 0 && password.length < 8) {
    setPasswordMatchMessage('비밀번호는 8자 이상이어야 합니다.', 'error');
    return false;
  }

  if (!passwordConfirm) {
    setPasswordMatchMessage('비밀번호 확인을 입력해 주세요.', 'idle');
    return false;
  }

  if (password === passwordConfirm) {
    setPasswordMatchMessage('비밀번호가 일치합니다.', 'success');
    return true;
  }

  setPasswordMatchMessage('비밀번호가 일치하지 않습니다.', 'error');
  return false;
}

function isEmailNotConfirmedMessage(message) {
  return /email not confirmed|email_not_confirmed|not confirmed|not_confirmed/i.test(String(message ?? ''));
}

function friendlyAuthError(error, mode = authMode) {
  const message = String(error?.message ?? error ?? '');

  if (/already registered|already exists|user already/i.test(message)) {
    return '이미 가입된 이메일입니다. 로그인 탭에서 이메일과 비밀번호로 로그인해 주세요.';
  }

  if (isEmailNotConfirmedMessage(message)) {
    return '이메일 인증이 완료되지 않아 로그인할 수 없습니다. 메일함에서 RoosyCozy 또는 Supabase 인증 메일을 먼저 열고 인증 링크를 누른 뒤 다시 로그인해 주세요. 메일이 보이지 않으면 스팸함이나 프로모션함을 확인하거나 아래에서 다시 보낼 수 있습니다.';
  }

  if (/invalid login credentials|invalid credentials|email.*password|password.*email/i.test(message)) {
    return mode === 'login'
      ? '이메일(아이디) 또는 비밀번호가 맞지 않습니다. 입력한 이메일 주소와 비밀번호를 다시 확인해 주세요. 가입 직후 아직 인증하지 않았다면 메일함에서 인증을 먼저 진행해 주세요.'
      : '이미 가입된 이메일이거나 비밀번호를 확인할 수 없습니다. 로그인 탭에서 다시 시도해 주세요.';
  }

  if (/password/i.test(message) && /weak|short|length/i.test(message)) {
    return '비밀번호는 8자 이상으로 입력해 주세요.';
  }

  if (/rate limit|too many/i.test(message)) {
    return '요청이 잠시 많습니다. 잠깐 뒤 다시 시도해 주세요.';
  }

  if (/signup.*disabled|signups.*not.*allowed|email.*provider.*disabled|email.*logins.*disabled/i.test(message)) {
    return 'Supabase 이메일 로그인 또는 회원가입 설정이 꺼져 있습니다. Authentication > Providers > Email 설정을 확인해 주세요.';
  }

  if (/fetch|network|failed/i.test(message)) {
    return '네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }

  return message || '인증 처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요.';
}

function isExistingEmailSignUp(data) {
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}

function isUnconfirmedEmailUser(user) {
  if (!user) return false;
  const providers = [
    user.app_metadata?.provider,
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
  ].filter(Boolean);
  const usesEmailAuth = providers.length === 0 || providers.includes('email');
  return usesEmailAuth && !user.email_confirmed_at && !user.confirmed_at;
}

function signUpSuccessMessage(email) {
  return `${email}로 인증 메일 발송이 정상 처리되었습니다. 지금 메일함을 열어 RoosyCozy 또는 Supabase 인증 메일의 링크를 눌러 주세요. 인증을 마친 뒤 이 창으로 돌아와 로그인 탭에서 이메일과 비밀번호로 로그인하면 됩니다. 메일이 보이지 않으면 스팸함이나 프로모션함을 확인하고 아래에서 다시 보낼 수 있습니다.`;
}

function setServiceStatus(message, status = 'idle') {
  if (!dom.serviceStatus) return;
  const isError = status === 'error';
  dom.serviceStatus.hidden = !isError;
  dom.serviceStatus.textContent = isError ? message : '';
  dom.serviceStatus.dataset.status = status;
}

function isGoogleOAuthBlockedUserAgent() {
  const ua = navigator.userAgent || '';
  return /NAVER|KAKAOTALK|KAKAOSTORY|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|Twitter|; wv\)/i.test(ua);
}

document.body.dataset.embeddedBrowser = isGoogleOAuthBlockedUserAgent() ? 'true' : 'false';

function syncAuthMode() {
  document.body.dataset.authMode = authMode;
  dom.authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === authMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (dom.authSubmit) {
    dom.authSubmit.textContent = authMode === 'signup'
      ? '인증 메일 보내고 가입'
      : '이메일로 로그인';
  }

  if (dom.authPassword) {
    dom.authPassword.setAttribute('autocomplete', authMode === 'signup' ? 'new-password' : 'current-password');
  }

  syncPasswordMatchMessage();
}

function setAuthMode(nextMode) {
  authMode = nextMode === 'signup' ? 'signup' : 'login';
  setAuthMessage('');
  setAuthResendVisible(false);
  syncAuthMode();
}

function normalizeTier(tier) {
  if (tier === 'pro') return 'pro';
  if (tier === 'teacher' || tier === 'lawyer') return 'teacher';
  if (tier === 'general') return 'general';
  return session?.user ? 'general' : 'unauth';
}

function tierInfo(tier = usageState.tier) {
  return tierConfig[normalizeTier(tier)] ?? tierConfig.unauth;
}

function usagePercentValue(state = usageState) {
  if (!state.limit) return 0;
  return Math.min(100, Math.round((state.used / state.limit) * 100));
}

function canChat() {
  return Boolean(session?.user) && usageState.tier !== 'unauth' && usageState.used < usageState.limit;
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function syncLicenseUi() {
  const info = tierInfo();
  const percent = usagePercentValue();
  const used = Math.min(usageState.used, usageState.limit);
  const lineText = usageState.tier === 'unauth'
    ? '비로그인 · 대화 불가 · 0%'
    : `${info.license} · ${used}/${usageState.limit} · ${percent}%`;
  document.body.dataset.licenseTier = usageState.tier;

  if (dom.licenseName) dom.licenseName.textContent = info.label;
  if (dom.licenseLabel) dom.licenseLabel.textContent = info.license;
  dom.licenseLines.forEach((line) => {
    line.textContent = lineText;
  });
  if (dom.usagePercent) dom.usagePercent.textContent = `${percent}%`;
  if (dom.usageBar) dom.usageBar.style.width = `${percent}%`;
  if (dom.usageCopy) {
    dom.usageCopy.textContent = usageState.tier === 'unauth'
      ? '로그인 필요'
      : `${used}/${usageState.limit}회 · 월 사용량`;
  }
}

function syncInteractionState() {
  const chatEnabled = canChat();
  const busy = isSending;
  dom.form.querySelector('button').disabled = !chatEnabled || busy;
  dom.input.disabled = !chatEnabled || busy;
  dom.generateReport.disabled = !chatEnabled || !activeConversation || busy;
  if (dom.historyToggle) {
    dom.historyToggle.disabled = !session?.user;
    dom.historyToggle.textContent = conversations.length ? `기록 ${conversations.length}` : '기록';
  }
  dom.saveCaseButtons.forEach((button) => {
    button.disabled = !session?.user || !activeConversation || activeConversation.isLocal || busy;
  });

  if (!session?.user) {
    dom.input.placeholder = '로그인 후 상담을 시작하세요';
    if (dom.composerNote) dom.composerNote.textContent = '비로그인 사용자는 대화할 수 없습니다. 로그인 후 이용해 주세요.';
    return;
  }

  if (!chatEnabled) {
    dom.input.placeholder = '이번 달 사용량을 모두 사용했습니다';
    if (dom.composerNote) dom.composerNote.textContent = `${tierInfo().label} 월 사용량을 모두 사용했습니다.`;
    return;
  }

  dom.input.placeholder = '상황을 적거나 AI 질문에 답변하세요';
  if (dom.composerNote) dom.composerNote.textContent = `${tierInfo().label} · ${usageState.limit - usageState.used}회 남음`;
}

function applyUsageState(nextUsage = {}) {
  const tier = normalizeTier(nextUsage.tier);
  const info = tierInfo(tier);
  usageState = {
    tier,
    used: Number(nextUsage.used_messages ?? nextUsage.used_points ?? nextUsage.used ?? usageState.used ?? 0),
    limit: Number(nextUsage.limit_messages ?? nextUsage.limit_points ?? nextUsage.limit ?? info.limit),
    period: String(nextUsage.period ?? usageState.period ?? ''),
  };

  syncLicenseUi();
  syncInteractionState();
}

function ensureClient() {
  if (!isSupabaseConfigured) {
    setAuthMessage('서비스 연결 설정을 확인해주세요.', true);
    setServiceStatus('서비스 설정 필요', 'error');
    dom.form?.querySelector('button')?.setAttribute('disabled', 'true');
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    document.body.dataset.supabaseClientReady = 'true';
    setServiceStatus('계정 연결 준비 완료', 'ready');
  }

  return supabase;
}

async function restoreSessionIfAvailable(loadData = false) {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error || !data?.session?.user) return null;

  lastKnownSession = data.session;
  applySession(data.session);

  if (loadData) {
    await loadUsage();
    await loadConversations();
  }

  return data.session;
}

async function handleAuthStateChange(event, nextSession) {
  if (nextSession?.user) {
    lastKnownSession = nextSession;
    applySession(nextSession);
    await loadUsage();
    await loadConversations();
    return;
  }

  if (event === 'SIGNED_OUT') {
    lastKnownSession = null;
    applySession(null);
    return;
  }

  const recoveredSession = await restoreSessionIfAvailable(true);
  if (!recoveredSession && !lastKnownSession) {
    applySession(null);
  }
}

function getRedirectUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.delete('code');
  return url.toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function reportInlineHtml(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<span class="report-emphasis">$1</span>');
}

function splitMarkdownTableRow(line) {
  return String(line)
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownTableRow(line) {
  const text = String(line || '').trim();
  return text.startsWith('|') && text.includes('|') && splitMarkdownTableRow(text).length >= 2;
}

function isMarkdownTableSeparator(line) {
  if (!isMarkdownTableRow(line)) return false;
  return splitMarkdownTableRow(line).every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, '')));
}

function markdownToHtml(markdown) {
  const source = String(markdown || '').trim();

  if (!source) {
    return `
      <header class="report-cover">
        <span>RoosyCozy Case Report</span>
        <h2>사건보고서 작성 대기</h2>
        <p>AI가 문답을 통해 장면, 인물, 행위, 증거를 구체화하고 제출용 보고서 구조로 정리합니다.</p>
      </header>
      <div class="report-meta">
        <span>장면 묘사 강화</span>
        <span>역할 분류</span>
        <span>증거 체크</span>
      </div>
      <section class="report-section report-placeholder">
        <h2>작성 예정 구조</h2>
        <ul>
          <li>사건 핵심 요약과 시간순 경위</li>
          <li>피해자, 주가해자, 참여자, 방관자, 목격자 등 역할 분류</li>
          <li>주요 장면별 상세 묘사와 구체적 발언·행동</li>
          <li>증거 목록, 부족한 정보, 다음 대응 체크리스트</li>
        </ul>
      </section>
    `;
  }

  const lines = source.split('\n');
  let title = '사건보고서';
  const sections = [];
  let currentSection = null;
  let paragraph = [];
  let list = [];
  let table = [];

  function ensureSection() {
    if (!currentSection) {
      currentSection = { title: '요약', level: 2, blocks: [] };
      sections.push(currentSection);
    }
    return currentSection;
  }

  function flushParagraph() {
    if (!paragraph.length) return;
    ensureSection().blocks.push({
      type: 'paragraph',
      lines: [...paragraph],
    });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    ensureSection().blocks.push({
      type: 'list',
      items: [...list],
    });
    list = [];
  }

  function flushTable() {
    if (!table.length) return;
    ensureSection().blocks.push({
      type: 'table',
      rows: [...table],
    });
    table = [];
  }

  function startSection(nextTitle, level = 2) {
    flushParagraph();
    flushList();
    flushTable();
    currentSection = { title: nextTitle, level, blocks: [] };
    sections.push(currentSection);
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      return;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      flushTable();
      title = line.slice(2).trim() || title;
      return;
    }

    if (line.startsWith('## ')) {
      startSection(line.slice(3).trim(), 2);
      return;
    }

    if (line.startsWith('### ')) {
      startSection(line.slice(4).trim(), 3);
      return;
    }

    if (/^\d+\.\s+\S/.test(line) && line.length <= 42 && !/[.:]$/.test(line)) {
      startSection(line, 2);
      return;
    }

    if (isMarkdownTableRow(line)) {
      flushParagraph();
      flushList();
      if (!isMarkdownTableSeparator(line)) {
        table.push(splitMarkdownTableRow(line));
      }
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      flushTable();
      list.push(line.replace(/^[-*]\s+/, ''));
      return;
    }

    flushList();
    flushTable();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  flushTable();

  const body = sections
    .filter((section) => section.title || section.blocks.length)
    .map((section, index) => {
      const heading = section.title
        ? `<h${section.level}>${escapeHtml(section.title)}</h${section.level}>`
        : '';
      const sectionKind = reportSectionKind(section.title);
      const blocks = section.blocks
        .map((block) => {
          if (block.type === 'list') {
            const items = block.items
              .map((item) => `<li>${reportInlineHtml(item)}</li>`)
              .join('');
            return `<ul>${items}</ul>`;
          }

          if (block.type === 'table') {
            const [headRow, ...bodyRows] = block.rows;
            const header = headRow
              .map((cell) => `<th>${reportInlineHtml(cell)}</th>`)
              .join('');
            const rows = bodyRows
              .map((row) => `<tr>${row.map((cell) => `<td>${reportInlineHtml(cell)}</td>`).join('')}</tr>`)
              .join('');

            return `
              <div class="report-table-wrap">
                <table class="report-table">
                  <thead><tr>${header}</tr></thead>
                  <tbody>${rows || `<tr>${headRow.map(() => '<td></td>').join('')}</tr>`}</tbody>
                </table>
              </div>
            `;
          }

          return `<p>${block.lines.map(reportInlineHtml).join('<br>')}</p>`;
        })
        .join('');

      return `<section class="report-section ${sectionKind}" data-section-index="${index + 1}">${heading}${blocks}</section>`;
    })
    .join('');

  return `
    <header class="report-cover">
      <span>RoosyCozy Case Report</span>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <div class="report-meta">
      <span>문답 기반 정리</span>
      <span>검토 필요</span>
    </div>
    ${body || '<section class="report-section"><p>보고서 내용을 정리하고 있습니다.</p></section>'}
  `;
}

function reportSectionKind(title = '') {
  const text = String(title);

  if (/요약|개요|핵심/.test(text)) return 'is-summary';
  if (/당사자|역할|인물|가해|피해|방관|목격/.test(text)) return 'is-people';
  if (/시간|경위|일시|순서|타임라인/.test(text)) return 'is-timeline';
  if (/장면|상황|묘사|발언|행동/.test(text)) return 'is-scene';
  if (/증거|자료|기록|입증/.test(text)) return 'is-evidence';
  if (/부족|확인|질문|불확실/.test(text)) return 'is-gap';
  if (/대응|조치|체크|다음/.test(text)) return 'is-action';

  return 'is-general';
}

function productLabel(product) {
  return '통합 상담';
}

function classifyChatIntent(message, forceReport = false) {
  const text = String(message || '').trim();

  if (forceReport) return 'report_command';
  if (!text) return 'empty';

  const asksQuestion = /[?？]|뭐|무엇|어떻게|어떤|왜|가능|필요|더|강력|증거|대응|해야|할까|하나요|있나요|알려|추천|방법|조언/.test(text);
  const reportCommand = /보고서|정리|작성|갱신|업데이트|반영|문서화|초안/.test(text);
  const factSignal = /했다|했어|합니다|왔|말했|보냈|때렸|욕|협박|방관|참여|가해|피해|목격|증거|녹취|문자|카톡|메일|날짜|장소|이름|관계/.test(text);

  if (reportCommand) return 'report_command';
  if (asksQuestion && factSignal) return 'mixed_question_with_facts';
  if (asksQuestion) return 'direct_question';
  return 'fact_update';
}

function shouldUpdateReportFromMessage(intent, forceReport = false) {
  if (forceReport) return true;
  return ['report_command', 'fact_update', 'mixed_question_with_facts'].includes(intent);
}

function chatRequestPolicy(intent, shouldUpdateReport) {
  return {
    intent,
    shouldUpdateReport,
    answerFirst: intent === 'direct_question' || intent === 'mixed_question_with_facts',
    reportPolicy: shouldUpdateReport
      ? 'update_report_after_answering_if_needed'
      : 'answer_question_without_rewriting_report_unless_new_facts_are_present',
    requiredReportSections: [
      '사건 핵심 요약',
      '당사자 및 역할표',
      '시간순 경위',
      '주요 장면별 상세 묘사',
      '인물별 행위와 책임 구조',
      '증거 목록 및 입증하려는 사실',
      '부족한 정보와 추가 질문',
      '다음 대응 체크리스트',
    ],
  };
}

function applySession(nextSession) {
  session = nextSession;
  const signedIn = Boolean(session?.user);

  dom.authPanel.classList.toggle('is-hidden', signedIn);
  dom.userPanel.classList.toggle('is-hidden', !signedIn);
  dom.userEmail.textContent = session?.user?.email ?? '';

  if (!signedIn) {
    conversations = [];
    activeConversation = null;
    messages = [];
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
  } else if (usageState.tier === 'unauth') {
    applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }

  syncInteractionState();
  renderAll();
}

function renderConversations() {
  dom.conversationList.innerHTML = '';

  if (!session?.user) {
    dom.conversationList.innerHTML = '<p class="case-list-empty">로그인 후 저장된 상담이 표시됩니다.</p>';
    return;
  }

  if (!conversations.length) {
    dom.conversationList.innerHTML = '<p class="case-list-empty">아직 저장된 상담이 없습니다.</p>';
    return;
  }

  conversations.forEach((conversation) => {
    const item = document.createElement('article');
    item.className = 'case-history-item';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = `case-history-open${conversation.id === activeConversation?.id ? ' is-active' : ''}`;
    openButton.innerHTML = `
      <strong>${escapeHtml(conversation.title || '새 사건')}</strong>
      <span>${escapeHtml(productLabel(conversation.product))} · ${new Date(conversation.updated_at).toLocaleDateString('ko-KR')}</span>
    `;
    openButton.addEventListener('click', () => selectConversation(conversation.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'case-history-delete';
    deleteButton.textContent = '삭제';
    deleteButton.setAttribute('aria-label', `${conversation.title || '새 사건'} 삭제`);
    deleteButton.addEventListener('click', () => deleteConversation(conversation.id));

    item.append(openButton, deleteButton);
    dom.conversationList.append(item);
  });
}

function renderMessages() {
  dom.messageList.innerHTML = '';

  if (!activeConversation) {
    dom.messageList.innerHTML = `
      <article class="case-empty-state">
        <h3>무슨 일이 있었나요?</h3>
        <p>짧게 시작해도 괜찮습니다. AI가 다음 질문으로 사건보고서를 완성해갑니다.</p>
      </article>
    `;
    return;
  }

  messages.forEach((message) => {
    const article = document.createElement('article');
    article.className = `case-message ${message.role === 'user' ? 'user' : 'assistant'}`;
    const role = message.role === 'user' ? '나' : 'RoosyCozy';
    article.innerHTML = `
      <span class="case-message-role">${role}</span>
      <p>${escapeHtml(message.content)}</p>
    `;
    dom.messageList.append(article);
  });

  if (isSending) {
    const loading = document.createElement('article');
    loading.className = 'case-message assistant is-loading';
    loading.innerHTML = `
      <span class="case-message-role">RoosyCozy</span>
      <div class="case-loading-line">
        <i></i><i></i><i></i>
        <strong>답변과 사건 맥락을 정리하고 있습니다</strong>
      </div>
    `;
    dom.messageList.append(loading);
  }

  scrollChatToBottom();
}

function scrollChatToBottom(behavior = 'auto') {
  if (!dom.messageList) return;

  requestAnimationFrame(() => {
    dom.messageList.scrollTo({
      top: dom.messageList.scrollHeight,
      behavior,
    });
  });
}

function renderReport() {
  dom.activeProduct.textContent = activeConversation ? productLabel(activeConversation.product) : 'AI 상담 에이전트';
  dom.activeTitle.textContent = activeConversation?.title || '무슨 일이 있었나요?';
  dom.reportPreview.innerHTML = markdownToHtml(activeConversation?.report_markdown);
  syncInteractionState();
}

function renderAll() {
  renderConversations();
  renderMessages();
  renderReport();
}

async function loadConversations() {
  if (!session?.user || !supabase) return;

  const { data, error } = await supabase
    .from('report_conversations')
    .select('id, user_id, product, title, status, report_markdown, saved_at, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  conversations = data ?? [];
  activeConversation = conversations[0] ?? null;
  await loadMessages();
  renderAll();
}

async function loadUsage() {
  if (!session?.user || !supabase) {
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  const { data: usageData, error: usageError } = await supabase.rpc('get_my_report_usage');

  if (!usageError && usageData) {
    applyUsageState(usageData);
    return;
  }

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('tier')
    .eq('user_id', session.user.id)
    .maybeSingle();
  const tier = normalizeTier(membership?.tier);
  applyUsageState({ tier, used: 0, limit: tierInfo(tier).limit });
}

async function loadMessages() {
  if (!activeConversation || !supabase) {
    messages = [];
    return;
  }

  const { data, error } = await supabase
    .from('report_messages')
    .select('id, conversation_id, role, content, created_at')
    .eq('conversation_id', activeConversation.id)
    .order('created_at', { ascending: true });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  messages = data ?? [];
}

async function selectConversation(id) {
  activeConversation = conversations.find((conversation) => conversation.id === id) ?? null;
  await loadMessages();
  setHistoryOpen(false);
  renderAll();
}

function ensureLocalConversation(message) {
  if (activeConversation) return;
  const now = new Date().toISOString();
  activeConversation = {
    id: `local-${Date.now()}`,
    isLocal: true,
    product: 'pro',
    title: message.trim().slice(0, 34) || '새 상담',
    status: 'draft',
    report_markdown: '',
    created_at: now,
    updated_at: now,
  };
}

async function invokeChat({ message = '', forceReport = false } = {}) {
  const activeSession = session?.user ? session : await restoreSessionIfAvailable(true);

  if (!activeSession?.user) {
    setServiceStatus('로그인 후 대화할 수 있습니다.', 'error');
    return;
  }

  if (!canChat()) {
    setServiceStatus('현재 라이선스의 월 사용량을 모두 사용했습니다.', 'error');
    syncInteractionState();
    return;
  }

  if (!supabase) return;
  if (!message.trim() && !forceReport) return;

  const trimmedMessage = message.trim();
  const chatIntent = classifyChatIntent(trimmedMessage, forceReport);
  const shouldUpdateReport = shouldUpdateReportFromMessage(chatIntent, forceReport);
  const requestPolicy = chatRequestPolicy(chatIntent, shouldUpdateReport);

  if (trimmedMessage) {
    ensureLocalConversation(trimmedMessage);
    messages = [
      ...messages,
      {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: trimmedMessage,
        created_at: new Date().toISOString(),
      },
    ];
  }

  isSending = true;
  document.body.dataset.busy = 'true';
  syncInteractionState();
  renderAll();

  try {
    const timeoutMs = shouldUpdateReport ? 70000 : 42000;
    const { data, error } = await withTimeout(
      supabase.functions.invoke('report-chat', {
        body: {
          conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
          product: activeConversation?.product ?? 'pro',
          message: trimmedMessage,
          forceReport,
          clientIntent: chatIntent,
          clientPolicy: requestPolicy,
          clientGuidance: reportChatBehaviorGuide,
        },
      }),
      timeoutMs,
      shouldUpdateReport
        ? '답변과 보고서 정리가 지연되고 있습니다. 잠시 뒤 다시 시도하거나 더 짧게 나누어 입력해 주세요.'
        : '답변 생성이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.'
    );

    if (error) {
      const context = error.context;

      if (context instanceof Response) {
        const errorBody = await context.clone().json().catch(() => null);
        if (errorBody?.error) throw new Error(errorBody.error);
      }

      throw error;
    }
    if (data?.error) throw new Error(data.error);

    if (data?.conversation) {
      const existingIndex = conversations.findIndex((item) => item.id === data.conversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = data.conversation;
      } else {
        conversations.unshift(data.conversation);
      }

      activeConversation = data.conversation;
    }

    if (data?.usage) {
      applyUsageState(data.usage);
    }

    await loadMessages();
    renderAll();
    setServiceStatus('대화 저장 완료', 'ready');
  } catch (error) {
    const messageText = error instanceof Error ? error.message : '요청에 실패했습니다.';
    messages = [
      ...messages,
      {
        id: `temp-error-${Date.now()}`,
        role: 'assistant',
        content: `연동 오류: ${messageText}`,
        created_at: new Date().toISOString(),
      },
    ];
    setServiceStatus('채팅 함수 연결 확인 필요', 'error');
  } finally {
    isSending = false;
    document.body.dataset.busy = 'false';
    syncInteractionState();
    renderAll();
  }
}

async function signInWithGoogle() {
  if (isGoogleOAuthBlockedUserAgent()) {
    setAuthMode('signup');
    setAuthMessage('네이버나 카카오 같은 앱 안의 브라우저에서는 Google 로그인이 차단될 수 있습니다. 여기서는 이메일로 로그인하거나, Google 계정으로 들어오려면 Chrome 브라우저에서 다시 열어 주세요.', true);
    dom.authEmail?.focus();
    return;
  }

  const client = ensureClient();
  if (!client) return;

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    setAuthMessage(friendlyAuthError(error, 'login'), true);
  }
}

async function submitEmailAuth(event) {
  event.preventDefault();
  const client = ensureClient();
  if (!client) return;
  setAuthResendVisible(false);

  const email = dom.authEmail?.value.trim() ?? '';
  const password = dom.authPassword?.value ?? '';
  const passwordConfirm = dom.authPasswordConfirm?.value ?? '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage('이메일 주소를 정확히 입력해 주세요.', true);
    dom.authEmail?.focus();
    return;
  }

  if (password.length < 8) {
    setAuthMessage('비밀번호는 8자 이상으로 입력해 주세요.', true);
    dom.authPassword?.focus();
    return;
  }

  if (authMode === 'signup') {
    if (!syncPasswordMatchMessage() || password !== passwordConfirm) {
      setAuthMessage('비밀번호 확인이 일치하지 않습니다.', true);
      dom.authPasswordConfirm?.focus();
      return;
    }

    if (!dom.authTerms?.checked) {
      setAuthMessage('개인정보처리방침 및 이용약관에 동의해 주세요.', true);
      dom.authTerms?.focus();
      return;
    }
  }

  const submitButton = dom.authSubmit;
  const idleLabel = submitButton?.textContent ?? '';
  let response;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = authMode === 'signup' ? '가입 처리 중' : '로그인 중';
  }
  setAuthMessage(authMode === 'signup'
    ? '회원가입 요청을 보내고 있습니다.'
    : '이메일과 비밀번호를 확인하고 있습니다.');

  try {
    response = await withTimeout(
      authMode === 'signup'
        ? client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        })
        : client.auth.signInWithPassword({
          email,
          password,
        }),
      15000,
      authMode === 'signup'
        ? '회원가입 응답이 지연되고 있습니다. Supabase Auth의 Email provider와 SMTP 설정을 확인해 주세요.'
        : '이메일 로그인 응답이 지연되고 있습니다. Supabase Auth의 Email provider 설정 또는 네트워크 상태를 확인해 주세요.'
    );
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), true);
    if (isEmailNotConfirmedMessage(error?.message)) {
      setAuthResendVisible(true, email);
    }
    return;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = idleLabel;
    }
  }

  const { data, error } = response;

  if (error) {
    setAuthMessage(friendlyAuthError(error), true);
    if (isEmailNotConfirmedMessage(error?.message)) {
      setAuthResendVisible(true, email);
    }
    return;
  }

  if (data?.session && isUnconfirmedEmailUser(data?.user)) {
    await client.auth.signOut();
    setAuthMode('login');
    setAuthMessage(friendlyAuthError({ message: 'email_not_confirmed' }), true);
    setAuthResendVisible(true, email);
    dom.authPassword.value = '';
    if (dom.authPasswordConfirm) dom.authPasswordConfirm.value = '';
    if (dom.authTerms) dom.authTerms.checked = false;
    return;
  }

  if (authMode === 'signup' && isExistingEmailSignUp(data)) {
    setAuthMode('login');
    setAuthMessage('이미 가입된 이메일입니다. 로그인 탭에서 이메일과 비밀번호로 로그인해 주세요.', true);
    dom.authPassword.value = '';
    dom.authPasswordConfirm.value = '';
    dom.authTerms.checked = false;
    return;
  }

  if (authMode === 'signup' && !data?.session) {
    setAuthMode('login');
    setAuthMessage(signUpSuccessMessage(email));
    setAuthResendVisible(true, email);
    dom.authPassword.value = '';
    dom.authPasswordConfirm.value = '';
    dom.authTerms.checked = false;
    return;
  }

  setAuthMessage('로그인되었습니다.');
  setAuthOpen(false);
}

async function resendVerificationEmail() {
  const client = ensureClient();
  if (!client) return;

  const email = (dom.authEmail?.value.trim() || lastVerificationEmail).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage('인증 메일을 다시 받을 이메일 주소를 입력해 주세요.', true);
    dom.authEmail?.focus();
    return;
  }

  const idleLabel = dom.authResend?.textContent ?? '인증 메일 다시 보내기';

  if (dom.authResend) {
    dom.authResend.disabled = true;
    dom.authResend.textContent = '재전송 중';
  }
  setAuthMessage('인증 메일 재전송을 요청하고 있습니다.');

  let resendResponse;

  try {
    resendResponse = await withTimeout(
      client.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      }),
      15000,
      '인증 메일 재전송 응답이 지연되고 있습니다. Supabase SMTP 설정과 이메일 발송 제한을 확인해 주세요.'
    );
  } catch (error) {
    if (dom.authResend) {
      dom.authResend.disabled = false;
      dom.authResend.textContent = idleLabel;
    }
    setAuthMessage(friendlyAuthError(error), true);
    setAuthResendVisible(true, email);
    return;
  }

  if (dom.authResend) {
    dom.authResend.disabled = false;
    dom.authResend.textContent = idleLabel;
  }

  const { error } = resendResponse;

  if (error) {
    setAuthMessage(friendlyAuthError(error), true);
    setAuthResendVisible(true, email);
    return;
  }

  setAuthMode('login');
  setAuthMessage(signUpSuccessMessage(email));
  setAuthResendVisible(true, email);
}

async function signOut() {
  if (!supabase) return;
  const idleLabel = dom.signOut.textContent;
  dom.signOut.disabled = true;
  dom.signOut.textContent = '나가는 중';
  setHistoryOpen(false);
  try {
    await supabase.auth.signOut();
  } finally {
    dom.signOut.disabled = false;
    dom.signOut.textContent = idleLabel;
  }
}

async function saveCaseSet() {
  if (!supabase || !session?.user || !activeConversation || activeConversation.isLocal) {
    setServiceStatus('저장할 상담이 없습니다.', 'error');
    return;
  }

  const savedAt = new Date().toISOString();
  dom.saveCaseButtons.forEach((button) => {
    button.disabled = true;
    button.textContent = '저장 중';
  });

  const { data, error } = await supabase
    .from('report_conversations')
    .update({
      saved_at: savedAt,
      status: activeConversation.status ?? 'draft',
    })
    .eq('id', activeConversation.id)
    .select('id, user_id, product, title, status, report_markdown, saved_at, created_at, updated_at')
    .single();

  if (error) {
    setServiceStatus(error.message, 'error');
  } else {
    activeConversation = data;
    conversations = conversations.map((conversation) => (
      conversation.id === data.id ? data : conversation
    ));
    setServiceStatus('보고서와 대화셋 저장 완료', 'ready');
    renderAll();
  }

  dom.saveCaseButtons.forEach((button) => {
    button.textContent = button.dataset.idleLabel || '저장';
  });
  syncInteractionState();
}

async function deleteConversation(id) {
  if (!supabase || !session?.user) return;

  const target = conversations.find((conversation) => conversation.id === id);
  if (!target) return;

  const ok = window.confirm(`'${target.title || '새 상담'}' 기록을 삭제할까요?`);
  if (!ok) return;

  const { error } = await supabase
    .from('report_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    setServiceStatus(error.message, 'error');
    return;
  }

  conversations = conversations.filter((conversation) => conversation.id !== id);

  if (activeConversation?.id === id) {
    activeConversation = conversations[0] ?? null;
    await loadMessages();
  }

  renderAll();
}

function setAuthOpen(isOpen) {
  if (!dom.authModal || !dom.authBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setHistoryOpen(false);
    setReportOpen(false);
    setLicenseOpen(false);
    setAuthLegalOpen(false);
    setAuthMode('login');
    if (isGoogleOAuthBlockedUserAgent()) {
      setAuthMode('signup');
      setAuthMessage('네이버나 카카오 같은 앱 안의 브라우저에서는 이메일 로그인만 사용할 수 있습니다. Google 계정으로 들어오려면 Chrome 브라우저에서 다시 열어 주세요.');
    }
  } else {
    setAuthLegalOpen(false);
  }

  document.body.classList.toggle('is-auth-open', isOpen);
  dom.authModal.hidden = false;
  dom.authBackdrop.hidden = !isOpen;
  dom.authModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

  if (isOpen) {
    setTimeout(() => {
      dom.authEmail?.focus();
    }, 60);
    return;
  }

  setTimeout(() => {
    if (!document.body.classList.contains('is-auth-open')) {
      setAuthLegalOpen(false);
      dom.authModal.hidden = true;
    }
  }, 180);
}

function setMenuOpen(isOpen) {
  if (!dom.menuToggle) return;
  if (isOpen) {
    setReportOpen(false);
    setHistoryOpen(false);
    setLicenseOpen(false);
    setAuthOpen(false);
  }
  document.body.classList.toggle('is-menu-open', isOpen);
  dom.menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  dom.menuToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
}

function setHistoryOpen(isOpen) {
  if (!dom.historyDrawer || !dom.historyBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setReportOpen(false);
    setLicenseOpen(false);
    setAuthOpen(false);
  }
  document.body.classList.toggle('is-history-open', isOpen);
  dom.historyDrawer.hidden = false;
  dom.historyBackdrop.hidden = !isOpen;
  dom.historyDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (!isOpen) {
    setTimeout(() => {
      if (!document.body.classList.contains('is-history-open')) {
        dom.historyDrawer.hidden = true;
      }
    }, 180);
  }
}

function setLicenseOpen(isOpen) {
  if (!dom.licenseModal || !dom.licenseBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setHistoryOpen(false);
    setReportOpen(false);
    setAuthOpen(false);
  }

  document.body.classList.toggle('is-license-open', isOpen);
  dom.licenseModal.hidden = false;
  dom.licenseBackdrop.hidden = !isOpen;
  dom.licenseModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

  if (isOpen) return;

  setTimeout(() => {
    if (!document.body.classList.contains('is-license-open')) {
      dom.licenseModal.hidden = true;
    }
  }, 180);
}

function authLegalSource(kind) {
  const targetLabel = kind === 'terms' ? '이용약관' : '개인정보처리방침';
  const legalDetails = [...document.querySelectorAll('.case-legal-block details')];
  const target = legalDetails.find((detail) => {
    const label = detail.querySelector('summary')?.textContent ?? '';
    return label.includes(targetLabel);
  });

  return {
    title: targetLabel,
    content: target?.querySelector('.case-legal-content')?.innerHTML ?? '',
  };
}

function setAuthLegalOpen(isOpen, kind = 'terms') {
  if (!dom.authLegalModal || !dom.authLegalBackdrop) return;

  if (isOpen) {
    const source = authLegalSource(kind);
    if (!source.content) return;

    if (dom.authLegalTitle) dom.authLegalTitle.textContent = source.title;
    if (dom.authLegalContent) {
      dom.authLegalContent.innerHTML = source.content;
      dom.authLegalContent.scrollTop = 0;
    }

    document.body.classList.add('is-auth-legal-open');
    dom.authLegalModal.hidden = false;
    dom.authLegalBackdrop.hidden = false;
    dom.authLegalModal.setAttribute('aria-hidden', 'false');

    setTimeout(() => dom.authLegalClose?.focus(), 60);
    return;
  }

  document.body.classList.remove('is-auth-legal-open');
  dom.authLegalBackdrop.hidden = true;
  dom.authLegalModal.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    if (!document.body.classList.contains('is-auth-legal-open')) {
      dom.authLegalModal.hidden = true;
      if (dom.authLegalContent) dom.authLegalContent.innerHTML = '';
    }
  }, 180);
}

function openLegalFromAuth(kind) {
  setAuthLegalOpen(true, kind);
}

function setReportOpen(isOpen) {
  if (!dom.reportToggle || !dom.reportBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setHistoryOpen(false);
    setLicenseOpen(false);
    setAuthOpen(false);
  }
  document.body.classList.toggle('is-report-open', isOpen);
  dom.reportBackdrop.hidden = !isOpen;
  dom.reportToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  dom.reportToggle.setAttribute('aria-label', isOpen ? '사건보고서 닫기' : '사건보고서 열기');
}

function resizeComposer() {
  dom.input.style.height = 'auto';
  dom.input.style.height = `${Math.min(dom.input.scrollHeight, 168)}px`;
}

async function boot() {
  const client = ensureClient();
  renderAll();

  if (!client) return;

  const { data } = await client.auth.getSession();
  lastKnownSession = data.session ?? null;
  applySession(data.session);

  if (data.session?.user) {
    await loadUsage();
    await loadConversations();
  } else {
    await loadUsage();
  }

  client.auth.onAuthStateChange(async (event, nextSession) => {
    await handleAuthStateChange(event, nextSession);
  });

  const draftPrompt = sessionStorage.getItem('roosycozyDraftPrompt');

  if (draftPrompt) {
    dom.input.value = draftPrompt;
    resizeComposer();
    sessionStorage.removeItem('roosycozyDraftPrompt');
  }
}

dom.signInGoogle?.addEventListener('click', signInWithGoogle);
dom.authOpen?.addEventListener('click', () => {
  setAuthOpen(true);
});
dom.authClose?.addEventListener('click', () => {
  setAuthOpen(false);
});
dom.authBackdrop?.addEventListener('click', () => {
  setAuthOpen(false);
});
dom.authModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setAuthMode(button.dataset.authMode);
  });
});
dom.emailAuthForm?.addEventListener('submit', submitEmailAuth);
dom.authResend?.addEventListener('click', resendVerificationEmail);
dom.authPassword?.addEventListener('input', syncPasswordMatchMessage);
dom.authPasswordConfirm?.addEventListener('input', syncPasswordMatchMessage);
dom.authLegalOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openLegalFromAuth(button.dataset.authLegalOpen);
  });
});
dom.authLegalClose?.addEventListener('click', () => {
  setAuthLegalOpen(false);
});
dom.authLegalBackdrop?.addEventListener('click', () => {
  setAuthLegalOpen(false);
});
dom.signOut.addEventListener('click', signOut);
dom.saveCaseButtons.forEach((button) => {
  button.addEventListener('click', saveCaseSet);
});

dom.menuToggle?.addEventListener('click', () => {
  setMenuOpen(!document.body.classList.contains('is-menu-open'));
});

dom.reportToggle?.addEventListener('click', () => {
  setReportOpen(!document.body.classList.contains('is-report-open'));
});

dom.reportClose?.addEventListener('click', () => {
  setReportOpen(false);
});

dom.reportBackdrop?.addEventListener('click', () => {
  setReportOpen(false);
});

dom.licenseOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setLicenseOpen(true);
  });
});

dom.licenseClose?.addEventListener('click', () => {
  setLicenseOpen(false);
});

dom.licenseBackdrop?.addEventListener('click', () => {
  setLicenseOpen(false);
});

dom.historyToggle?.addEventListener('click', () => {
  setMenuOpen(false);
  setHistoryOpen(true);
});

dom.historyClose?.addEventListener('click', () => {
  setHistoryOpen(false);
});

dom.historyBackdrop?.addEventListener('click', () => {
  setHistoryOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (document.body.classList.contains('is-auth-legal-open')) {
    setAuthLegalOpen(false);
    return;
  }
  setMenuOpen(false);
  setHistoryOpen(false);
  setReportOpen(false);
  setLicenseOpen(false);
  setAuthOpen(false);
});

dom.newConversation.addEventListener('click', () => {
  activeConversation = null;
  messages = [];
  setMenuOpen(false);
  setHistoryOpen(false);
  setReportOpen(false);
  setLicenseOpen(false);
  setAuthOpen(false);
  renderAll();
  dom.input.focus();
});

dom.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = dom.input.value.trim();
  if (!message) return;

  if (!session?.user || !canChat()) {
    await invokeChat({ message });
    return;
  }

  dom.input.value = '';
  resizeComposer();
  await invokeChat({ message });
});

dom.input.addEventListener('input', resizeComposer);

dom.input.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  dom.form.requestSubmit();
});

dom.generateReport.addEventListener('click', () => {
  invokeChat({ forceReport: true });
});

boot();
