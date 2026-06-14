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
15. "[사건 평면 인물 노드 메모]"가 들어오면 해당 노드를 중심으로 사안보고서를 갱신하되, 중복 문장을 줄이고 표와 짧은 문단으로 정리한다.
16. 노드 메모는 "확인된 내용", "메모 기반 추정", "확인 필요"로 나누고, 새로 연결된 인물은 관계 구조 표에 반영한다.
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
  graphCreateMenu: document.querySelector('[data-graph-create-menu]'),
  graphCreateKindButtons: document.querySelectorAll('[data-graph-create-kind]'),
  graphNodeMenu: document.querySelector('[data-graph-node-menu]'),
  graphNodeMenuTitle: document.querySelector('[data-graph-node-menu-title]'),
  graphNodeDelete: document.querySelector('[data-graph-node-delete]'),
  graphMarquee: document.querySelector('[data-graph-marquee]'),
  graphInspector: document.querySelector('[data-graph-inspector]'),
  graphClear: document.querySelector('[data-graph-clear]'),
  graphLinkMode: document.querySelector('[data-graph-link-mode]'),
  graphMemoBackdrop: document.querySelector('[data-graph-memo-backdrop]'),
  graphMemoModal: document.querySelector('[data-graph-memo-modal]'),
  graphMemoClose: document.querySelector('[data-graph-memo-close]'),
  graphMemoKicker: document.querySelector('[data-graph-memo-kicker]'),
  graphMemoTitle: document.querySelector('[data-graph-memo-title]'),
  graphMemoNameLabel: document.querySelector('[data-graph-memo-name-label]'),
  graphMemoRoleLabel: document.querySelector('[data-graph-memo-role-label]'),
  graphMemoNoteLabel: document.querySelector('[data-graph-memo-note-label]'),
  graphMemoHint: document.querySelector('[data-graph-memo-hint]'),
  graphMemoLabel: document.querySelector('[data-graph-memo-label]'),
  graphMemoRole: document.querySelector('[data-graph-memo-role]'),
  graphMemoNote: document.querySelector('[data-graph-memo-note]'),
  graphMemoLayerButtons: document.querySelectorAll('[data-graph-memo-layer]'),
  graphMemoSave: document.querySelector('[data-graph-memo-save]'),
  graphMemoSubmit: document.querySelector('[data-graph-memo-submit]'),
  graphRelationBackdrop: document.querySelector('[data-graph-relation-backdrop]'),
  graphRelationModal: document.querySelector('[data-graph-relation-modal]'),
  graphRelationClose: document.querySelector('[data-graph-relation-close]'),
  graphRelationLabel: document.querySelector('[data-graph-relation-label]'),
  graphRelationBasis: document.querySelector('[data-graph-relation-basis]'),
  graphRelationStrengthButtons: document.querySelectorAll('[data-graph-relation-strength]'),
  graphRelationSave: document.querySelector('[data-graph-relation-save]'),
  graphRelationDelete: document.querySelector('[data-graph-relation-delete]'),
  graphRelationSubmit: document.querySelector('[data-graph-relation-submit]'),
  graphConfirmBackdrop: document.querySelector('[data-graph-confirm-backdrop]'),
  graphConfirmModal: document.querySelector('[data-graph-confirm-modal]'),
  graphConfirmTitle: document.querySelector('[data-graph-confirm-title]'),
  graphConfirmMessage: document.querySelector('[data-graph-confirm-message]'),
  graphConfirmDetail: document.querySelector('[data-graph-confirm-detail]'),
  graphConfirmCancel: document.querySelector('[data-graph-confirm-cancel]'),
  graphConfirmOk: document.querySelector('[data-graph-confirm-ok]'),
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

const conversationListSelect = 'id, user_id, product, title, status, saved_at, created_at, updated_at';
const conversationDetailSelect = 'id, user_id, product, title, status, report_markdown, saved_at, created_at, updated_at';

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
  clusters: [],
  selectedNodeId: null,
  selectedLinkId: null,
  pendingLinkNodeId: null,
  linkMode: true,
  nextNodeNumber: 1,
  nextEventNumber: 1,
  nextClusterNumber: 1,
};
let graphDragState = null;
let graphCreatePoint = null;
let graphNodeMenuId = null;
let graphCanvasDragState = null;
let graphCanvasSuppressClickUntil = 0;
let graphViewport = {
  x: 0,
  y: 0,
  scale: 1,
};
let graphMemoNodeId = null;
let graphMemoLayer = 'uncertain';
let graphRelationId = null;
let graphRelationStrength = 'weak';
let graphConfirmResolver = null;
let graphLastPress = {
  id: '',
  at: 0,
};
let graphLastLinkPress = {
  id: '',
  at: 0,
};

const graphLayerLabels = {
  core: '핵심',
  support: '주변',
  uncertain: '확인 필요',
};

const graphKindLabels = {
  person: '인물',
  event: '주요 사건',
};

const graphStrengthLabels = {
  confirmed: '확인됨',
  likely: '개연성',
  weak: '확인 필요',
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

  let response;
  try {
    response = await withTimeout(
      client.auth.getSession(),
      12000,
      '로그인 세션 확인이 지연되고 있습니다. 새로고침 후 다시 시도해 주세요.'
    );
  } catch (error) {
    setServiceStatus(error instanceof Error ? error.message : '로그인 세션 확인이 지연되고 있습니다.', 'error');
    return null;
  }

  const { data, error } = response;
  if (error || !data?.session?.user) return null;

  lastKnownSession = data.session;
  applySession(data.session);

  if (loadData) {
    await loadUsage({ preserveOnError: true });
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

  if (/상황 시각화|시각화 보드|관계 구조/.test(text)) return 'is-summary';
  if (/관계 기록|관계선|연결/.test(text)) return 'is-evidence';
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

function clampGraphScale(value) {
  return Math.max(0.45, Math.min(2.4, value));
}

function graphClientPoint(event) {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function graphScreenToWorld(point) {
  return {
    x: (point.x - graphViewport.x) / graphViewport.scale,
    y: (point.y - graphViewport.y) / graphViewport.scale,
  };
}

function graphWorldToScreen(point) {
  return {
    x: graphViewport.x + point.x * graphViewport.scale,
    y: graphViewport.y + point.y * graphViewport.scale,
  };
}

function graphWorldBounds() {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  const width = Math.max(1, rect?.width || 1);
  const height = Math.max(1, rect?.height || 1);
  return {
    width,
    height,
    minX: -Math.max(180, width * 0.6),
    maxX: width + Math.max(180, width * 0.6),
    minY: -Math.max(140, height * 0.6),
    maxY: height + Math.max(140, height * 0.6),
  };
}

function clampGraphWorldPoint(point) {
  const bounds = graphWorldBounds();
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y)),
  };
}

function applyGraphViewport() {
  const transform = `translate(${graphViewport.x}px, ${graphViewport.y}px) scale(${graphViewport.scale})`;
  if (dom.graphLinks) {
    dom.graphLinks.style.transform = transform;
    dom.graphLinks.style.transformOrigin = '0 0';
  }
  if (dom.graphNodes) {
    dom.graphNodes.style.transform = transform;
    dom.graphNodes.style.transformOrigin = '0 0';
  }
}

function resetKnowledgeGraph() {
  graphState = {
    nodes: [],
    links: [],
    clusters: [],
    selectedNodeId: null,
    selectedLinkId: null,
    pendingLinkNodeId: null,
    linkMode: graphState.linkMode,
    nextNodeNumber: 1,
    nextEventNumber: 1,
    nextClusterNumber: 1,
  };
  graphDragState = null;
  graphCanvasDragState = null;
  graphCreatePoint = null;
  graphNodeMenuId = null;
  graphViewport = {
    x: 0,
    y: 0,
    scale: 1,
  };
  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphMarquee(null);
}

function setGraphConfirmOpen(isOpen, options = {}) {
  if (!dom.graphConfirmBackdrop || !dom.graphConfirmModal) return;

  dom.graphConfirmBackdrop.hidden = !isOpen;
  dom.graphConfirmModal.hidden = !isOpen;
  dom.graphConfirmModal.setAttribute('aria-hidden', String(!isOpen));

  if (!isOpen) return;

  if (dom.graphConfirmTitle) dom.graphConfirmTitle.textContent = options.title || '작업을 진행할까요?';
  if (dom.graphConfirmMessage) dom.graphConfirmMessage.textContent = options.message || '';
  if (dom.graphConfirmDetail) dom.graphConfirmDetail.textContent = options.detail || '';
  if (dom.graphConfirmOk) dom.graphConfirmOk.textContent = options.okLabel || '진행';
  if (dom.graphConfirmCancel) dom.graphConfirmCancel.textContent = options.cancelLabel || '취소';

  requestAnimationFrame(() => dom.graphConfirmOk?.focus());
}

function resolveGraphConfirm(value) {
  const resolver = graphConfirmResolver;
  graphConfirmResolver = null;
  setGraphConfirmOpen(false);
  resolver?.(value);
}

function requestGraphConfirm(options = {}) {
  if (!dom.graphConfirmModal) {
    return Promise.resolve(window.confirm(options.message || options.title || '작업을 진행할까요?'));
  }

  if (graphConfirmResolver) {
    resolveGraphConfirm(false);
  }

  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphConfirmOpen(true, options);

  return new Promise((resolve) => {
    graphConfirmResolver = resolve;
  });
}

function graphLayerLabel(value) {
  return graphLayerLabels[value] || graphLayerLabels.uncertain;
}

