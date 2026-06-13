import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const config = window.ROOSYCOZY_SUPABASE ?? {};
const supabaseUrl = config.url ?? '';
const supabasePublishableKey = config.publishableKey ?? '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

document.body.dataset.supabaseConfigured = isSupabaseConfigured ? 'true' : 'false';

const desktopOnlyMedia = window.matchMedia('(max-width: 900px), (pointer: coarse)');

function syncDesktopOnlyMode() {
  document.body.dataset.desktopOnlyBlocked = desktopOnlyMedia.matches ? 'true' : 'false';
}

syncDesktopOnlyMode();
desktopOnlyMedia.addEventListener?.('change', syncDesktopOnlyMode);

const reportChatBehaviorGuide = `
RoosyCozy 지능형 수사지원 에이전트 응답 원칙:
1. 이 서비스는 AI가 최종 판단을 대신하는 도구가 아니라, 사용자가 입력한 자료와 관계 그래프를 확인 가능한 형태로 분해하고 재구성하는 수사지원 보조도구다.
2. 증거는 자료의 일관성, 원본·형식, 행위와의 연결 맥락으로 나누어 정리한다.
3. 사용자가 사건을 입력하면 단순 요약이 아니라 사건 접수표와 사안 보고서 형식으로 접수·정리한다.
4. 보고서에는 사건 구조, 관련 주체, 주장 대립축, 핵심 쟁점, 인물 노드·관계선, 자료 일관성, 원본·형식 확인, 행위 맥락 연결, AI 정리근거, 사용자 확인 지점을 동적으로 재구성한다.
5. 사용자가 질문하면 먼저 직접 답하고, 그 다음 브리프에 반영할 사실·주장·추정·AI 정리·사용자 확인 필요 지점을 구분한다.
6. 사실, 주장, 추정, 리스크, 시뮬레이션, AI 정리근거를 섞지 않는다. 확인되지 않은 내용은 반드시 "확인 필요"로 남긴다.
7. 시뮬레이션은 예언처럼 단정하지 말고, 가능한 경로와 조건을 나눈다: 상대 반응, 자료 보강, 협의/신고/분쟁 절차 전개, 평판·시간·비용 리스크.
8. 관련 주체는 역할을 분리한다: 직접 행위자, 관여 가능 주체, 방조·방관으로 보일 수 있는 주체, 관리·감독 위치의 주체, 의사결정 주체, 기관/플랫폼, AI 분석 개입 지점, 역할 불명.
9. 각 인물 또는 주체마다 이해관계, 확인된 행위, 보유 증거, 자료 일관성, 원본·형식 확인, 행위 맥락 연결, AI 추론, 불확실성, 사용자 확인 질문을 구분한다.
10. "무엇이 강한가", "누가 관련 주체인가", "AI가 왜 이렇게 정리했나", "최종 확인은 무엇인가"에는 근거와 한계를 함께 답한다.
11. 다음 질문은 한 번에 하나만 한다. 다만 브리프 안에서는 쟁점과 체크리스트를 풍성하게 제공한다.
12. 보고서는 고정 양식이 아니라 사건별로 달라지는 문서다. 기본 골격은 유지하되, 필요한 경우 관계 구조, 증거 연결도, 반박 시나리오, 제출 전 확인 문안, 판단보류 메모를 추가한다.
13. 사건 평면의 관계 그래프는 보고서 안에서 "관계 구조", "자료 일관성", "행위 맥락 연결", "AI 정리근거"로 흡수한다. 화면 오른쪽 자체를 설명하지 않는다.
14. 법률·행정·형사책임 판단을 단정하지 않는다. 전문 판단이 필요한 대목은 "전문가 검토 필요" 또는 "사용자 최종 확인 필요"로 표시한다.
`.trim();

const dom = {
  authPanel: document.querySelector('[data-auth-panel]'),
  userPanel: document.querySelector('[data-user-panel]'),
  authMessage: document.querySelector('[data-auth-message]'),
  serviceStatus: document.querySelector('[data-service-status]'),
  authOpenButtons: document.querySelectorAll('[data-auth-open]'),
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
  guideOpenButtons: document.querySelectorAll('[data-guide-open]'),
  guideBackdrop: document.querySelector('[data-guide-backdrop]'),
  guideModal: document.querySelector('[data-guide-modal]'),
  guideClose: document.querySelector('[data-guide-close]'),
  evidenceInput: document.querySelector('[data-evidence-input]'),
  evidenceList: document.querySelector('[data-evidence-list]'),
  evidenceStatus: document.querySelector('[data-evidence-status]'),
  evidenceDropzone: document.querySelector('[data-evidence-dropzone]'),
  evidenceAnalyze: document.querySelector('[data-evidence-analyze]'),
  graphCanvas: document.querySelector('[data-graph-canvas]'),
  graphNodes: document.querySelector('[data-graph-nodes]'),
  graphLinks: document.querySelector('[data-graph-links]'),
  graphEmpty: document.querySelector('[data-graph-empty]'),
  graphInspector: document.querySelector('[data-graph-inspector]'),
  graphClear: document.querySelector('[data-graph-clear]'),
  graphLinkMode: document.querySelector('[data-graph-link-mode]'),
  accessNote: document.querySelector('[data-access-note]'),
};

const evidenceLimits = {
  maxFiles: 8,
  maxBytes: 30 * 1024 * 1024,
  maxPagesPerFile: 35,
  maxCharsPerFile: 8000,
  maxTotalChars: 22000,
};