function graphKindLabel(value) {
  return graphKindLabels[value] || graphKindLabels.person;
}

function normalizeGraphLayer(value) {
  const text = String(value || '').trim();
  if (/핵심|중심|주요|core/i.test(text)) return 'core';
  if (/주변|참고|보조|support/i.test(text)) return 'support';
  return 'uncertain';
}

function normalizeGraphStrength(value) {
  const text = String(value || '').trim();
  if (/확인|confirmed|문서|녹취|원자료|캡처|증거/i.test(text)) return 'confirmed';
  if (/개연|likely|추정|정황|가능/i.test(text)) return 'likely';
  return 'weak';
}

function graphStrengthLabel(value) {
  return graphStrengthLabels[value] || graphStrengthLabels.weak;
}

function inferGraphLayerFromMemo(note, fallback = 'uncertain') {
  const text = String(note || '');
  if (/직접|주도|핵심|가해|피해|의사결정|결정권|담당|주체|중심|반복|강요|협박|지시/.test(text)) {
    return 'core';
  }
  if (/목격|참고|주변|동석|전달|확인자|보조|방관|참여 가능|관련 가능/.test(text)) {
    return 'support';
  }
  if (/확인 필요|불명|미정|추정|모름|아직|불확실|누락/.test(text)) {
    return 'uncertain';
  }
  return normalizeGraphLayer(fallback);
}

function graphNodeLabel(node) {
  return `${node.label || '인물'}${node.role ? ` · ${node.role}` : ''}`;
}

function graphLinkById(id) {
  return graphState.links.find((link) => link.id === id) ?? null;
}

function graphLinkIdFromEvent(event) {
  const target = event.target;
  if (!target?.closest) return '';
  return target.closest('[data-graph-link-id]')?.dataset?.graphLinkId || '';
}

function setGraphCreateMenuOpen(isOpen, worldPoint = null, screenPoint = null) {
  if (!dom.graphCreateMenu) return;

  if (!isOpen || !worldPoint) {
    graphCreatePoint = null;
    dom.graphCreateMenu.hidden = true;
    return;
  }

  graphCreatePoint = worldPoint;
  setGraphNodeMenuOpen(false);
  const rect = dom.graphCanvas.getBoundingClientRect();
  const anchor = screenPoint || graphWorldToScreen(worldPoint);
  const menuWidth = 178;
  const menuHeight = 116;
  const left = Math.max(12, Math.min(rect.width - menuWidth - 12, anchor.x + 10));
  const top = Math.max(12, Math.min(rect.height - menuHeight - 12, anchor.y + 10));

  dom.graphCreateMenu.style.left = `${left}px`;
  dom.graphCreateMenu.style.top = `${top}px`;
  dom.graphCreateMenu.hidden = false;
}

function setGraphNodeMenuOpen(isOpen, nodeId = '', screenPoint = null) {
  if (!dom.graphNodeMenu) return;

  if (!isOpen || !nodeId) {
    graphNodeMenuId = null;
    dom.graphNodeMenu.hidden = true;
    return;
  }

  const node = graphNodeById(nodeId);
  if (!node) {
    setGraphNodeMenuOpen(false);
    return;
  }

  graphNodeMenuId = node.id;
  setGraphCreateMenuOpen(false);
  const rect = dom.graphCanvas.getBoundingClientRect();
  const anchor = screenPoint || graphWorldToScreen(node);
  const menuWidth = 156;
  const menuHeight = 76;
  const left = Math.max(12, Math.min(rect.width - menuWidth - 12, anchor.x + 10));
  const top = Math.max(12, Math.min(rect.height - menuHeight - 12, anchor.y + 10));

  if (dom.graphNodeMenuTitle) {
    dom.graphNodeMenuTitle.textContent = `${node.label || '노드'} 작업`;
  }
  dom.graphNodeMenu.style.left = `${left}px`;
  dom.graphNodeMenu.style.top = `${top}px`;
  dom.graphNodeMenu.hidden = false;
}

function setGraphMarquee(rect) {
  if (!dom.graphMarquee) return;

  if (!rect) {
    dom.graphMarquee.hidden = true;
    return;
  }

  dom.graphMarquee.style.left = `${rect.left}px`;
  dom.graphMarquee.style.top = `${rect.top}px`;
  dom.graphMarquee.style.width = `${rect.width}px`;
  dom.graphMarquee.style.height = `${rect.height}px`;
  dom.graphMarquee.hidden = false;
}

function createGraphNode(x, y, kind = 'person') {
  const nodeKind = kind === 'event' ? 'event' : 'person';
  const isEvent = nodeKind === 'event';
  const sequence = isEvent ? graphState.nextEventNumber : graphState.nextNodeNumber;
  const id = `${nodeKind}-${Date.now()}-${sequence}`;
  const label = isEvent ? `주요 사건 ${sequence}` : `인물 ${sequence}`;
  const point = clampGraphWorldPoint({ x, y });
  const node = {
    id,
    kind: nodeKind,
    label,
    role: isEvent ? '사건' : '역할 미정',
    layer: isEvent ? 'core' : 'uncertain',
    note: '',
    analysisStatus: 'draft',
    x: point.x,
    y: point.y,
  };

  graphState = {
    ...graphState,
    nodes: [...graphState.nodes, node],
    selectedNodeId: id,
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? id : null,
    nextNodeNumber: isEvent ? graphState.nextNodeNumber : graphState.nextNodeNumber + 1,
    nextEventNumber: isEvent ? graphState.nextEventNumber + 1 : graphState.nextEventNumber,
  };

  setGraphCreateMenuOpen(false);
  renderAll();
}

function deleteGraphNode(nodeId) {
  const node = graphNodeById(nodeId);
  if (!node) return false;

  const nextLinks = graphState.links.filter((link) => link.source !== node.id && link.target !== node.id);
  graphState = {
    ...graphState,
    nodes: graphState.nodes.filter((item) => item.id !== node.id),
    links: nextLinks,
    clusters: (graphState.clusters || [])
      .map((cluster) => ({
        ...cluster,
        nodeIds: cluster.nodeIds.filter((id) => id !== node.id),
      }))
      .filter((cluster) => cluster.nodeIds.length >= 2),
    selectedNodeId: graphState.selectedNodeId === node.id ? null : graphState.selectedNodeId,
    selectedLinkId: graphState.selectedLinkId && nextLinks.some((link) => (
      link.id === graphState.selectedLinkId
    )) ? graphState.selectedLinkId : null,
    pendingLinkNodeId: graphState.pendingLinkNodeId === node.id ? null : graphState.pendingLinkNodeId,
  };

  setGraphNodeMenuOpen(false);
  renderAll();
  return true;
}

function createGraphCluster(nodes) {
  const selectedNodes = [...new Map(nodes.filter(Boolean).map((node) => [node.id, node])).values()];
  if (selectedNodes.length < 2) return null;

  const sequence = graphState.nextClusterNumber;
  const id = `cluster-${Date.now()}-${sequence}`;
  const columns = Math.ceil(Math.sqrt(selectedNodes.length));
  const rows = Math.ceil(selectedNodes.length / columns);
  const width = Math.max(360, Math.min(720, columns * 190 + 110));
  const height = Math.max(240, Math.min(560, rows * 132 + 106));
  const center = selectedNodes.reduce((acc, node) => ({
    x: acc.x + node.x / selectedNodes.length,
    y: acc.y + node.y / selectedNodes.length,
  }), { x: 0, y: 0 });
  const bounds = graphWorldBounds();
  const x = Math.max(bounds.minX + 24, Math.min(bounds.maxX - width - 24, center.x - width / 2));
  const y = Math.max(bounds.minY + 24, Math.min(bounds.maxY - height - 24, center.y - height / 2));
  const slotWidth = width / columns;
  const slotHeight = Math.max(108, (height - 82) / rows);
  const arrangedNodes = selectedNodes.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const nextPoint = clampGraphWorldPoint({
      x: x + slotWidth * column + slotWidth / 2,
      y: y + 74 + slotHeight * row + slotHeight / 2,
    });

    return {
      ...node,
      x: nextPoint.x,
      y: nextPoint.y,
      clusterId: id,
    };
  });
  const arrangedById = new Map(arrangedNodes.map((node) => [node.id, node]));
  const selectedNames = selectedNodes.map((node) => node.label || graphKindLabel(node.kind)).join(', ');
  const cluster = {
    id,
    label: `사안 묶음 ${sequence}`,
    nodeIds: selectedNodes.map((node) => node.id),
    note: `포섭 노드: ${selectedNames}`,
    x,
    y,
    width,
    height,
    createdAt: new Date().toISOString(),
  };

  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => arrangedById.get(node.id) || node),
    clusters: [...(graphState.clusters || []), cluster],
    selectedNodeId: selectedNodes[0]?.id ?? graphState.selectedNodeId,
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? selectedNodes[0]?.id ?? null : graphState.pendingLinkNodeId,
    nextClusterNumber: graphState.nextClusterNumber + 1,
  };

  renderAll();
  return cluster;
}

function setGraphMemoLayer(value) {
  graphMemoLayer = normalizeGraphLayer(value);
  dom.graphMemoLayerButtons?.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.graphMemoLayer === graphMemoLayer);
  });
}

function setGraphMemoOpen(isOpen) {
  if (isOpen) setGraphRelationOpen(false);
  if (isOpen) setGraphCreateMenuOpen(false);
  document.body.classList.toggle('is-graph-memo-open', isOpen);
  if (dom.graphMemoBackdrop) dom.graphMemoBackdrop.hidden = !isOpen;
  if (dom.graphMemoModal) {
    dom.graphMemoModal.hidden = !isOpen;
    dom.graphMemoModal.setAttribute('aria-hidden', String(!isOpen));
  }
  if (!isOpen) graphMemoNodeId = null;
}

function openGraphMemo(nodeId) {
  const node = graphNodeById(nodeId);
  if (!node) return;

  const isEvent = node.kind === 'event';
  graphMemoNodeId = node.id;
  if (dom.graphMemoKicker) dom.graphMemoKicker.textContent = isEvent ? '사건 노드 기록' : '인물 노드 기록';
  if (dom.graphMemoTitle) dom.graphMemoTitle.textContent = isEvent ? '주요 사건 정리' : '인물·주체 정리';
  if (dom.graphMemoNameLabel) dom.graphMemoNameLabel.textContent = isEvent ? '사건명' : '인물·주체명';
  if (dom.graphMemoRoleLabel) dom.graphMemoRoleLabel.textContent = isEvent ? '사건 유형' : '역할·관계';
  if (dom.graphMemoNoteLabel) dom.graphMemoNoteLabel.textContent = isEvent ? '사건 기록' : '인물 기록';
  if (dom.graphMemoHint) {
    dom.graphMemoHint.innerHTML = isEvent
      ? '사건 기록에는 <b>시점:</b>, <b>장소:</b>, <b>행위:</b>, <b>증거:</b>, <b>관련 인물:</b>을 쓰면 그래프와 보고서가 더 구체화됩니다.'
      : '인물 기록에는 <b>행위:</b>, <b>진술:</b>, <b>증거:</b>, <b>관련 인물:</b>을 쓰면 누락된 노드와 관계선이 보강됩니다.';
  }
  if (dom.graphMemoLabel) dom.graphMemoLabel.value = node.label || '';
  if (dom.graphMemoRole) dom.graphMemoRole.value = node.role || '';
  if (dom.graphMemoNote) dom.graphMemoNote.value = node.note || '';
  if (dom.graphMemoLabel) dom.graphMemoLabel.placeholder = isEvent ? '예: 6월 3일 면담, 자료 제출 요구' : '예: 인물 1, 기관명, 담당자';
  if (dom.graphMemoRole) dom.graphMemoRole.placeholder = isEvent ? '예: 발언, 제출, 충돌, 요청, 회의' : '예: 직접 행위자, 목격자, 관리자';
  if (dom.graphMemoNote) {
    dom.graphMemoNote.placeholder = isEvent
      ? '시점, 장소, 참여자, 행위 순서, 남은 증거를 적어주세요. 예: 시점: 6월 3일 / 장소: 교무실 / 행위: 자료 제출 요구 / 증거: 문자 캡처'
      : '행위, 진술, 증거, 관계 근거를 적어주세요. 예: 행위: 자료 요구 / 진술: 직접 들음 / 관련 인물: 홍길동';
  }
  setGraphMemoLayer(node.layer || 'uncertain');
  setGraphMemoOpen(true);
  requestAnimationFrame(() => dom.graphMemoNote?.focus());
}

function setGraphRelationStrength(value) {
  graphRelationStrength = normalizeGraphStrength(value);
  dom.graphRelationStrengthButtons?.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.graphRelationStrength === graphRelationStrength);
  });
}

function setGraphRelationOpen(isOpen) {
  if (isOpen) setGraphMemoOpen(false);
  if (isOpen) setGraphCreateMenuOpen(false);
  document.body.classList.toggle('is-graph-relation-open', isOpen);
  if (dom.graphRelationBackdrop) dom.graphRelationBackdrop.hidden = !isOpen;
  if (dom.graphRelationModal) {
    dom.graphRelationModal.hidden = !isOpen;
    dom.graphRelationModal.setAttribute('aria-hidden', String(!isOpen));
  }
  if (!isOpen) graphRelationId = null;
}

function openGraphRelation(linkId) {
  const link = graphLinkById(linkId);
  if (!link) return;

  graphRelationId = link.id;
  graphState = {
    ...graphState,
    selectedLinkId: link.id,
    selectedNodeId: null,
  };
  if (dom.graphRelationLabel) dom.graphRelationLabel.value = link.label || '관계';
  if (dom.graphRelationBasis) dom.graphRelationBasis.value = link.basis || '';
  setGraphRelationStrength(link.strength || 'weak');
  renderKnowledgeGraph();
  setGraphRelationOpen(true);
  requestAnimationFrame(() => dom.graphRelationLabel?.focus());
}

function saveGraphRelation({ status = 'draft' } = {}) {
  const link = graphLinkById(graphRelationId);
  if (!link) return null;

  const nextLink = {
    ...link,
    label: normalizeEntityName(dom.graphRelationLabel?.value) || '관계',
    basis: String(dom.graphRelationBasis?.value || '').trim().slice(0, 500),
    strength: graphRelationStrength,
    analysisStatus: status,
  };

  graphState = {
    ...graphState,
    links: graphState.links.map((item) => (item.id === link.id ? nextLink : item)),
    selectedLinkId: link.id,
    selectedNodeId: null,
  };
  renderAll();
  return nextLink;
}

function deleteGraphRelation() {
  const link = graphLinkById(graphRelationId);
  if (!link) return false;

  graphState = {
    ...graphState,
    links: graphState.links.filter((item) => item.id !== link.id),
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? link.source : graphState.pendingLinkNodeId,
  };
  renderAll();
  return true;
}