const pdfJsConfig = {
  moduleUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs',
  workerUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs',
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
    label: '교원',
    license: 'TEACHER · 학폭·교권침해·악성민원 대응',
    limit: 150,
    rank: 2,
    tone: 'teacher',
  },
  pro: {
    label: '검찰/경찰 (수사기관) 전문 보조용',
    license: 'PRO · 검찰/경찰 (수사기관) 전문 보조용',
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
let evidenceFiles = [];
let pdfJsLoader = null;
let graphState = {
  nodes: [],
  links: [],
  selectedNodeId: null,
  pendingLinkNodeId: null,
  linkMode: true,
  nextNodeNumber: 1,
};
let graphDragState = null;

const graphLayerLabels = {
  core: '핵심',
  support: '주변',
  uncertain: '확인 필요',
};

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

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unwrapPayload(value) {
  if (typeof value === 'string') {
    try {
      return unwrapPayload(JSON.parse(value));
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) return unwrapPayload(value[0] ?? {});
  return value ?? {};
}

function normalizeChatResponse(data) {
  const payload = unwrapPayload(data);

  if (!payload || typeof payload !== 'object') {
    return {
      payload: {},
      conversation: null,
      assistantMessage: '',
      usage: null,
    };
  }

  return {
    payload,
    conversation:
      payload.conversation ??
      payload.updatedConversation ??
      payload.reportConversation ??
      payload.caseConversation ??
      payload.case ??
      null,
    assistantMessage:
      payload.assistantMessage ??
      payload.assistant_message ??
      payload.reply ??
      payload.message ??
      '',
    usage:
      payload.usage ??
      payload.usageSnapshot ??
      payload.usage_snapshot ??
      payload.quota ??
      payload.meta?.usage ??
      null,
  };
}

function remainingUsage() {
  return Math.max(0, usageState.limit - usageState.used);
}

function hasWorkspaceAccess(tier = usageState.tier) {
  const normalized = normalizeTier(tier);
  return normalized === 'teacher' || normalized === 'pro';
}

function syncWorkspaceAccessUi() {
  const signedIn = Boolean(session?.user);
  const hasAccess = signedIn && hasWorkspaceAccess();
  const accessLabel = normalizeTier(usageState.tier) === 'pro' ? 'PRO 검찰/경찰 (수사기관) 전문 보조용 라이선스' : 'Teacher 교원 권한 · 학폭·교권침해·악성민원 대응';
  document.body.dataset.workspaceAccess = hasAccess ? 'true' : 'false';
  document.body.dataset.authenticated = signedIn ? 'true' : 'false';

  if (!dom.accessNote) return;

  if (!signedIn) {
    dom.accessNote.textContent = '권한 필요: 사용해보기로 로그인한 뒤 Teacher 또는 PRO 권한 안내를 확인해 주세요.';
    return;
  }

  if (!hasAccess) {
    dom.accessNote.textContent = '권한 필요: 로그인은 완료되었지만 분석 워크스페이스는 Teacher 또는 PRO 승인 후 사용할 수 있습니다.';
    return;
  }

  if (desktopOnlyMedia.matches) {
    dom.accessNote.textContent = `${accessLabel}이 확인되었습니다. 실제 분석 워크스페이스는 PC 브라우저에서 열어 주세요.`;
    return;
  }

  dom.accessNote.textContent = `${accessLabel}이 확인되었습니다. 분석 워크스페이스가 열렸습니다.`;
}

function canChat(units = 1) {
  return Boolean(session?.user) && hasWorkspaceAccess() && remainingUsage() >= units;
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
    ? '권한 필요 · 로그인 필요'
    : hasWorkspaceAccess()
      ? `${info.license} · ${used}/${usageState.limit} · ${percent}%`
      : '권한 필요 · 승인 대기';
  document.body.dataset.licenseTier = usageState.tier;
  syncWorkspaceAccessUi();

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
      : hasWorkspaceAccess()
        ? `${used}/${usageState.limit}회 · 월 사용량`
        : '권한 승인 필요';
  }
}

function syncInteractionState() {
  const desktopBlocked = desktopOnlyMedia.matches;
  const chatEnabled = canChat();
  const busy = isSending;
  dom.form.querySelector('button').disabled = desktopBlocked || !chatEnabled || busy;
  dom.input.disabled = desktopBlocked || !chatEnabled || busy;
  dom.generateReport.disabled = desktopBlocked || !chatEnabled || busy;
  if (dom.historyToggle) {
    dom.historyToggle.disabled = !session?.user;
    dom.historyToggle.textContent = conversations.length ? `기록 ${conversations.length}` : '기록';
  }
  dom.saveCaseButtons.forEach((button) => {
    button.disabled = !session?.user || !activeConversation || activeConversation.isLocal || busy;
  });

  if (!session?.user) {
    dom.input.placeholder = '로그인 후 분석을 시작하세요';
    if (dom.composerNote) dom.composerNote.textContent = '비로그인 사용자는 분석을 시작할 수 없습니다. 사용해보기를 눌러 로그인해 주세요.';
    return;
  }

  if (!hasWorkspaceAccess()) {
    dom.input.placeholder = '권한 승인 후 사용할 수 있습니다';
    if (dom.composerNote) dom.composerNote.textContent = '권한 필요: Teacher 또는 PRO 승인 계정만 분석 워크스페이스에 접속할 수 있습니다.';
    return;
  }

  if (!chatEnabled) {
    dom.input.placeholder = '이번 달 사용량을 모두 사용했습니다';
    if (dom.composerNote) dom.composerNote.textContent = `${tierInfo().label} 월 사용량을 모두 사용했습니다.`;
    return;
  }

  dom.input.placeholder = '사안명 / 당사자 / 발생 경위 / 보유 증거 / 요청 판단을 사안보고 형식으로 입력하세요';
  if (dom.composerNote) dom.composerNote.textContent = `${tierInfo().label} · ${usageState.limit - usageState.used}회 남음`;
}

function applyUsageState(nextUsage = {}) {
  const usage = unwrapPayload(nextUsage);
  const usedMessages = numberOrNull(usage.used_messages) ?? 0;
  const usedReports = numberOrNull(usage.used_reports) ?? 0;
  const hasSeparateUsage = usage.used_messages !== undefined || usage.used_reports !== undefined;
  const tier = normalizeTier(usage.tier ?? usage.membership_tier);
  const info = tierInfo(tier);
  const rawLimit =
    numberOrNull(usage.limit_points) ??
    numberOrNull(usage.limit_messages) ??
    numberOrNull(usage.limit_reports) ??
    numberOrNull(usage.limit) ??
    numberOrNull(usage.monthly_limit) ??
    numberOrNull(usage.monthly_messages);
  const limit = rawLimit ?? numberOrNull(usageState.limit) ?? info.limit;
  const rawRemaining =
    numberOrNull(usage.remaining_points) ??
    numberOrNull(usage.remaining_messages) ??
    numberOrNull(usage.remaining);
  const used =
    numberOrNull(usage.used_points) ??
    numberOrNull(usage.used) ??
    (hasSeparateUsage ? usedMessages + usedReports : null) ??
    (rawRemaining !== null ? Math.max(0, limit - rawRemaining) : null) ??
    usageState.used ??
    0;

  usageState = {
    tier,
    used: Math.max(0, Math.min(used, limit)),
    limit,
    period: String(usage.period ?? usage.month ?? usage.period_month ?? usageState.period ?? ''),
  };

  syncLicenseUi();
  syncInteractionState();
}

function applyLocalUsageIncrement(previousUsage = usageState, units = 1) {
  if (!session?.user || !previousUsage.limit) return;

  const samePeriod = !previousUsage.period || !usageState.period || previousUsage.period === usageState.period;
  if (!samePeriod || usageState.used > previousUsage.used) return;

  applyUsageState({
    tier: usageState.tier,
    used: Math.min(usageState.limit, previousUsage.used + Math.max(1, Number(units) || 1)),
    limit: usageState.limit,
    period: usageState.period,
  });
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

function messageContentHtml(content, role = 'assistant') {
  const text = String(content ?? '').trim();
  if (!text) return '<p></p>';

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const fieldRows = lines
    .map((line) => {
      const match = line.match(/^([^:：]{2,24})[:：]\s*(.*)$/);
      if (!match) return null;
      return {
        label: match[1].trim(),
        value: match[2].trim() || '미입력',
      };
    })
    .filter(Boolean);

  if (role === 'user' && fieldRows.length >= 3) {
    return `
      <dl class="case-intake-message">
        ${fieldRows.map((row) => `
          <div>
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(row.value)}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }

  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function isPdfFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return file?.type === 'application/pdf' || name.endsWith('.pdf');
}

function normalizePdfText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodePdfLiteralString(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractPdfTextFallback(arrayBuffer) {
  const raw = new TextDecoder('iso-8859-1').decode(new Uint8Array(arrayBuffer));
  const chunks = [];
  const literalStringPattern = /\((?:\\.|[^\\)]){2,}\)\s*Tj/g;
  let match = literalStringPattern.exec(raw);

  while (match && chunks.join('\n').length < evidenceLimits.maxCharsPerFile) {
    chunks.push(decodePdfLiteralString(match[0].replace(/\)\s*Tj$/, '').slice(1)));
    match = literalStringPattern.exec(raw);
  }

  return normalizePdfText(chunks.join('\n'));
}