function normalizeEntityName(value) {
  return String(value || '')
    .replace(/["'“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);
}

function parseRelatedEntityNames(note, currentLabel = '') {
  const names = [];
  const current = normalizeEntityName(currentLabel);
  const lines = String(note || '').split('\n');

  lines.forEach((line) => {
    const match = line.match(/(?:관련\s*인물|추가\s*인물|상대|목격자|방관자|기관|장소|관련\s*주체)\s*[:：]\s*(.+)/i);
    if (!match) return;
    match[1]
      .split(/[,，、/|·ㆍ;]/)
      .map(normalizeEntityName)
      .filter((name) => name && name !== current && name.length >= 2)
      .forEach((name) => {
        if (!names.includes(name)) names.push(name);
      });
  });

  return names.slice(0, 5);
}

function findGraphNodeByLabel(label) {
  const normalized = normalizeEntityName(label).toLowerCase();
  return graphState.nodes.find((node) => normalizeEntityName(node.label).toLowerCase() === normalized) ?? null;
}

function splitGraphValues(value) {
  return String(value || '')
    .split(/[,，、/|;]/)
    .map(normalizeEntityName)
    .filter((item) => item.length >= 2)
    .slice(0, 6);
}

function parseGraphMemoField(note, keys) {
  const values = [];
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:${keyPattern})\\s*[:：]\\s*(.+)`, 'i');

  String(note || '').split('\n').forEach((line) => {
    const match = line.match(pattern);
    if (!match) return;
    splitGraphValues(match[1]).forEach((item) => {
      if (!values.includes(item)) values.push(item);
    });
  });

  return values.slice(0, 6);
}

function addGraphMemoRelatedNodes(sourceNode, relatedNames) {
  if (!sourceNode || !relatedNames.length || !dom.graphCanvas) return [];

  const rect = dom.graphCanvas.getBoundingClientRect();
  const created = [];
  let nextNumber = graphState.nextNodeNumber;
  const nextNodes = [...graphState.nodes];
  const nextLinks = [...graphState.links];
  const radius = 190;

  relatedNames.forEach((name, index) => {
    let target = findGraphNodeByLabel(name);

    if (!target) {
      const angle = (-70 + index * 32) * (Math.PI / 180);
      target = {
        id: `person-${Date.now()}-${nextNumber}-${index}`,
        kind: 'person',
        label: name,
        role: '메모 언급',
        layer: 'support',
        note: `${sourceNode.label} 메모에서 언급됨`,
        analysisStatus: 'draft',
        x: Math.max(86, Math.min(rect.width - 86, sourceNode.x + Math.cos(angle) * radius)),
        y: Math.max(52, Math.min(rect.height - 52, sourceNode.y + Math.sin(angle) * radius)),
      };
      nextNumber += 1;
      nextNodes.push(target);
      created.push(name);
    }

    const exists = nextLinks.some((link) => (
      (link.source === sourceNode.id && link.target === target.id)
      || (link.source === target.id && link.target === sourceNode.id)
    ));

    if (!exists) {
      nextLinks.push({
        id: `link-${Date.now()}-${index}`,
        source: sourceNode.id,
        target: target.id,
        label: '메모 연결',
        basis: `${sourceNode.label} 메모에서 ${name} 언급`,
        strength: 'likely',
      });
    }
  });

  graphState = {
    ...graphState,
    nodes: nextNodes,
    links: nextLinks,
    nextNodeNumber: nextNumber,
  };

  return created;
}

function graphAutoNodePosition(sourceNode, index, distance = 210) {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  const width = rect?.width || 900;
  const height = rect?.height || 520;
  const angle = (-120 + index * 38) * (Math.PI / 180);

  return {
    x: Math.max(86, Math.min(width - 86, sourceNode.x + Math.cos(angle) * distance)),
    y: Math.max(52, Math.min(height - 52, sourceNode.y + Math.sin(angle) * distance)),
  };
}

function getOrCreateGraphNode({ label, role, layer = 'support', note = '', kind = 'person', aroundNode, index = 0 }) {
  const normalizedLabel = normalizeEntityName(label);
  if (!normalizedLabel) return null;

  const existing = findGraphNodeByLabel(normalizedLabel);
  if (existing) return existing;

  const nodeKind = kind === 'event' ? 'event' : 'person';
  const position = aroundNode
    ? graphAutoNodePosition(aroundNode, index)
    : { x: 160 + index * 34, y: 120 + index * 28 };
  const node = {
    id: `${nodeKind}-${Date.now()}-${graphState.nextNodeNumber}-${index}`,
    kind: nodeKind,
    label: normalizedLabel,
    role: normalizeEntityName(role) || '관련 주체',
    layer: normalizeGraphLayer(layer),
    note: String(note || '').slice(0, 160),
    analysisStatus: 'draft',
    x: position.x,
    y: position.y,
  };

  graphState = {
    ...graphState,
    nodes: [...graphState.nodes, node],
    nextNodeNumber: graphState.nextNodeNumber + 1,
  };

  return node;
}

function upsertGraphLink({ sourceId, targetId, label = '관계', basis = '', strength = 'weak' }) {
  if (!sourceId || !targetId || sourceId === targetId) return null;

  const existing = graphState.links.find((link) => (
    (link.source === sourceId && link.target === targetId)
    || (link.source === targetId && link.target === sourceId)
  ));

  if (existing) {
    const nextLink = {
      ...existing,
      label: normalizeEntityName(label) || existing.label || '관계',
      basis: String(basis || existing.basis || '').slice(0, 500),
      strength: normalizeGraphStrength(strength || existing.strength),
    };

    graphState = {
      ...graphState,
      links: graphState.links.map((link) => (link.id === existing.id ? nextLink : link)),
      selectedLinkId: nextLink.id,
    };

    return nextLink;
  }

  const link = {
    id: `link-${Date.now()}-${graphState.links.length + 1}`,
    source: sourceId,
    target: targetId,
    label: normalizeEntityName(label) || '관계',
    basis: String(basis || '').slice(0, 500),
    strength: normalizeGraphStrength(strength),
  };

  graphState = {
    ...graphState,
    links: [...graphState.links, link],
    selectedLinkId: link.id,
  };

  return link;
}

function enrichKnowledgeGraphFromMemo(saved, responseText = '') {
  const source = graphNodeById(saved?.node?.id);
  if (!source) return;

  const note = [source.note, responseText].filter(Boolean).join('\n');
  const evidenceItems = parseGraphMemoField(note, ['증거', '보유 증거', '자료', '문서', 'PDF', '녹취', '카톡', '문자', '메일']);
  const actionItems = parseGraphMemoField(note, ['행위', '핵심 행위', '문제 행위', '발언', '요구', '요청']);
  const contextItems = [
    ...parseGraphMemoField(note, ['시점', '일시', '날짜', '시간']),
    ...parseGraphMemoField(note, ['장소', '공간', '채널']),
  ].slice(0, 6);

  const createdNodes = [];
  evidenceItems.forEach((item, index) => {
    const node = getOrCreateGraphNode({
      label: item,
      role: '증거 자료',
      layer: 'support',
      kind: 'event',
      note: `${source.label} 관련 증거`,
      aroundNode: source,
      index: index + 1,
    });
    if (node) {
      createdNodes.push(node.id);
      upsertGraphLink({
        sourceId: source.id,
        targetId: node.id,
        label: '증거 연결',
        basis: item,
        strength: 'confirmed',
      });
    }
  });

  actionItems.forEach((item, index) => {
    const node = getOrCreateGraphNode({
      label: item,
      role: '행위',
      layer: 'core',
      kind: 'event',
      note: `${source.label} 메모에서 분리된 행위`,
      aroundNode: source,
      index: index + evidenceItems.length + 1,
    });
    if (node) {
      createdNodes.push(node.id);
      upsertGraphLink({
        sourceId: source.id,
        targetId: node.id,
        label: '행위 연결',
        basis: item,
        strength: /확인|증거|녹취|문서|캡처/.test(note) ? 'likely' : 'weak',
      });
    }
  });

  contextItems.forEach((item, index) => {
    const node = getOrCreateGraphNode({
      label: item,
      role: '시점·장소',
      layer: 'support',
      kind: 'event',
      note: `${source.label} 관련 맥락`,
      aroundNode: source,
      index: index + evidenceItems.length + actionItems.length + 1,
    });
    if (node) {
      createdNodes.push(node.id);
      upsertGraphLink({
        sourceId: source.id,
        targetId: node.id,
        label: '발생 맥락',
        basis: item,
        strength: 'likely',
      });
    }
  });

  graphState = {
    ...graphState,
    selectedNodeId: source.id,
    selectedLinkId: graphState.selectedLinkId,
    nodes: graphState.nodes.map((node) => (
      node.id === source.id
        ? {
            ...node,
            layer: inferGraphLayerFromMemo(note, node.layer),
            analysisStatus: 'synced',
            note: node.note,
          }
        : createdNodes.includes(node.id)
          ? { ...node, analysisStatus: 'synced' }
          : node
    )),
  };
}

function enrichKnowledgeGraphFromRelation(saved, responseText = '') {
  const link = graphLinkById(saved?.link?.id);
  if (!link) return;

  const source = graphNodeById(link.source);
  const target = graphNodeById(link.target);
  if (!source || !target) return;

  const center = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
  const note = [link.label, link.basis, source.note, target.note, responseText].filter(Boolean).join('\n');
  const evidenceItems = parseGraphMemoField(note, ['증거', '보유 증거', '자료', '문서', 'PDF', '녹취', '카톡', '문자', '메일']);
  const actionItems = parseGraphMemoField(note, ['행위', '핵심 행위', '문제 행위', '발언', '요구', '요청']);
  const contextItems = [
    ...parseGraphMemoField(note, ['시점', '일시', '날짜', '시간']),
    ...parseGraphMemoField(note, ['장소', '공간', '채널']),
  ].slice(0, 5);

  const createdNodes = [];
  const attachToRelation = (node, label, basis, strength = 'likely') => {
    if (!node) return;
    createdNodes.push(node.id);
    upsertGraphLink({
      sourceId: source.id,
      targetId: node.id,
      label,
      basis,
      strength,
    });
    upsertGraphLink({
      sourceId: target.id,
      targetId: node.id,
      label,
      basis,
      strength,
    });
  };

  evidenceItems.forEach((item, index) => {
    attachToRelation(
      getOrCreateGraphNode({
        label: item,
        role: '관계 증거',
        layer: 'support',
        kind: 'event',
        note: `${source.label} - ${target.label} 관계 근거`,
        aroundNode: center,
        index: index + 1,
      }),
      '관계 증거',
      item,
      'confirmed'
    );
  });

  actionItems.forEach((item, index) => {
    attachToRelation(
      getOrCreateGraphNode({
        label: item,
        role: '관계 행위',
        layer: 'core',
        kind: 'event',
        note: `${source.label} - ${target.label} 사이의 행위`,
        aroundNode: center,
        index: index + evidenceItems.length + 1,
      }),
      '관계 행위',
      item,
      /확인|증거|녹취|문서|캡처/.test(note) ? 'likely' : 'weak'
    );
  });

  contextItems.forEach((item, index) => {
    attachToRelation(
      getOrCreateGraphNode({
        label: item,
        role: '관계 맥락',
        layer: 'support',
        kind: 'event',
        note: `${source.label} - ${target.label} 관계 맥락`,
        aroundNode: center,
        index: index + evidenceItems.length + actionItems.length + 1,
      }),
      '관계 맥락',
      item,
      'likely'
    );
  });

  graphState = {
    ...graphState,
    selectedNodeId: null,
    selectedLinkId: link.id,
    links: graphState.links.map((item) => (
      item.id === link.id
        ? {
            ...item,
            analysisStatus: 'synced',
            strength: item.basis ? item.strength : normalizeGraphStrength(note),
            analyzedAt: new Date().toISOString(),
          }
        : item
    )),
    nodes: graphState.nodes.map((node) => (
      createdNodes.includes(node.id) ? { ...node, analysisStatus: 'synced' } : node
    )),
  };
}

function saveGraphMemo({ status = 'draft' } = {}) {
  const node = graphNodeById(graphMemoNodeId);
  if (!node) return null;

  const note = String(dom.graphMemoNote?.value ?? '').trim().slice(0, 1600);
  const label = normalizeEntityName(dom.graphMemoLabel?.value) || node.label;
  const role = normalizeEntityName(dom.graphMemoRole?.value) || '역할 미정';
  const layer = inferGraphLayerFromMemo(note, graphMemoLayer);

  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((item) => (
      item.id === node.id
        ? {
            ...item,
            label,
            role,
            layer,
            note,
            analysisStatus: status,
            memoUpdatedAt: new Date().toISOString(),
          }
        : item
    )),
    selectedNodeId: node.id,
    pendingLinkNodeId: graphState.linkMode ? node.id : graphState.pendingLinkNodeId,
  };

  const updatedNode = graphNodeById(node.id);
  const relatedNames = parseRelatedEntityNames(note, label);
  const createdNames = addGraphMemoRelatedNodes(updatedNode, relatedNames);
  renderAll();

  return {
    node: graphNodeById(node.id),
    relatedNames,
    createdNames,
  };
}

function buildGraphMemoAgentMessage(saved) {
  const node = saved?.node;
  if (!node) return '';
  const isEvent = node.kind === 'event';
  const recordTitle = isEvent ? '[사건 노드 기록]' : '[인물 노드 기록]';

  return [
    recordTitle,
    `${isEvent ? '사건명' : '인물·주체명'}: ${node.label}`,
    `${isEvent ? '사건 유형' : '역할·관계'}: ${node.role}`,
    `분류: ${graphLayerLabel(node.layer)}`,
    `${isEvent ? '사건 기록' : '인물 기록'}: ${node.note || '확인 필요'}`,
    saved.relatedNames?.length ? `메모에서 연결된 관련 주체: ${saved.relatedNames.join(', ')}` : '메모에서 연결된 관련 주체: 없음',
    saved.createdNames?.length ? `새로 추가된 보조 노드: ${saved.createdNames.join(', ')}` : '새로 추가된 보조 노드: 없음',
    '',
    '요청:',
    isEvent
      ? '- 이 사건 노드를 시간·장소·참여자·행위 순서·증거의 관점에서 입체적으로 재구성해줘.'
      : '- 이 인물 노드를 역할·행위·진술·증거·다른 노드와의 관계 관점에서 입체적으로 재구성해줘.',
    '- 왼쪽 상황 시각화 보드에는 사건 노드 기록, 인물 노드 기록, 관계 기록이 구분되어 보이도록 정리해줘.',
    '- 사안보고서는 짧은 문단과 표 중심으로 가독성 좋게 작성하고, 사실·주장·추정·확인 필요를 분리해줘.',
    '- 노드 기록에서 확인 가능한 행위, 증거, 시점, 장소, 관계 근거를 증거-사실-행위 연결표에 반영해줘.',
    '- 그래프 보강 단서는 가능하면 "증거:", "행위:", "시점:", "장소:", "관련 인물:" 형식으로 짧게 남겨줘.',
  ].join('\n');
}

function graphSnapshotForAgent() {
  return {
    nodes: graphState.nodes.map((node) => ({
      id: node.id,
      kind: node.kind || 'person',
      label: node.label,
      role: node.role,
      layer: node.layer,
      note: node.note,
      clusterId: node.clusterId || '',
    })),
    links: graphState.links.map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      label: link.label,
      strength: link.strength,
      basis: link.basis,
    })),
    clusters: (graphState.clusters || []).map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      nodeIds: cluster.nodeIds,
      nodeLabels: cluster.nodeIds
        .map(graphNodeById)
        .filter(Boolean)
        .map((node) => node.label),
      note: cluster.note,
    })),
  };
}

function buildGraphNodeStructuredInput(saved) {
  const node = saved?.node;
  if (!node) return null;
  const isEvent = node.kind === 'event';

  return {
    kind: isEvent ? 'event_node' : 'person_node',
    schemaVersion: 1,
    node: {
      id: node.id,
      type: node.kind || 'person',
      label: node.label,
      role: node.role,
      layer: node.layer,
      note: node.note,
      relatedNames: saved.relatedNames || [],
      createdNames: saved.createdNames || [],
      parsed: {
        evidence: parseGraphMemoField(node.note, ['증거', '보유 증거', '자료', '문서', 'PDF', '녹취', '카톡', '문자', '메일']),
        actions: parseGraphMemoField(node.note, ['행위', '핵심 행위', '문제 행위', '발언', '요구', '요청', '진술']),
        time: parseGraphMemoField(node.note, ['시점', '일시', '날짜', '시간']),
        place: parseGraphMemoField(node.note, ['장소', '공간', '채널']),
        relatedPeople: parseRelatedEntityNames(node.note, node.label),
      },
    },
    analysisFocus: isEvent
      ? ['time_place_sequence', 'participants', 'acts', 'evidence_basis', 'unknown_slots']
      : ['role', 'acts', 'statements', 'evidence_basis', 'relationships', 'unknown_slots'],
    graphSnapshot: graphSnapshotForAgent(),
  };
}

function buildGraphRelationAgentMessage(saved) {
  const link = saved?.link;
  if (!link) return '';
  const source = graphNodeById(link.source);
  const target = graphNodeById(link.target);
  if (!source || !target) return '';

  return [
    '[관계 기록]',
    `출발 노드: ${source.label} (${graphKindLabel(source.kind)} · ${source.role || '역할 미정'})`,
    `도착 노드: ${target.label} (${graphKindLabel(target.kind)} · ${target.role || '역할 미정'})`,
    `관계명: ${link.label || '관계'}`,
    `관계 상태: ${graphStrengthLabel(link.strength)}`,
    `관계 근거: ${link.basis || '확인 필요'}`,
    '',
    '[출발 노드 기록]',
    source.note || '확인 필요',
    '',
    '[도착 노드 기록]',
    target.note || '확인 필요',
    '',
    '요청:',
    '- 위 두 노드 사이의 관계를 사실·주장·추정·확인 필요로 분해해줘.',
    '- 관계가 어떤 증거, 진술, 시간, 장소, 행위 흐름으로 뒷받침되는지 구조화해줘.',
    '- 관계 기록을 왼쪽 상황 시각화 보드와 사안보고서의 관계 구조, 증거-사실-행위 연결표에 반영해줘.',
    '- 관계의 강도는 법적 판단이 아니라 자료상 연결 정도로만 표현해줘.',
    '- 그래프 보강 단서는 가능하면 "증거:", "행위:", "시점:", "장소:", "관련 인물:" 형식으로 짧게 남겨줘.',
  ].join('\n');
}

function buildGraphRelationStructuredInput(saved) {
  const link = saved?.link;
  if (!link) return null;
  const source = graphNodeById(link.source);
  const target = graphNodeById(link.target);
  if (!source || !target) return null;

  return {
    kind: 'relation_record',
    schemaVersion: 1,
    relation: {
      id: link.id,
      label: link.label || '관계',
      strength: link.strength || 'weak',
      strengthLabel: graphStrengthLabel(link.strength),
      basis: link.basis || '',
      source: {
        id: source.id,
        type: source.kind || 'person',
        label: source.label,
        role: source.role,
        note: source.note,
      },
      target: {
        id: target.id,
        type: target.kind || 'person',
        label: target.label,
        role: target.role,
        note: target.note,
      },
      parsed: {
        evidence: parseGraphMemoField(link.basis, ['증거', '자료', '문서', 'PDF', '녹취', '카톡', '문자', '메일']),
        actions: parseGraphMemoField(link.basis, ['행위', '발언', '요구', '요청', '진술']),
        time: parseGraphMemoField(link.basis, ['시점', '일시', '날짜', '시간']),
        place: parseGraphMemoField(link.basis, ['장소', '공간', '채널']),
      },
    },
    analysisFocus: ['connection_basis', 'fact_claim_inference_split', 'evidence_to_action_link', 'contradictions', 'unknown_slots'],
    graphSnapshot: graphSnapshotForAgent(),
  };
}

async function toggleGraphLink(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;

  const sourceNode = graphNodeById(sourceId);
  const targetNode = graphNodeById(targetId);
  if (!sourceNode || !targetNode) return;

  const exists = graphState.links.find((link) => (
    (link.source === sourceId && link.target === targetId)
    || (link.source === targetId && link.target === sourceId)
  ));

  if (exists) {
    graphState = {
      ...graphState,
      selectedNodeId: null,
      selectedLinkId: exists.id,
      pendingLinkNodeId: graphState.linkMode ? targetId : null,
    };
    renderAll();
    openGraphRelation(exists.id);
    return;
  }

  const confirmed = await requestGraphConfirm({
    title: '관계선을 만들까요?',
    message: `${sourceNode.label} ↔ ${targetNode.label} 사이에 새 관계선을 생성합니다.`,
    detail: '생성 후 관계선을 더블클릭하면 관계명, 근거, 연결 강도를 입력하고 에이전트에게 반영할 수 있습니다.',
    okLabel: '관계선 생성',
  });

  if (!confirmed) {
    graphState = {
      ...graphState,
      selectedNodeId: targetId,
      selectedLinkId: null,
      pendingLinkNodeId: graphState.linkMode ? targetId : null,
    };
    renderAll();
    setServiceStatus('관계선 생성을 취소했습니다.', 'ready');
    return;
  }

  const link = upsertGraphLink({
    sourceId,
    targetId,
    label: '관계',
    basis: '',
    strength: 'weak',
  });

  graphState = {
    ...graphState,
    selectedNodeId: null,
    selectedLinkId: link?.id ?? null,
    pendingLinkNodeId: graphState.linkMode ? targetId : null,
  };
  renderAll();
  setServiceStatus('관계선을 생성했습니다. 관계선을 더블클릭해 근거를 입력할 수 있습니다.', 'ready');
}

async function selectGraphNode(id) {
  if (graphState.linkMode && graphState.pendingLinkNodeId && graphState.pendingLinkNodeId !== id) {
    await toggleGraphLink(graphState.pendingLinkNodeId, id);
    return;
  }

  graphState = {
    ...graphState,
    selectedNodeId: id,
    selectedLinkId: null,
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
      const basis = link.basis ? ` · 근거: ${link.basis}` : '';
      return `${source.label} ↔ ${target.label} (${link.label || '관계'} · ${graphStrengthLabel(link.strength)})${basis}`;
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
  const clusters = graphState.clusters || [];
  const selected = graphNodeById(graphState.selectedNodeId);
  const relations = graphRelationList();
  const isolated = graphIsolatedNodes();
  const eventNodes = graphState.nodes.filter((node) => node.kind === 'event');
  const personNodes = graphState.nodes.filter((node) => node.kind !== 'event');

  if (!nodeCount) {
    return [
      '## 상황 시각화 보드',
      '',
      '- 아직 생성된 노드가 없습니다.',
      '- 사건 평면의 빈 곳을 클릭해 인물 또는 주요 사건 노드를 만들고 관계선을 연결하세요.',
      '- 노드 유형, 역할, 메모, 연결 상태가 이 보고서에 반영됩니다.',
    ].join('\n');
  }

  const density = nodeCount <= 1 ? '판단 보류' : `${linkCount}/${Math.round((nodeCount * (nodeCount - 1)) / 2)} 연결`;

  return [
    '## 상황 시각화 보드',
    '',
    `- 현재 노드: ${nodeCount}개`,
    `- 사건 노드: ${eventNodes.length}개`,
    `- 인물 노드: ${personNodes.length}개`,
    `- 현재 관계선: ${linkCount}개`,
    `- 클러스터: ${clusters.length}개`,
    `- 관계 밀도: ${density}`,
    selected ? `- 선택 노드: ${graphNodeLabel(selected)}` : '- 선택 노드: 없음',
    '',
    '### 사건 노드 기록',
    ...(eventNodes.length ? eventNodes.map((node) => [
      `- ${graphNodeLabel(node)}`,
      `  - 유형: ${graphKindLabel(node.kind)}`,
      `  - 분류: ${graphLayerLabel(node.layer)}`,
      node.note ? `  - 메모: ${node.note}` : '  - 메모: 확인 필요',
    ].join('\n')) : ['- 아직 사건 노드가 없습니다.']),
    '',
    '### 인물 노드 기록',
    ...(personNodes.length ? personNodes.map((node) => [
      `- ${graphNodeLabel(node)}`,
      `  - 유형: ${graphKindLabel(node.kind)}`,
      `  - 분류: ${graphLayerLabel(node.layer)}`,
      node.note ? `  - 메모: ${node.note}` : '  - 메모: 확인 필요',
    ].join('\n')) : ['- 아직 인물 노드가 없습니다.']),
    '',
    '### 관계 기록',
    ...(relations.length ? relations.map((item) => `- ${item}`) : ['- 아직 연결된 관계선이 없습니다.']),
    '',
    '### 클러스터 기록',
    ...(clusters.length
      ? clusters.map((cluster) => {
          const names = cluster.nodeIds
            .map(graphNodeById)
            .filter(Boolean)
            .map((node) => graphNodeLabel(node));
          return `- ${cluster.label}: ${names.join(' / ') || '확인 필요'}${cluster.note ? ` · ${cluster.note}` : ''}`;
        })
      : ['- 아직 생성된 클러스터가 없습니다.']),
    '',
    '### 관계선 근거 표',
    ...(graphState.links.length
      ? [
          '| 출발 | 도착 | 관계 | 상태 | 근거 |',
          '|---|---|---|---|---|',
          ...graphState.links.map((link) => {
            const source = graphNodeById(link.source);
            const target = graphNodeById(link.target);
            return `| ${source?.label || '미상'} | ${target?.label || '미상'} | ${link.label || '관계'} | ${graphStrengthLabel(link.strength)} | ${link.basis || '확인 필요'} |`;
          }),
        ]
      : ['- 관계선 근거가 아직 없습니다.']),
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
- 파란 반투명 클러스터 영역은 사용자가 같은 맥락으로 묶은 노드 집합이다. 클러스터는 별도 인물이 아니라 사안 묶음으로 다룬다.
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
      const selectedClass = link.id === graphState.selectedLinkId ? ' is-selected' : '';
      const strengthClass = ` is-${normalizeGraphStrength(link.strength)}`;
      const statusClass = link.analysisStatus ? ` is-${link.analysisStatus}` : '';
      const statusLabel = link.analysisStatus === 'synced'
        ? '보고서 반영'
        : link.analysisStatus === 'analyzing'
          ? '분석 중'
          : link.analysisStatus === 'failed'
            ? '확인 필요'
            : graphStrengthLabel(link.strength);
      return `
        <g class="case-graph-link-group${selectedClass}${strengthClass}${statusClass}" data-graph-link-id="${escapeHtml(link.id)}">
          <line class="case-graph-link-hit" data-graph-link-id="${escapeHtml(link.id)}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"></line>
          <line class="case-graph-link" data-graph-link-id="${escapeHtml(link.id)}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"></line>
          <text class="case-graph-link-label" data-graph-link-id="${escapeHtml(link.id)}" x="${midX}" y="${midY - 6}" text-anchor="middle">${escapeHtml(link.label || '관계')}</text>
          <text class="case-graph-link-strength" data-graph-link-id="${escapeHtml(link.id)}" x="${midX}" y="${midY + 9}" text-anchor="middle">${escapeHtml(statusLabel)}</text>
        </g>
      `;
    })
    .join('');
  dom.graphLinks.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);

  dom.graphNodes.innerHTML = '';
  (graphState.clusters || []).forEach((cluster) => {
    const clusterNodes = cluster.nodeIds
      .map(graphNodeById)
      .filter(Boolean);
    if (clusterNodes.length < 2) return;

    const area = document.createElement('section');
    area.className = 'case-graph-cluster-area';
    area.style.left = `${cluster.x}px`;
    area.style.top = `${cluster.y}px`;
    area.style.width = `${cluster.width}px`;
    area.style.height = `${cluster.height}px`;
    area.dataset.graphClusterId = cluster.id;
    area.innerHTML = `
      <div>
        <span>클러스터</span>
        <strong>${escapeHtml(cluster.label)}</strong>
      </div>
      <small>${escapeHtml(clusterNodes.map((node) => node.label).join(' · '))}</small>
    `;
    dom.graphNodes.append(area);
  });

  graphState.nodes.forEach((node) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'case-graph-node',
      `is-kind-${node.kind || 'person'}`,
      `is-${node.layer || 'uncertain'}`,
      node.analysisStatus === 'analyzing' ? 'is-analyzing' : '',
      node.analysisStatus === 'synced' ? 'is-synced' : '',
      node.analysisStatus === 'failed' ? 'is-failed' : '',
      node.clusterNodeIds?.length ? 'is-cluster' : '',
      node.clusterId ? 'is-in-cluster' : '',
      node.id === graphState.selectedNodeId ? 'is-selected' : '',
      node.id === graphState.pendingLinkNodeId ? 'is-pending' : '',
    ].filter(Boolean).join(' ');
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;
    button.dataset.graphNodeId = node.id;
    button.innerHTML = `
      <i>${escapeHtml(graphKindLabel(node.kind))}</i>
      <b>${escapeHtml(node.label)}</b>
      <span>${escapeHtml(node.role)}</span>
      <em>${escapeHtml(node.note || '더블클릭으로 사건 메모 입력')}</em>
      ${node.analysisStatus === 'synced' ? '<u>보고서 반영</u>' : ''}
      ${node.analysisStatus === 'analyzing' ? '<u>분석 중</u>' : ''}
      ${node.analysisStatus === 'failed' ? '<u>확인 필요</u>' : ''}
    `;
    dom.graphNodes.append(button);
  });

  dom.graphEmpty?.classList.toggle('is-hidden', graphState.nodes.length > 0);
  dom.graphLinkMode?.classList.toggle('is-active', graphState.linkMode);
  dom.graphLinkMode && (dom.graphLinkMode.textContent = graphState.linkMode ? '관계선 모드 켜짐' : '관계선 모드 꺼짐');
  applyGraphViewport();

  if (dom.graphInspector) {
    const selected = graphNodeById(graphState.selectedNodeId);
    const selectedLink = graphLinkById(graphState.selectedLinkId);
    const isolated = graphIsolatedNodes();
    dom.graphInspector.innerHTML = selectedLink
      ? `
        <span>선택 관계선</span>
        <strong>${escapeHtml(selectedLink.label || '관계')} · ${escapeHtml(graphStrengthLabel(selectedLink.strength))}</strong>
        <p>${escapeHtml(selectedLink.basis || '관계선 근거를 더블클릭으로 입력하세요.')}</p>
        ${selectedLink.analysisStatus === 'synced' ? '<small>관계 기록 반영 완료</small>' : ''}
        ${selectedLink.analysisStatus === 'analyzing' ? '<small>관계 기록 분석 중</small>' : ''}
        ${selectedLink.analysisStatus === 'failed' ? '<small>관계 기록 반영 실패</small>' : ''}
        <small>관계선을 더블클릭하면 근거와 상태를 편집할 수 있습니다.</small>
      `
      : selected
      ? `
        <span>선택 노드</span>
        <strong>${escapeHtml(graphNodeLabel(selected))}</strong>
        <p>${escapeHtml(graphKindLabel(selected.kind))} · ${escapeHtml(graphLayerLabel(selected.layer))}${selected.note ? ` · ${escapeHtml(selected.note)}` : ' · 더블클릭으로 행위, 증거, 시점 메모를 입력하세요.'}</p>
        ${selected.analysisStatus === 'synced' ? '<small>에이전트 반영 완료</small>' : ''}
        ${selected.analysisStatus === 'analyzing' ? '<small>에이전트 분석 중</small>' : ''}
        ${selected.analysisStatus === 'failed' ? '<small>반영 실패 · 다시 시도 필요</small>' : ''}
      `
      : `
        <span>그래프 상태</span>
        <strong>${graphState.nodes.length}개 노드 · 관계 ${graphState.links.length}개 · 클러스터 ${(graphState.clusters || []).length}개</strong>
        <p>${isolated.length ? `${isolated.length}개 노드는 아직 다른 노드와 연결되지 않았습니다.` : '모든 노드가 최소 1개 관계선으로 연결되어 있습니다.'}</p>
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

  const previousActiveId = activeConversation?.id;
  let response;
  try {
    response = await withTimeout(
      supabase
        .from('report_conversations')
        .select(conversationListSelect)
        .order('updated_at', { ascending: false })
        .limit(30),
      22000,
      '저장된 사안 기록을 불러오는 중 응답이 지연되고 있습니다.'
    );
  } catch (error) {
    setServiceStatus(error instanceof Error ? `${error.message} 잠시 뒤 기록 버튼을 다시 눌러 주세요.` : '저장된 사안 기록을 불러오지 못했습니다.', 'error');
    return;
  }

  const { data, error } = response;

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  conversations = data ?? [];
  activeConversation = conversations.find((conversation) => conversation.id === previousActiveId) ?? conversations[0] ?? null;
  if (activeConversation?.id) {
    await loadConversationDetail(activeConversation.id, { silent: true });
  }
  await loadMessages();
  renderAll();
}

async function loadConversationDetail(id, { silent = false } = {}) {
  if (!session?.user || !supabase || !id || String(id).startsWith('local-')) return null;

  let response;
  try {
    response = await withTimeout(
      supabase
        .from('report_conversations')
        .select(conversationDetailSelect)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single(),
      18000,
      '선택한 사안 본문을 불러오는 중 응답이 지연되고 있습니다.'
    );
  } catch (error) {
    if (!silent) {
      setServiceStatus(error instanceof Error ? error.message : '선택한 사안 본문을 불러오지 못했습니다.', 'error');
    }
    return null;
  }

  const { data, error } = response;
  if (error) {
    if (!silent) setServiceStatus(error.message, 'error');
    return null;
  }

  activeConversation = data;
  conversations = conversations.map((conversation) => (
    conversation.id === data.id
      ? { ...conversation, ...data }
      : conversation
  ));

  return data;
}

async function loadUsage({ preserveOnError = true } = {}) {
  if (!session?.user || !supabase) {
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  let usageResponse;
  try {
    usageResponse = await withTimeout(
      supabase.rpc('get_my_report_usage'),
      12000,
      '사용량 정보를 확인하는 중 응답이 지연되고 있습니다.'
    );
  } catch {
    usageResponse = { data: null, error: true };
  }

  const { data: usageData, error: usageError } = usageResponse;

  if (!usageError && usageData) {
    applyUsageState(usageData);
    return;
  }

  let membershipResponse;
  try {
    membershipResponse = await withTimeout(
      supabase
        .from('user_memberships')
        .select('tier')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      12000,
      '권한 정보를 확인하는 중 응답이 지연되고 있습니다.'
    );
  } catch {
    membershipResponse = { data: null, error: true };
  }

  const { data: membership, error: membershipError } = membershipResponse;

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

  let response;
  try {
    response = await withTimeout(
      supabase
        .from('report_messages')
        .select('id, conversation_id, role, content, created_at')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true }),
      15000,
      '대화 기록을 불러오는 중 응답이 지연되고 있습니다.'
    );
  } catch (error) {
    setServiceStatus(error instanceof Error ? error.message : '대화 기록을 불러오지 못했습니다.', 'error');
    return;
  }

  const { data, error } = response;

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
  await loadConversationDetail(id, { silent: false });
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

async function invokeChat({ message = '', forceReport = false, structuredInput = null } = {}) {
  if (desktopOnlyMedia.matches) {
    const reason = 'RoosyCozy Intelligence는 PC 브라우저에서만 사용할 수 있습니다.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  if (evidenceFiles.some((item) => item.status === 'extracting' || item.status === 'queued')) {
    const reason = 'PDF 본문을 읽는 중입니다. 추출이 끝난 뒤 다시 시도해 주세요.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  const activeSession = session?.user ? session : await restoreSessionIfAvailable(true);

  if (!activeSession?.user) {
    const reason = '로그인 후 대화할 수 있습니다.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  if (!hasWorkspaceAccess()) {
    const reason = '권한 필요: Teacher 또는 PRO 승인 계정만 분석 워크스페이스를 사용할 수 있습니다.';
    setServiceStatus(reason, 'error');
    syncInteractionState();
    return { ok: false, reason };
  }

  if (!supabase) {
    const reason = 'Supabase 연결 설정을 확인해 주세요.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }
  if (!message.trim() && !forceReport) {
    return { ok: false, reason: '분석할 내용이 없습니다.' };
  }

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
    structuredInputKind: structuredInput?.kind || null,
  };

  if (!canChat(usageUnits)) {
    const reason = `${usageUnits}회가 필요한 요청입니다. 현재 남은 사용량은 ${remainingUsage()}회입니다.`;
    setServiceStatus(reason, 'error');
    syncInteractionState();
    return { ok: false, reason };
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
          structuredInput,
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
    return { ok: true, conversation: activeConversation, usage: usageState, response: chatResponse };
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
    return { ok: false, reason: messageText };
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
    .select(conversationDetailSelect)
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
    if (activeConversation?.id) {
      await loadConversationDetail(activeConversation.id, { silent: true });
    }
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
  if (graphConfirmResolver) {
    resolveGraphConfirm(false);
    return;
  }
  if (dom.graphNodeMenu && !dom.graphNodeMenu.hidden) {
    setGraphNodeMenuOpen(false);
    return;
  }
  if (dom.graphCreateMenu && !dom.graphCreateMenu.hidden) {
    setGraphCreateMenuOpen(false);
    return;
  }
  if (document.body.classList.contains('is-graph-relation-open')) {
    setGraphRelationOpen(false);
    return;
  }
  if (document.body.classList.contains('is-graph-memo-open')) {
    setGraphMemoOpen(false);
    return;
  }
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
  if (event.target.closest?.('[data-graph-create-menu]')) return;
  if (event.target.closest?.('[data-graph-node-menu]')) return;
  if (dom.graphCreateMenu && !dom.graphCreateMenu.hidden && !event.target.closest?.('[data-graph-canvas]')) {
    setGraphCreateMenuOpen(false);
  }
  if (dom.graphNodeMenu && !dom.graphNodeMenu.hidden && !event.target.closest?.('[data-graph-canvas]')) {
    setGraphNodeMenuOpen(false);
  }

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

dom.graphCanvas?.addEventListener('wheel', (event) => {
  if (event.target.closest?.('[data-graph-create-menu], [data-graph-node-menu]')) return;

  event.preventDefault();
  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);

  const screen = graphClientPoint(event);
  const worldBefore = graphScreenToWorld(screen);
  const nextScale = clampGraphScale(graphViewport.scale * (event.deltaY < 0 ? 1.09 : 0.91));

  graphViewport = {
    scale: nextScale,
    x: screen.x - worldBefore.x * nextScale,
    y: screen.y - worldBefore.y * nextScale,
  };

  applyGraphViewport();
}, { passive: false });

dom.graphCanvas?.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (event.target.closest?.('[data-graph-link-id]')) return;
  if (event.target.closest?.('[data-graph-create-menu], [data-graph-node-menu]')) return;

  const screen = graphClientPoint(event);
  const world = graphScreenToWorld(screen);
  graphCanvasDragState = {
    pointerId: event.pointerId,
    startScreen: screen,
    currentScreen: screen,
    startWorld: world,
    moved: false,
  };

  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphMarquee(null);
  dom.graphCanvas.setPointerCapture?.(event.pointerId);
});

dom.graphCanvas?.addEventListener('click', (event) => {
  if (event.button !== 0) return;
  if (Date.now() < graphCanvasSuppressClickUntil) return;
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (event.target.closest?.('[data-graph-link-id]')) return;
  if (event.target.closest?.('[data-graph-create-menu], [data-graph-node-menu]')) return;
  if (graphDragState?.moved) return;
  if (graphCanvasDragState?.moved) return;

  const screen = graphClientPoint(event);
  setGraphCreateMenuOpen(true, graphScreenToWorld(screen), screen);
});

dom.graphCreateKindButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    if (!graphCreatePoint) return;
    const point = { ...graphCreatePoint };
    const kind = button.dataset.graphCreateKind;
    setGraphCreateMenuOpen(false);
    createGraphNode(point.x, point.y, kind);
  });
});

dom.graphNodes?.addEventListener('pointerdown', (event) => {
  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement || event.button !== 0) return;

  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;

  const now = Date.now();
  const isDoublePress = graphLastPress.id === node.id && now - graphLastPress.at < 420;
  graphLastPress = { id: node.id, at: now };

  if (isDoublePress) {
    graphDragState = null;
    graphState = {
      ...graphState,
      selectedNodeId: node.id,
      pendingLinkNodeId: graphState.linkMode ? node.id : graphState.pendingLinkNodeId,
    };
    renderAll();
    openGraphMemo(node.id);
    event.preventDefault();
    return;
  }

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

dom.graphNodes?.addEventListener('contextmenu', (event) => {
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement) return;

  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;

  event.preventDefault();
  graphState = {
    ...graphState,
    selectedNodeId: node.id,
    selectedLinkId: null,
  };
  setGraphNodeMenuOpen(true, node.id, graphClientPoint(event));
  renderKnowledgeGraph();
});

dom.graphNodeDelete?.addEventListener('click', () => {
  const node = graphNodeById(graphNodeMenuId);
  const deleted = deleteGraphNode(graphNodeMenuId);
  if (!deleted) return;
  setServiceStatus(`${node?.label || '노드'}를 사건판에서 삭제했습니다.`, 'ready');
});