async function loadPdfJs() {
  if (!pdfJsLoader) {
    pdfJsLoader = import(pdfJsConfig.moduleUrl).then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfJsConfig.workerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsLoader;
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      disableFontFace: true,
      isEvalSupported: false,
    }).promise;
    const maxPages = Math.min(pdf.numPages, evidenceLimits.maxPagesPerFile);
    const chunks = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str || '')
        .join(' ');
      chunks.push(`--- ${pageNumber}쪽 ---\n${pageText}`);

      if (chunks.join('\n').length >= evidenceLimits.maxCharsPerFile) break;
    }

    await pdf.destroy?.();

    return {
      text: normalizePdfText(chunks.join('\n')).slice(0, evidenceLimits.maxCharsPerFile),
      pageCount: pdf.numPages,
      extraction: 'pdfjs',
    };
  } catch (error) {
    const fallbackText = extractPdfTextFallback(arrayBuffer);

    if (fallbackText) {
      return {
        text: fallbackText.slice(0, evidenceLimits.maxCharsPerFile),
        pageCount: 0,
        extraction: 'fallback',
      };
    }

    throw error;
  }
}

function updateEvidenceFile(id, patch) {
  evidenceFiles = evidenceFiles.map((item) => (
    item.id === id ? { ...item, ...patch } : item
  ));
  renderEvidenceFiles();
}

async function extractEvidenceFile(id) {
  const target = evidenceFiles.find((item) => item.id === id);
  if (!target) return;

  updateEvidenceFile(id, { status: 'extracting', statusLabel: '본문 읽는 중' });

  try {
    const result = await extractPdfText(target.file);
    updateEvidenceFile(id, {
      status: result.text ? 'ready' : 'empty',
      text: result.text,
      pageCount: result.pageCount,
      extraction: result.extraction,
      statusLabel: result.text
        ? `${result.pageCount ? `${result.pageCount}쪽 · ` : ''}${result.text.length.toLocaleString('ko-KR')}자 추출`
        : '추출된 텍스트 없음',
      error: '',
    });
  } catch (error) {
    updateEvidenceFile(id, {
      status: 'failed',
      text: '',
      pageCount: 0,
      extraction: 'failed',
      statusLabel: '본문 추출 실패',
      error: error instanceof Error ? error.message : 'PDF 텍스트 추출 실패',
    });
  }
}

function renderEvidenceFiles() {
  if (!dom.evidenceList) return;

  if (!evidenceFiles.length) {
    dom.evidenceList.innerHTML = '<p class="case-evidence-empty">아직 추가된 PDF 증거가 없습니다.</p>';
    if (dom.evidenceStatus) {
      dom.evidenceStatus.textContent = 'PDF 파일을 추가하면 본문을 읽어 다음 사안보고 분석에 반영합니다. PDF 분석 반영은 2회 차감됩니다.';
    }
    if (dom.evidenceAnalyze) {
      dom.evidenceAnalyze.disabled = true;
      dom.evidenceAnalyze.textContent = '증거 반영 · 2회';
    }
    return;
  }

  dom.evidenceList.innerHTML = evidenceFiles
    .map((item) => `
      <article class="case-evidence-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${formatFileSize(item.size)} · ${escapeHtml(item.statusLabel || '본문 읽는 중')}</small>
        </div>
        <button type="button" data-evidence-remove="${escapeHtml(item.id)}">삭제</button>
      </article>
    `)
    .join('');

  if (dom.evidenceStatus) {
    const extractingCount = evidenceFiles.filter((item) => item.status === 'extracting').length;
    const readyCount = evidenceFiles.filter((item) => item.status === 'ready').length;
    const failedCount = evidenceFiles.filter((item) => item.status === 'failed' || item.status === 'empty').length;

    if (extractingCount) {
      dom.evidenceStatus.textContent = `${extractingCount}개 PDF 본문을 읽는 중입니다. 추출이 끝나면 사안보고서에 반영할 수 있습니다.`;
    } else if (readyCount) {
      dom.evidenceStatus.textContent = `${readyCount}개 PDF 본문을 읽었습니다. 증거 반영을 누르면 2회 차감 후 사안보고서에 반영됩니다.`;
    } else if (failedCount) {
      dom.evidenceStatus.textContent = 'PDF 본문을 읽지 못했습니다. 텍스트가 있는 PDF인지 확인하거나 핵심 내용을 입력창에 붙여 주세요.';
    }
  }

  if (dom.evidenceAnalyze) {
    const extracting = evidenceFiles.some((item) => item.status === 'extracting');
    dom.evidenceAnalyze.disabled = extracting || !evidenceFiles.length;
    dom.evidenceAnalyze.textContent = extracting ? 'PDF 읽는 중' : '증거 반영 · 2회';
  }
}