dom.graphNodes?.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement) return;
  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;
  event.preventDefault();
  openGraphMemo(node.id);
});

dom.graphNodes?.addEventListener('dblclick', (event) => {
  const nodeElement = event.target.closest('[data-graph-node-id]');
  if (!nodeElement) return;
  const node = graphNodeById(nodeElement.dataset.graphNodeId);
  if (!node) return;
  event.preventDefault();
  openGraphMemo(node.id);
});

dom.graphLinks?.addEventListener('click', (event) => {
  const linkId = graphLinkIdFromEvent(event);
  if (!linkId) return;
  const now = Date.now();
  const isDoublePress = graphLastLinkPress.id === linkId && now - graphLastLinkPress.at < 430;
  graphLastLinkPress = { id: linkId, at: now };

  graphState = {
    ...graphState,
    selectedLinkId: linkId,
    selectedNodeId: null,
  };
  renderAll();

  if (isDoublePress) {
    event.preventDefault();
    openGraphRelation(linkId);
  }
});

dom.graphLinks?.addEventListener('dblclick', (event) => {
  const linkId = graphLinkIdFromEvent(event);
  if (!linkId) return;
  event.preventDefault();
  openGraphRelation(linkId);
});

dom.graphConfirmBackdrop?.addEventListener('click', () => {
  resolveGraphConfirm(false);
});

dom.graphConfirmCancel?.addEventListener('click', () => {
  resolveGraphConfirm(false);
});

dom.graphConfirmOk?.addEventListener('click', () => {
  resolveGraphConfirm(true);
});

dom.graphMemoBackdrop?.addEventListener('click', () => {
  setGraphMemoOpen(false);
});

dom.graphMemoClose?.addEventListener('click', () => {
  setGraphMemoOpen(false);
});

dom.graphMemoLayerButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    setGraphMemoLayer(button.dataset.graphMemoLayer);
  });
});

dom.graphMemoSave?.addEventListener('click', () => {
  const saved = saveGraphMemo({ status: 'draft' });
  if (!saved) return;
  setGraphMemoOpen(false);
  setServiceStatus('사안 메모를 노드에 저장했습니다.', 'ready');
});

dom.graphMemoSubmit?.addEventListener('click', async () => {
  const saved = saveGraphMemo({ status: 'analyzing' });
  if (!saved) return;

  const message = buildGraphMemoAgentMessage(saved);
  setGraphMemoOpen(false);
  setServiceStatus('노드 메모를 에이전트에게 전달하고 있습니다.', 'ready');

  const result = await invokeChat({
    message,
    forceReport: true,
    structuredInput: buildGraphNodeStructuredInput(saved),
  });
  const nextStatus = result?.ok ? 'synced' : 'failed';

  if (result?.ok) {
    enrichKnowledgeGraphFromMemo(
      saved,
      [
        result.response?.assistantMessage,
        result.conversation?.report_markdown,
      ].filter(Boolean).join('\n\n')
    );
  }

  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => (
      node.id === saved.node.id
        ? {
            ...node,
            analysisStatus: nextStatus,
            analyzedAt: result?.ok ? new Date().toISOString() : node.analyzedAt,
          }
        : node
    )),
  };

  renderAll();

  if (!result?.ok) {
    setServiceStatus(result?.reason ? `에이전트 반영 실패: ${result.reason}` : '에이전트 반영 실패: 잠시 뒤 다시 시도해 주세요.', 'error');
  }
});