async function handleEvidenceFiles(fileList) {
  const incomingFiles = Array.from(fileList || []);
  if (!incomingFiles.length) return;

  const accepted = [];
  const rejected = [];

  incomingFiles.forEach((file) => {
    if (!isPdfFile(file)) {
      rejected.push(`${file.name || '알 수 없는 파일'}: PDF만 가능`);
      return;
    }

    if (file.size > evidenceLimits.maxBytes) {
      rejected.push(`${file.name}: ${formatFileSize(evidenceLimits.maxBytes)} 이하만 가능`);
      return;
    }

    const duplicate = evidenceFiles.some((item) => (
      item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
    ));

    if (duplicate) return;
    if (evidenceFiles.length + accepted.length >= evidenceLimits.maxFiles) {
      rejected.push(`${file.name}: 최대 ${evidenceLimits.maxFiles}개까지 가능`);
      return;
    }

    accepted.push({
      id: `pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      addedAt: new Date().toISOString(),
      addedAtLabel: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      status: 'queued',
      statusLabel: '추출 대기',
      text: '',
      pageCount: 0,
      extraction: '',
      error: '',
    });
  });

  evidenceFiles = [...evidenceFiles, ...accepted];
  renderEvidenceFiles();

  if (accepted.length) {
    setServiceStatus(`${accepted.length}개 PDF를 추가했습니다. 본문을 읽는 중입니다.`, 'ready');
    await Promise.allSettled(accepted.map((item) => extractEvidenceFile(item.id)));
  }

  if (rejected.length) {
    setServiceStatus(rejected[0], 'error');
  }
}

function removeEvidenceFile(id) {
  evidenceFiles = evidenceFiles.filter((item) => item.id !== id);
  renderEvidenceFiles();
  setServiceStatus('PDF 증거를 목록에서 제거했습니다.', 'ready');
}

function buildEvidenceGuidance() {
  if (!evidenceFiles.length) return '';

  let usedChars = 0;
  const items = evidenceFiles
    .map((item, index) => {
      const remaining = Math.max(0, evidenceLimits.maxTotalChars - usedChars);
      const text = normalizePdfText(item.text || '').slice(0, remaining);
      usedChars += text.length;

      return [
        `## PDF ${index + 1}. ${item.name}`,
        `- 파일 크기: ${formatFileSize(item.size)}`,
        `- 추출 상태: ${item.statusLabel || item.status}`,
        `- 페이지: ${item.pageCount || '확인 불가'}`,
        text ? `[본문 추출]\n${text}` : '[본문 추출]\n본문 텍스트를 읽지 못했거나 아직 추출 중입니다.',
      ].join('\n');
    })
    .join('\n\n');

  return `

[사용자가 증거 추가 섹션에 올린 PDF 증거 본문]
${items}

주의:
- 위 PDF 본문에서 확인되는 날짜, 당사자, 금액, 발언, 조항, 요청, 회신, 제출처, 서명 여부를 사안보고서의 증거-사실-행위 연결표에 반영한다.
- 각 PDF 증거마다 자료 일관성, 원본·형식 확인, 행위 맥락 연결을 분리해 평가한다.
- PDF에서 확인되는 행위자, 관리·감독 위치의 주체, 의사결정 주체, 기관/플랫폼 개입 지점, AI가 추론한 연결 지점을 관계 구조에 반영한다.
- PDF 본문이 특정 보고서 섹션을 새로 요구하면 고정 양식에 억지로 맞추지 말고, "동적 분석 모듈"로 추가한다.
- AI가 PDF 본문에서 도출한 추론은 "AI 정리근거와 불확실성"에 남기고, 사용자가 최종 확인해야 할 부분은 "사용자 확인 및 검토 지점"에 분리한다.
- PDF 본문만으로 단정할 수 없는 부분은 "확인 필요"로 표시한다.
- PDF에서 직접 확인된 내용과 사용자가 사건 메모로 입력한 주장을 구분한다.
`.trim();
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
        <span>RoosyCozy 수사지원 보고서</span>
        <h2>사안 보고서</h2>
        <p>사건 메모, PDF 증거, 인물 관계를 정리합니다.</p>
      </header>
      <div class="report-meta">
        <span>사건 접수표</span>
        <span>관계 구조</span>
        <span>증거 연결</span>
        <span>확인 필요</span>
      </div>
      <section class="report-section report-placeholder">
        <h2>작성 예정 구조</h2>
        <ul>
          <li>사건 접수표와 핵심 결론</li>
          <li>인물 관계 구조</li>
          <li>증거-사실-행위 연결표</li>
          <li>사용자 확인 지점</li>
        </ul>
      </section>
    `;
  }

  const lines = source.split('\n');
  let title = '사안 보고서';
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
      <span>RoosyCozy 사안보고서</span>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <div class="report-meta">
      <span>판단지원 분석</span>
      <span>검토 필요</span>
    </div>
  ${body || '<section class="report-section"><p>사안보고서 내용을 정리하고 있습니다.</p></section>'}
  `;
}

function reportSectionKind(title = '') {
  const text = String(title);

  if (/요약|개요|핵심/.test(text)) return 'is-summary';
  if (/당사자|역할|인물|가해|피해|방관|목격|이해관계|분쟁구도|관계자|관련 주체|행위자|감독|관리|의사결정/.test(text)) return 'is-people';
  if (/시간|경위|일시|순서|타임라인/.test(text)) return 'is-timeline';
  if (/장면|상황|묘사|발언|행동|주장|대립/.test(text)) return 'is-scene';
  if (/증거|자료|기록|문서|로그/.test(text)) return 'is-evidence';
  if (/부족|확인|질문|불확실|쟁점|논점|리스크|취약|정리근거|AI|사용자|검토/.test(text)) return 'is-gap';
  if (/대응|조치|체크|다음|시뮬레이션|전개|경로|실행|자료추적|로그|최종 확인/.test(text)) return 'is-action';

  return 'is-general';
}

function productLabel(product) {
  return product === 'pro' ? 'PRO 증거분석' : 'Teacher 기초 보고서';
}

function currentProductKind() {
  return normalizeTier(usageState.tier) === 'teacher' ? 'teachers' : 'pro';
}

function classifyChatIntent(message, forceReport = false) {
  const text = String(message || '').trim();

  if (forceReport) return 'report_command';
  if (!text) return 'empty';

  const asksQuestion = /[?？]|뭐|무엇|어떻게|어떤|왜|가능|필요|더|강력|증거|대응|해야|할까|하나요|있나요|알려|추천|방법|조언|관련 주체|행위|판단/.test(text);
  const reportCommand = /보고서|브리프|정리|작성|갱신|업데이트|반영|문서화|초안|시뮬레이션|쟁점|논점|분쟁구도|분석|관련 주체|정리근거|의사결정|자료추적/.test(text);
  const factSignal = /했다|했어|합니다|왔|말했|보냈|때렸|욕|협박|방관|참여|가해|피해|목격|증거|녹취|문자|카톡|메일|날짜|장소|이름|관계|계약|합의|주장|상대|분쟁|행위자|감독자|의사결정자|행위/.test(text);

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
      '사안보고 접수표',
      '핵심 결론 요약',
      '증거 신뢰도 분석·행위 맥락 연결',
      '사실관계 재구성',
      '쟁점 트리와 대립 구조',
      '입체적 관계 구조',
      '증거-사실-행위 연결표',
      'AI 정리근거와 불확실성',
      '사용자 확인 및 검토 지점',
      '시뮬레이션과 자료 공백',
      '제출용 문안 초안',
      '추가 확인사항과 실행 체크리스트',
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
    dom.conversationList.innerHTML = '<p class="case-list-empty">로그인 후 저장된 사안이 표시됩니다.</p>';
    return;
  }

  if (!conversations.length) {
    dom.conversationList.innerHTML = '<p class="case-list-empty">아직 저장된 사안이 없습니다.</p>';
    return;
  }

  conversations.forEach((conversation) => {
    const item = document.createElement('article');
    item.className = 'case-history-item';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = `case-history-open${conversation.id === activeConversation?.id ? ' is-active' : ''}`;
    openButton.innerHTML = `
      <strong>${escapeHtml(conversation.title || '새 사안')}</strong>
      <span>${escapeHtml(productLabel(conversation.product))} · ${new Date(conversation.updated_at).toLocaleDateString('ko-KR')}</span>
    `;
    openButton.addEventListener('click', () => selectConversation(conversation.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'case-history-delete';
    deleteButton.textContent = '삭제';
    deleteButton.setAttribute('aria-label', `${conversation.title || '새 사안'} 삭제`);
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
        <h3>사안보고를 접수하세요</h3>
        <div class="case-intake-template" aria-label="사안보고 입력 항목">
          <span>사안명</span>
          <span>당사자/관계</span>
          <span>발생 경위</span>
          <span>보유 증거</span>
          <span>요청 판단</span>
        </div>
        <div class="case-prompt-chips" aria-label="입력 예시">
          <button type="button" data-prompt-template="사안명:\n당사자/관계:\n발생 일시·장소:\n발생 경위:\n상대방 주장 또는 예상 반박:\n보유 증거:\n내가 원하는 판단 또는 조치:\n아직 불확실한 부분:">사안보고 양식</button>
          <button type="button" data-prompt-template="사안명: 계약·외주 분쟁\n당사자/관계:\n계약 또는 합의 내용:\n문제가 된 행위:\n보유 증거:\n상대방 예상 주장:\n원하는 조치:">계약 분쟁</button>
          <button type="button" data-prompt-template="사안명: 조직·기관 갈등\n당사자/관계:\n핵심 장면:\n직접 행위자:\n방관자 또는 감독자:\n보유 증거:\n사용자가 확인받고 싶은 부분:">관련 주체</button>
        </div>
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
      ${messageContentHtml(message.content, message.role)}
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
        <strong>증거를 분해하고 관련 구조를 재구성하고 있습니다</strong>
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

function graphNodeById(id) {
  return graphState.nodes.find((node) => node.id === id) ?? null;
}

function resetKnowledgeGraph() {
  graphState = {
    nodes: [],
    links: [],
    selectedNodeId: null,
    pendingLinkNodeId: null,
    linkMode: graphState.linkMode,
    nextNodeNumber: 1,
  };
  graphDragState = null;
}

function graphLayerLabel(value) {
  return graphLayerLabels[value] || graphLayerLabels.uncertain;
}

function normalizeGraphLayer(value) {
  const text = String(value || '').trim();
  if (/핵심|중심|주요|core/i.test(text)) return 'core';
  if (/주변|참고|보조|support/i.test(text)) return 'support';
  return 'uncertain';
}

function graphNodeLabel(node) {
  return `${node.label || '인물'}${node.role ? ` · ${node.role}` : ''}`;
}

function createGraphNode(x, y) {
  const rect = dom.graphCanvas.getBoundingClientRect();
  const id = `person-${Date.now()}-${graphState.nextNodeNumber}`;
  const label = `인물 ${graphState.nextNodeNumber}`;
  const node = {
    id,
    label,
    role: '역할 미정',
    layer: 'uncertain',
    note: '',
    x: Math.max(86, Math.min(rect.width - 86, x)),
    y: Math.max(52, Math.min(rect.height - 52, y)),
  };

  graphState = {
    ...graphState,
    nodes: [...graphState.nodes, node],
    selectedNodeId: id,
    pendingLinkNodeId: graphState.linkMode ? id : null,
    nextNodeNumber: graphState.nextNodeNumber + 1,
  };

  renderAll();
}

function toggleGraphLink(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;

  const exists = graphState.links.some((link) => (
    (link.source === sourceId && link.target === targetId)
    || (link.source === targetId && link.target === sourceId)
  ));

  if (exists) {
    graphState = {
      ...graphState,
      selectedNodeId: targetId,
      pendingLinkNodeId: graphState.linkMode ? targetId : null,
    };
    return;
  }

  graphState = {
    ...graphState,
    links: [
      ...graphState.links,
      {
        id: `link-${Date.now()}`,
        source: sourceId,
        target: targetId,
        label: '관계',
      },
    ],
    selectedNodeId: targetId,
    pendingLinkNodeId: graphState.linkMode ? targetId : null,
  };
}

function selectGraphNode(id) {
  if (graphState.linkMode && graphState.pendingLinkNodeId && graphState.pendingLinkNodeId !== id) {
    toggleGraphLink(graphState.pendingLinkNodeId, id);
    renderAll();
    return;
  }

  graphState = {
    ...graphState,
    selectedNodeId: id,
    pendingLinkNodeId: graphState.linkMode ? id : null,
  };
  renderAll();
}

function graphRelationList() {
  return graphState.links
    .map((link) => {
      const source = graphNodeById(link.source);
      const target = graphNodeById(link.target);
      if (!source || !target) return '';
      return `${source.label} ↔ ${target.label}`;
    })
    .filter(Boolean);
}

function graphIsolatedNodes() {
  const connectedIds = new Set();
  graphState.links.forEach((link) => {
    connectedIds.add(link.source);
    connectedIds.add(link.target);
  });
  return graphState.nodes.filter((node) => !connectedIds.has(node.id));
}

function knowledgeGraphMarkdown() {
  const nodeCount = graphState.nodes.length;
  const linkCount = graphState.links.length;
  const selected = graphNodeById(graphState.selectedNodeId);
  const relations = graphRelationList();
  const isolated = graphIsolatedNodes();

  if (!nodeCount) {
    return [
      '## 관계 구조',
      '',
      '- 아직 생성된 인물 노드가 없습니다.',
      '- 사건 평면의 빈 곳을 클릭해 인물을 만들고 관계선을 연결하세요.',
      '- 인물의 역할, 메모, 연결 상태가 이 보고서에 반영됩니다.',
    ].join('\n');
  }

  const density = nodeCount <= 1 ? '판단 보류' : `${linkCount}/${Math.round((nodeCount * (nodeCount - 1)) / 2)} 연결`;

  return [
    '## 관계 구조',
    '',
    `- 현재 인물 노드: ${nodeCount}개`,
    `- 현재 관계선: ${linkCount}개`,
    `- 관계 밀도: ${density}`,
    selected ? `- 선택 노드: ${graphNodeLabel(selected)}` : '- 선택 노드: 없음',
    '',
    '### 관련 인물',
    ...graphState.nodes.map((node) => [
      `- ${graphNodeLabel(node)}`,
      `  - 분류: ${graphLayerLabel(node.layer)}`,
      node.note ? `  - 메모: ${node.note}` : '  - 메모: 확인 필요',
    ].join('\n')),
    '',
    '### 관계선',
    ...(relations.length ? relations.map((item) => `- ${item}`) : ['- 아직 연결된 관계선이 없습니다.']),
    '',
    '### 확인이 필요한 빈칸',
    ...(isolated.length
      ? isolated.map((node) => `- ${node.label}: 다른 인물 또는 증거와의 연결 근거 확인 필요`)
      : ['- 모든 인물 노드가 최소 1개 이상의 관계선으로 연결되어 있습니다.']),
    '',
    '### 다음 작성 질문',
    '- 각 관계선은 어떤 진술, 문서, PDF 원자료, 시간대 또는 장소 기록으로 뒷받침되는지 확인해야 합니다.',
  ].join('\n');
}

function buildKnowledgeGraphGuidance() {
  if (!graphState.nodes.length) return '';

  return `
[사용자가 사건 평면에 구성한 관계 그래프]
${knowledgeGraphMarkdown()}

주의:
- 위 관계 그래프는 사용자가 직접 배치한 사건 구조다.
- 보고서에는 인물 노드, 관계선, 고립 노드, 연결 근거가 부족한 관계를 반영한다.
- 그래프 관계선은 법적 판단이 아니라 사안 구조화 단서로만 다룬다.
- PDF 증거 또는 사건 기록과 연결되지 않은 노드는 "확인 필요"로 남긴다.
`.trim();
}

function renderKnowledgeGraph() {
  if (!dom.graphCanvas || !dom.graphNodes || !dom.graphLinks) return;

  const rect = dom.graphCanvas.getBoundingClientRect();

  dom.graphLinks.innerHTML = graphState.links
    .map((link) => {
      const source = graphNodeById(link.source);
      const target = graphNodeById(link.target);
      if (!source || !target) return '';
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      return `
        <line class="case-graph-link" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"></line>
        <text class="case-graph-link-label" x="${midX}" y="${midY - 6}" text-anchor="middle">관계</text>
      `;
    })
    .join('');
  dom.graphLinks.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);

  dom.graphNodes.innerHTML = '';
  graphState.nodes.forEach((node) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'case-graph-node',
      `is-${node.layer || 'uncertain'}`,
      node.id === graphState.selectedNodeId ? 'is-selected' : '',
      node.id === graphState.pendingLinkNodeId ? 'is-pending' : '',
    ].filter(Boolean).join(' ');
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;
    button.dataset.graphNodeId = node.id;
    button.innerHTML = `
      <i>${escapeHtml(graphLayerLabel(node.layer))}</i>
      <b>${escapeHtml(node.label)}</b>
      <span>${escapeHtml(node.role)}</span>
      <em>${escapeHtml(node.note || '더블클릭으로 사건 메모 입력')}</em>
    `;
    dom.graphNodes.append(button);
  });

  dom.graphEmpty?.classList.toggle('is-hidden', graphState.nodes.length > 0);
  dom.graphLinkMode?.classList.toggle('is-active', graphState.linkMode);
  dom.graphLinkMode && (dom.graphLinkMode.textContent = graphState.linkMode ? '관계선 모드 켜짐' : '관계선 모드 꺼짐');

  if (dom.graphInspector) {
    const selected = graphNodeById(graphState.selectedNodeId);
    const isolated = graphIsolatedNodes();
    dom.graphInspector.innerHTML = selected
      ? `
        <span>선택 노드</span>
        <strong>${escapeHtml(graphNodeLabel(selected))}</strong>
        <p>${escapeHtml(graphLayerLabel(selected.layer))}${selected.note ? ` · ${escapeHtml(selected.note)}` : ' · 더블클릭으로 행위, 증거, 시점 메모를 입력하세요.'}</p>
      `
      : `
        <span>그래프 상태</span>
        <strong>${graphState.nodes.length}명 · 관계 ${graphState.links.length}개</strong>
        <p>${isolated.length ? `${isolated.length}개 인물은 아직 다른 인물과 연결되지 않았습니다.` : '모든 인물이 최소 1개 관계선으로 연결되어 있습니다.'}</p>
      `;
  }
}

function renderReport() {
  dom.activeProduct.textContent = activeConversation ? productLabel(activeConversation.product) : '사안 입력';
  dom.activeTitle.textContent = activeConversation?.title || '사안보고를 접수하세요';
  const graphMarkdown = knowledgeGraphMarkdown();
  const reportMarkdown = activeConversation?.report_markdown
    ? `\n\n---\n\n${activeConversation.report_markdown}`
    : '';
  dom.reportPreview.innerHTML = markdownToHtml(`${graphMarkdown}${reportMarkdown}`);
  syncInteractionState();
}

function renderAll() {
  renderConversations();
  renderMessages();
  renderReport();
  renderEvidenceFiles();
  renderKnowledgeGraph();
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

async function loadUsage({ preserveOnError = true } = {}) {
  if (!session?.user || !supabase) {
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  const { data: usageData, error: usageError } = await supabase.rpc('get_my_report_usage');

  if (!usageError && usageData) {
    applyUsageState(usageData);
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('user_memberships')
    .select('tier')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (membershipError) {
    if (!preserveOnError) {
      applyUsageState({ tier: 'general', used: usageState.used, limit: usageState.limit || tierConfig.general.limit });
    }
    return;
  }

  const tier = normalizeTier(membership?.tier);
  applyUsageState({
    tier,
    used: preserveOnError ? usageState.used : 0,
    limit: tierInfo(tier).limit,
    period: usageState.period,
  });
}

async function loadMessages() {
  if (!activeConversation || !supabase) {
    messages = [];
    return;
  }

  if (activeConversation.isLocal) {
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
  evidenceFiles = [];
  resetKnowledgeGraph();
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
    product: currentProductKind(),
    title: message.trim().slice(0, 34) || '새 사안',
    status: 'draft',
    report_markdown: '',
    created_at: now,
    updated_at: now,
  };
}

async function invokeChat({ message = '', forceReport = false } = {}) {
  if (desktopOnlyMedia.matches) {
    setServiceStatus('RoosyCozy Intelligence는 PC 브라우저에서만 사용할 수 있습니다.', 'error');
    return;
  }

  if (evidenceFiles.some((item) => item.status === 'extracting' || item.status === 'queued')) {
    setServiceStatus('PDF 본문을 읽는 중입니다. 추출이 끝난 뒤 다시 시도해 주세요.', 'error');
    return;
  }

  const activeSession = session?.user ? session : await restoreSessionIfAvailable(true);

  if (!activeSession?.user) {
    setServiceStatus('로그인 후 대화할 수 있습니다.', 'error');
    return;
  }

  if (!hasWorkspaceAccess()) {
    setServiceStatus('권한 필요: Teacher 또는 PRO 승인 계정만 분석 워크스페이스를 사용할 수 있습니다.', 'error');
    syncInteractionState();
    return;
  }

  if (!supabase) return;
  if (!message.trim() && !forceReport) return;

  const trimmedMessage = message.trim();
  const chatIntent = classifyChatIntent(trimmedMessage, forceReport);
  const shouldUpdateReport = shouldUpdateReportFromMessage(chatIntent, forceReport);
  const evidenceGuidance = buildEvidenceGuidance();
  const graphGuidance = buildKnowledgeGraphGuidance();
  const usageUnits = evidenceGuidance && shouldUpdateReport ? 2 : 1;
  const requestPolicy = {
    ...chatRequestPolicy(chatIntent, shouldUpdateReport),
    usageUnits,
    includesPdfEvidence: Boolean(evidenceGuidance),
    includesKnowledgeGraph: Boolean(graphGuidance),
  };

  if (!canChat(usageUnits)) {
    setServiceStatus(`${usageUnits}회가 필요한 요청입니다. 현재 남은 사용량은 ${remainingUsage()}회입니다.`, 'error');
    syncInteractionState();
    return;
  }

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
    const usageBeforeRequest = { ...usageState };
    const timeoutMs = shouldUpdateReport ? 70000 : 42000;
    const { data, error } = await withTimeout(
      supabase.functions.invoke('report-chat', {
        body: {
          conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
          product: activeConversation?.product ?? currentProductKind(),
          message: trimmedMessage,
          forceReport,
          clientIntent: chatIntent,
          clientPolicy: requestPolicy,
          clientGuidance: [reportChatBehaviorGuide, graphGuidance, evidenceGuidance].filter(Boolean).join('\n\n'),
          usageUnits,
        },
      }),
      timeoutMs,
      shouldUpdateReport
        ? '답변과 사안보고서 정리가 지연되고 있습니다. 잠시 뒤 다시 시도하거나 더 짧게 나누어 입력해 주세요.'
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

    const chatResponse = normalizeChatResponse(data);

    if (chatResponse.payload?.error) {
      throw new Error(chatResponse.payload.error);
    }

    if (chatResponse.conversation) {
      const nextConversation = chatResponse.conversation;
      const existingIndex = conversations.findIndex((item) => item.id === nextConversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = nextConversation;
      } else {
        conversations.unshift(nextConversation);
      }

      activeConversation = nextConversation;
    }

    if (chatResponse.assistantMessage && (!chatResponse.conversation || activeConversation?.isLocal)) {
      messages = [
        ...messages,
        {
          id: `temp-assistant-${Date.now()}`,
          role: 'assistant',
          content: chatResponse.assistantMessage,
          created_at: new Date().toISOString(),
        },
      ];
    }

    if (chatResponse.usage) {
      applyUsageState(chatResponse.usage);
    } else {
      applyLocalUsageIncrement(usageBeforeRequest, usageUnits);
    }

    await loadUsage({ preserveOnError: true });
    applyLocalUsageIncrement(usageBeforeRequest, usageUnits);
    await loadMessages();
    renderAll();
    setServiceStatus('분석 저장 완료', 'ready');
  } catch (error) {
    await loadUsage({ preserveOnError: true });
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
    setServiceStatus('분석 함수 연결 확인 필요', 'error');
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
    setAuthMessage('RoosyCozy Intelligence는 PC 브라우저 전용입니다. 모바일 앱 안의 브라우저에서는 이용할 수 없으니 데스크톱 또는 노트북의 Chrome, Edge, Safari에서 다시 열어 주세요.', true);
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
    setServiceStatus('저장할 사안이 없습니다.', 'error');
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
    setServiceStatus('사안보고서와 분석 기록 저장 완료', 'ready');
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

  const ok = window.confirm(`'${target.title || '새 사안'}' 기록을 삭제할까요?`);
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
    setGuideOpen(false);
    setAuthLegalOpen(false);
    setAuthMode('login');
    if (isGoogleOAuthBlockedUserAgent()) {
      setAuthMode('signup');
      setAuthMessage('RoosyCozy Intelligence는 PC 브라우저 전용입니다. 모바일 앱 안의 브라우저에서는 이용할 수 없으니 데스크톱 또는 노트북 브라우저에서 접속해 주세요.');
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
    setGuideOpen(false);
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
    setGuideOpen(false);
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
    setGuideOpen(false);
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

function setGuideOpen(isOpen) {
  if (!dom.guideModal || !dom.guideBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setHistoryOpen(false);
    setReportOpen(false);
    setLicenseOpen(false);
    setAuthOpen(false);
  }

  document.body.classList.toggle('is-guide-open', isOpen);
  dom.guideModal.hidden = false;
  dom.guideBackdrop.hidden = !isOpen;
  dom.guideModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

  if (isOpen) return;

  setTimeout(() => {
    if (!document.body.classList.contains('is-guide-open')) {
      dom.guideModal.hidden = true;
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
  dom.reportToggle.setAttribute('aria-label', isOpen ? '사안보고서 닫기' : '사안보고서 열기');
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
dom.authOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (session?.user && !hasWorkspaceAccess()) {
      setLicenseOpen(true);
      return;
    }

    setAuthMode('login');
    setAuthOpen(true);
  });
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

dom.guideOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setGuideOpen(true);
  });
});

dom.guideClose?.addEventListener('click', () => {
  setGuideOpen(false);
});

dom.guideBackdrop?.addEventListener('click', () => {
  setGuideOpen(false);
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

document.addEventListener('click', (event) => {
  const removeEvidenceButton = event.target.closest('[data-evidence-remove]');
  if (removeEvidenceButton) {
    removeEvidenceFile(removeEvidenceButton.dataset.evidenceRemove);
    return;
  }

  const promptButton = event.target.closest('[data-prompt-template]');
  if (!promptButton) return;

  dom.input.value = promptButton.dataset.promptTemplate || '';
  resizeComposer();
  dom.input.focus();
});

dom.graphCanvas?.addEventListener('click', (event) => {
  if (event.button !== 0) return;
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (graphDragState?.moved) return;

  const rect = dom.graphCanvas.getBoundingClientRect();
  createGraphNode(event.clientX - rect.left, event.clientY - rect.top);
});

dom.graphNodes?.addEventListener('pointerdown', (event) => {
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement || event.button !== 0) return;

  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;

  graphDragState = {
    id: node.id,
    startX: event.clientX,
    startY: event.clientY,
    nodeX: node.x,
    nodeY: node.y,
    moved: false,
  };

  nodeElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

dom.graphNodes?.addEventListener('dblclick', (event) => {
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement) return;
  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;

  const nextLabel = window.prompt('인물 또는 주체 이름', node.label);
  if (nextLabel === null) return;
  const nextRole = window.prompt('역할 또는 관계', node.role || '역할 미정');
  if (nextRole === null) return;
  const nextLayer = window.prompt('분류: 핵심 / 주변 / 확인 필요', graphLayerLabel(node.layer));
  if (nextLayer === null) return;
  const nextNote = window.prompt('사건 메모: 행위, 증거, 시점, 장소 등', node.note || '');
  if (nextNote === null) return;

  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((item) => (
      item.id === node.id
        ? {
            ...item,
            label: nextLabel.trim().slice(0, 26) || item.label,
            role: nextRole.trim().slice(0, 30) || '역할 미정',
            layer: normalizeGraphLayer(nextLayer),
            note: nextNote.trim().slice(0, 90),
          }
        : item
    )),
    selectedNodeId: node.id,
    pendingLinkNodeId: graphState.linkMode ? node.id : graphState.pendingLinkNodeId,
  };
  renderAll();
});

window.addEventListener('pointermove', (event) => {
  if (!graphDragState || !dom.graphCanvas) return;

  const dx = event.clientX - graphDragState.startX;
  const dy = event.clientY - graphDragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) graphDragState.moved = true;

  const rect = dom.graphCanvas.getBoundingClientRect();
  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => (
      node.id === graphDragState.id
        ? {
            ...node,
            x: Math.max(86, Math.min(rect.width - 86, graphDragState.nodeX + dx)),
            y: Math.max(52, Math.min(rect.height - 52, graphDragState.nodeY + dy)),
          }
        : node
    )),
    selectedNodeId: graphDragState.id,
  };
  renderKnowledgeGraph();
});

window.addEventListener('pointerup', () => {
  if (!graphDragState) return;

  const targetId = graphDragState.id;
  const wasMoved = graphDragState.moved;
  graphDragState = null;

  if (!wasMoved) {
    selectGraphNode(targetId);
    return;
  }

  graphState = {
    ...graphState,
    selectedNodeId: targetId,
    pendingLinkNodeId: graphState.linkMode ? targetId : graphState.pendingLinkNodeId,
  };
  renderAll();
});

dom.graphLinkMode?.addEventListener('click', () => {
  graphState = {
    ...graphState,
    linkMode: !graphState.linkMode,
    pendingLinkNodeId: !graphState.linkMode ? graphState.selectedNodeId : null,
  };
  renderAll();
});

dom.graphClear?.addEventListener('click', () => {
  const ok = graphState.nodes.length
    ? window.confirm('현재 사건 평면을 초기화할까요?')
    : true;
  if (!ok) return;
  resetKnowledgeGraph();
  renderAll();
});

dom.evidenceInput?.addEventListener('change', (event) => {
  handleEvidenceFiles(event.target.files);
  event.target.value = '';
});

dom.evidenceAnalyze?.addEventListener('click', () => {
  if (!evidenceFiles.length) {
    setServiceStatus('먼저 PDF 증거를 추가해 주세요.', 'error');
    return;
  }

  if (evidenceFiles.some((item) => item.status === 'extracting' || item.status === 'queued')) {
    setServiceStatus('PDF 본문 추출이 끝난 뒤 사안보고서에 반영할 수 있습니다.', 'error');
    return;
  }

  invokeChat({
    message: '증거 관리 섹션에 올린 PDF 본문을 바탕으로 사안보고서의 사실관계, 관계 구조, 증거-사실-행위 연결표, AI 정리근거, 사용자 확인 지점, 제출 전 문안을 업데이트해줘.',
    forceReport: true,
  });
});

dom.evidenceDropzone?.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dom.evidenceDropzone.classList.add('is-dragging');
});

dom.evidenceDropzone?.addEventListener('dragover', (event) => {
  event.preventDefault();
});

dom.evidenceDropzone?.addEventListener('dragleave', (event) => {
  if (dom.evidenceDropzone.contains(event.relatedTarget)) return;
  dom.evidenceDropzone.classList.remove('is-dragging');
});

dom.evidenceDropzone?.addEventListener('drop', (event) => {
  event.preventDefault();
  dom.evidenceDropzone.classList.remove('is-dragging');
  handleEvidenceFiles(event.dataTransfer?.files);
});

dom.newConversation.addEventListener('click', () => {
  activeConversation = null;
  messages = [];
  evidenceFiles = [];
  resetKnowledgeGraph();
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