dom.graphRelationBackdrop?.addEventListener('click', () => {
  setGraphRelationOpen(false);
});

dom.graphRelationClose?.addEventListener('click', () => {
  setGraphRelationOpen(false);
});

dom.graphRelationStrengthButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    setGraphRelationStrength(button.dataset.graphRelationStrength);
  });
});

dom.graphRelationSave?.addEventListener('click', () => {
  const saved = saveGraphRelation({ status: 'draft' });
  if (!saved) return;
  setGraphRelationOpen(false);
  setServiceStatus('관계선 근거를 저장했습니다.', 'ready');
});

dom.graphRelationSubmit?.addEventListener('click', async () => {
  const savedLink = saveGraphRelation({ status: 'analyzing' });
  if (!savedLink) return;

  const message = buildGraphRelationAgentMessage({ link: savedLink });
  setGraphRelationOpen(false);
  setServiceStatus('관계 기록을 에이전트에게 전달하고 있습니다.', 'ready');

  const result = await invokeChat({
    message,
    forceReport: true,
    structuredInput: buildGraphRelationStructuredInput({ link: savedLink }),
  });
  const nextStatus = result?.ok ? 'synced' : 'failed';

  if (result?.ok) {
    enrichKnowledgeGraphFromRelation(
      { link: savedLink },
      [
        result.response?.assistantMessage,
        result.conversation?.report_markdown,
      ].filter(Boolean).join('\n\n')
    );
  }

  graphState = {
    ...graphState,
    links: graphState.links.map((link) => (
      link.id === savedLink.id
        ? {
            ...link,
            analysisStatus: nextStatus,
            analyzedAt: result?.ok ? new Date().toISOString() : link.analyzedAt,
          }
        : link
    )),
  };

  renderAll();

  if (!result?.ok) {
    setServiceStatus(result?.reason ? `관계 기록 반영 실패: ${result.reason}` : '관계 기록 반영 실패: 잠시 뒤 다시 시도해 주세요.', 'error');
  }
});

dom.graphRelationDelete?.addEventListener('click', () => {
  const deleted = deleteGraphRelation();
  if (!deleted) return;
  setGraphRelationOpen(false);
  setServiceStatus('관계선을 삭제했습니다.', 'ready');
});

window.addEventListener('pointermove', (event) => {
  if (graphCanvasDragState && dom.graphCanvas) {
    const currentScreen = graphClientPoint(event);
    const dx = currentScreen.x - graphCanvasDragState.startScreen.x;
    const dy = currentScreen.y - graphCanvasDragState.startScreen.y;
    const moved = Math.abs(dx) > 6 || Math.abs(dy) > 6;

    graphCanvasDragState = {
      ...graphCanvasDragState,
      currentScreen,
      moved: graphCanvasDragState.moved || moved,
    };

    if (graphCanvasDragState.moved) {
      setGraphCreateMenuOpen(false);
      setGraphNodeMenuOpen(false);
      setGraphMarquee({
        left: Math.min(graphCanvasDragState.startScreen.x, currentScreen.x),
        top: Math.min(graphCanvasDragState.startScreen.y, currentScreen.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      });
    }
  }

  if (!graphDragState || !dom.graphCanvas) return;

  const dx = event.clientX - graphDragState.startX;
  const dy = event.clientY - graphDragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) graphDragState.moved = true;

  const nextPoint = clampGraphWorldPoint({
    x: graphDragState.nodeX + dx / graphViewport.scale,
    y: graphDragState.nodeY + dy / graphViewport.scale,
  });
  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => (
      node.id === graphDragState.id
        ? {
            ...node,
            x: nextPoint.x,
            y: nextPoint.y,
          }
        : node
    )),
    selectedNodeId: graphDragState.id,
  };
  renderKnowledgeGraph();
});

window.addEventListener('pointerup', async () => {
  if (graphCanvasDragState) {
    const selectionState = graphCanvasDragState;
    graphCanvasDragState = null;
    setGraphMarquee(null);

    if (selectionState.moved) {
      graphCanvasSuppressClickUntil = Date.now() + 160;
      const minScreen = {
        x: Math.min(selectionState.startScreen.x, selectionState.currentScreen.x),
        y: Math.min(selectionState.startScreen.y, selectionState.currentScreen.y),
      };
      const maxScreen = {
        x: Math.max(selectionState.startScreen.x, selectionState.currentScreen.x),
        y: Math.max(selectionState.startScreen.y, selectionState.currentScreen.y),
      };
      const worldA = graphScreenToWorld(minScreen);
      const worldB = graphScreenToWorld(maxScreen);
      const minX = Math.min(worldA.x, worldB.x);
      const maxX = Math.max(worldA.x, worldB.x);
      const minY = Math.min(worldA.y, worldB.y);
      const maxY = Math.max(worldA.y, worldB.y);
      const selectedNodes = graphState.nodes.filter((node) => (
        node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY
      ));

      if (selectedNodes.length >= 2) {
        const confirmed = await requestGraphConfirm({
          title: '클러스터로 묶을까요?',
          message: `${selectedNodes.length}개 노드를 하나의 클러스터 영역으로 묶습니다.`,
          detail: selectedNodes.map((node) => node.label).join(' · '),
          okLabel: '클러스터 생성',
        });

        if (confirmed) {
          const cluster = createGraphCluster(selectedNodes);
          setServiceStatus(`${cluster?.label || '클러스터'} 영역에 ${selectedNodes.length}개 노드를 포섭했습니다.`, 'ready');
        } else {
          setServiceStatus('클러스터 생성을 취소했습니다.', 'ready');
        }
      } else {
        setServiceStatus('클러스터는 인물·사건 노드 2개 이상을 드래그로 감싸면 생성됩니다.', 'ready');
      }
      return;
    }
  }

  if (!graphDragState) return;

  const targetId = graphDragState.id;
  const wasMoved = graphDragState.moved;
  graphDragState = null;

  if (!wasMoved) {
    await selectGraphNode(targetId);
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
