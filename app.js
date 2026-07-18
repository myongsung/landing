import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const config = window.ROOSYCOZY_SUPABASE ?? {};
const supabaseUrl = config.url ?? '';
const supabasePublishableKey = config.publishableKey ?? '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const tierConfig = {
  unauth: { label: '비로그인', license: '로그인 필요', limit: 0 },
  general: { label: '교사 기본', license: '기본', limit: 20 },
  teacher: { label: '교사 이용권', license: '교사', limit: 150 },
  pro: { label: '교사 PRO', license: 'PRO', limit: 500 },
};

const conversationSelect = 'id, user_id, product, title, status, report_markdown, saved_at, created_at, updated_at';

const dom = {
  body: document.body,
  siteHeader: document.querySelector('[data-site-header]'),
  headerCtaLabel: document.querySelector('[data-header-cta-label]'),
  headerCtaLabelShort: document.querySelector('[data-header-cta-label-short]'),
  headerMenus: document.querySelectorAll('.site-header details'),
  mobileSiteMenu: document.querySelector('[data-mobile-site-menu]'),
  landingView: document.querySelector('[data-landing-view]'),
  chatView: document.querySelector('[data-chat-view]'),
  authOpenButtons: document.querySelectorAll('[data-auth-open], [data-start-chat]'),
  authPanel: document.querySelector('[data-auth-panel]'),
  userPanel: document.querySelector('[data-user-panel]'),
  userEmails: document.querySelectorAll('[data-user-email]'),
  sidebarUserEmail: document.querySelector('[data-sidebar-user-email]'),
  signOutButtons: document.querySelectorAll('[data-sign-out]'),
  sidebarSignOut: document.querySelector('[data-sidebar-sign-out]'),
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
  legalOpenButtons: document.querySelectorAll('[data-legal-open]'),
  legalBackdrop: document.querySelector('[data-legal-backdrop]'),
  legalModal: document.querySelector('[data-legal-modal]'),
  legalTitle: document.querySelector('[data-legal-title]'),
  legalClose: document.querySelector('[data-legal-close]'),
  legalContents: document.querySelectorAll('[data-legal-content]'),
  homeLinks: document.querySelectorAll('[data-home-link]'),
  backHome: document.querySelector('[data-back-home]'),
  newChatButtons: document.querySelectorAll('[data-new-chat]'),
  chatSidebar: document.querySelector('[data-chat-sidebar]'),
  chatHistoryToggle: document.querySelector('[data-chat-history-toggle]'),
  chatHistoryCloseButtons: document.querySelectorAll('[data-chat-history-close]'),
  conversationList: document.querySelector('[data-conversation-list]'),
  messageList: document.querySelector('[data-message-list]'),
  chatTitle: document.querySelector('[data-chat-title]'),
  chatForm: document.querySelector('[data-chat-form]'),
  chatInput: document.querySelector('[data-chat-input]'),
  sendButton: document.querySelector('[data-send-button]'),
  serviceStatus: document.querySelector('[data-service-status]'),
  policyInputForm: document.querySelector('[data-policy-input-form]'),
  policyDocument: document.querySelector('[data-policy-document]'),
  incidentConditions: document.querySelector('[data-incident-conditions]'),
  recordDate: document.querySelector('[data-record-date]'),
  recordTitle: document.querySelector('[data-record-title]'),
  runSimulation: document.querySelector('[data-run-simulation]'),
  policyAssessment: document.querySelector('[data-policy-assessment]'),
  simulationHud: document.querySelector('[data-simulation-hud]'),
  formFeedback: document.querySelector('[data-form-feedback]'),
  workspaceTabs: document.querySelectorAll('[data-workspace-tab]'),
  workspaceCalendar: document.querySelector('[data-workspace-calendar]'),
  workspaceInput: document.querySelector('[data-workspace-input]'),
  workspaceResults: document.querySelector('[data-workspace-results]'),
  calendarGrid: document.querySelector('[data-calendar-grid]'),
  calendarAgenda: document.querySelector('[data-calendar-agenda]'),
  calendarMonth: document.querySelector('[data-calendar-month]'),
  agendaDate: document.querySelector('[data-agenda-date]'),
  calendarPrev: document.querySelector('[data-calendar-prev]'),
  calendarNext: document.querySelector('[data-calendar-next]'),
  calendarToday: document.querySelector('[data-calendar-today]'),
  agendaNew: document.querySelector('[data-agenda-new]'),
  monthRecords: document.querySelector('[data-month-records]'),
  monthAnalyzed: document.querySelector('[data-month-analyzed]'),
  recordCount: document.querySelector('[data-record-count]'),
  resultsCalendar: document.querySelector('[data-results-calendar]'),
  editPolicy: document.querySelector('[data-edit-policy]'),
  resultStatus: document.querySelector('[data-result-status]'),
  analysisLoading: document.querySelector('[data-analysis-loading]'),
  analysisContent: document.querySelector('[data-analysis-content]'),
  promptSuggestions: document.querySelectorAll('[data-prompt-suggestion]'),
};

let supabase = null;
let session = null;
let usageState = { tier: 'unauth', used: 0, limit: 0, period: '' };
let conversations = [];
let activeConversation = null;
let messages = [];
let authMode = 'login';
let isSending = false;
let analysisPhase = 'idle';
let isRequestingReport = false;
let isChatHistoryOpen = false;
let toastTimer = null;
let lastVerificationEmail = '';
let pendingNewSimulation = false;
let workspaceView = 'calendar';
let lastLegalTrigger = null;
let usageReconcileTimer = null;
let lastUsageRefreshAt = 0;
const initialToday = new Date();
let selectedCalendarDate = toDateKey(initialToday);
let calendarCursor = new Date(initialToday.getFullYear(), initialToday.getMonth(), 1);
const drawerMediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 1040px)') : { matches: false };

const MAX_POLICY_ANALYSIS_CHARS = 9000;
const MAX_ANALYSIS_CYCLES = 5;
const FINAL_REPORT_COST = 3;
const compatStateKey = ['game', 'State'].join('');

let simulationState = createDefaultSimulationState();

function createDefaultSimulationState() {
  return {
    mode: 'policy_simulation',
    cycle: 0,
    maxCycles: MAX_ANALYSIS_CYCLES,
    scenarioTitle: '새 기록',
    recordDate: toDateKey(new Date()),
    recordTitle: '',
    policyDocument: '',
    incidentConditions: '',
    policyBalanceScore: 0,
    claimValidity: 0,
    manipulationRisk: 0,
    handoffNeed: 0,
    overConcessionRisk: 0,
    underResponseRisk: 0,
    policyViolationRisk: 0,
    currentPolicyRisks: {
      overallRisk: 0,
      factCheckNeed: 0,
      manipulationRisk: 0,
      handoffNeed: 0,
      overConcessionRisk: 0,
      underResponseRisk: 0,
      policyViolationRisk: 0,
    },
    alternativePolicyRisks: {
      overallRisk: null,
      factCheckNeed: null,
      manipulationRisk: null,
      handoffNeed: null,
      overConcessionRisk: null,
      underResponseRisk: null,
      policyViolationRisk: null,
    },
    hasAlternativeRiskData: false,
    verifiedPolicyText: '',
    policySummary: '',
    policyStrengths: [],
    policySafeguards: {},
    vulnerabilities: [],
    alternativePolicy: '',
    recommendation: '',
    analysisHeadline: '',
    riskReasons: {},
    isComplete: false,
  };
}

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
  if (value === null || value === undefined || value === '') return null;
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

function analysisRequestCount(source = messages) {
  return source.filter((message) =>
    message.role === 'assistant' &&
    message.metadata?.mode !== 'final_report' &&
    (message.metadata?.simulation_state || message.metadata?.game_state || message.metadata?.analysis_state)
  ).length;
}

function clampMetric(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function calculatePolicyBalanceScore(state = simulationState) {
  const critical = (
    clampMetric(state.manipulationRisk, 50) * 0.22 +
    clampMetric(state.overConcessionRisk, 50) * 0.2 +
    clampMetric(state.underResponseRisk, 50) * 0.2 +
    clampMetric(state.policyViolationRisk, 50) * 0.2 +
    clampMetric(state.handoffNeed ?? state.escalationNeed, 50) * 0.1 +
    Math.max(0, 100 - clampMetric(state.claimValidity, 50)) * 0.08
  );
  return clampMetric(100 - critical, 50);
}

function criticalRiskScore() {
  return clampMetric(100 - simulationState.policyBalanceScore);
}

function metricTone(value, invert = false) {
  const riskValue = invert ? 100 - value : value;
  if (riskValue >= 70) return 'danger';
  if (riskValue >= 45) return 'warn';
  return 'safe';
}

function scoreGrade(score) {
  if (score >= 78) return 'A';
  if (score >= 62) return 'B';
  if (score >= 46) return 'C';
  return 'D';
}

function metricStatusLabel(value, invert = false) {
  if (invert) {
    if (value >= 70) return '높음';
    if (value >= 45) return '확인 필요';
    return '낮음';
  }
  if (value >= 70) return '높음';
  if (value >= 45) return '주의';
  return '낮음';
}

function policyDecisionSummary() {
  const priority = riskMetricRows()
    .filter((item) => !item.invert)
    .sort((a, b) => b.value - a.value)[0];
  const risk = priority?.value ?? criticalRiskScore();
  const title = risk >= 70
    ? '현재 정책에는 위험을 막기 위한 기준이 더 필요합니다'
    : risk >= 45
      ? '현재 정책에서 보완할 기준이 확인됐습니다'
      : '현재 정책의 주요 안전장치가 비교적 잘 갖춰져 있습니다';
  const detail = priority
    ? `가장 높은 항목은 ‘${priority.label}’이며 현재 ${priority.value}점입니다. ${priority.help}`
    : '입력한 정책과 상황에서 높은 위험 항목을 찾지 못했습니다.';
  return { title, detail, tone: metricTone(risk), priority };
}

function requiredInputStatus() {
  const fields = [
    { key: 'incidentConditions', label: '상황 기록', element: dom.incidentConditions },
    { key: 'policyDocument', label: '현재 정책', element: dom.policyDocument },
  ];
  const missing = fields.filter((field) => !String(field.element?.value ?? simulationState[field.key] ?? '').trim());
  return { fields, missing, complete: fields.length - missing.length };
}

function renderInputGuidance() {
  const status = requiredInputStatus();
  if (dom.formFeedback) {
    dom.formFeedback.textContent = status.missing.length
      ? `${status.missing.map((item) => item.label).join(', ')}을 입력해 주세요.`
      : '준비되었습니다. 현재 정책의 빈틈과 6가지 위험을 계산합니다.';
    dom.formFeedback.dataset.ready = status.missing.length ? 'false' : 'true';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function compactText(value, max = 4000) {
  const normalized = String(value ?? '').replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 20).trim()}...`;
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

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function conversationDateKey(conversation) {
  return toDateKey(conversation?.saved_at || conversation?.created_at || conversation?.updated_at) || toDateKey(new Date());
}

function formatCalendarDate(value) {
  const date = dateFromKey(value);
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function sanitizeProductLanguage(value) {
  const replacements = [
    [/roosycozy/gi, '루지코지'],
    [/(?:민원인|고객|소비자)/g, '학부모'],
    [/상대방/g, '학부모'],
    [/상대의 다음 행동/g, '정책 위험 변화'],
    [/상대의 다음 반응/g, '정책 위험 변화'],
    [/상대에게/g, '학부모에게'],
    [/상대 요구/g, '학부모 요구'],
    [/상대 주장/g, '학부모 주장'],
    [/상대는/g, '학부모는'],
    [/상대가/g, '학부모가'],
    [/상대의/g, '학부모의'],
    [/상대를/g, '학부모를'],
    [/학부모 유형/g, '내부 위험 모델'],
    [/QRE\s*λ\s*([0-9.]+)/gi, '정책 위험 예측값'],
    [/QRE\s*행동\s*일관성/gi, '정책 위험 일관성'],
    [/QRE\s*값/gi, '정책 위험 예측값'],
    [/QRE\s*기반/gi, '정책 위험 모델을 바탕으로'],
    [/Logit-QRE/gi, '정책 위험 예측 모델'],
    [/lambda_QRE/gi, '정책 위험 일관성'],
    [/QRE\s*페르소나/gi, '내부 위험 모델'],
    [/QRE\s*Engine/gi, '정책 위험 예측 모델'],
    [new RegExp(['ROOSY', '-X ', 'Surv', 'ival'].join(''), 'g'), '루지코지 정책 위험 예측 모델'],
    [new RegExp(['ROOSY', '-X'].join(''), 'g'), '정책 위험 예측 모델'],
    [new RegExp(['AI 민원 ', '생존', '모드'].join(''), 'g'), '민원 대응 미리보기'],
    [new RegExp(['생존', ' 시뮬레이션'].join(''), 'g'), '조심할 점 확인'],
    [new RegExp(['생존', '모드'].join(''), 'g'), '조심할 점 확인'],
    [new RegExp(['생존', ' 점수'].join(''), 'g'), '전체 안전 점수'],
    [new RegExp(['생존', ' 등급'].join(''), 'g'), '전체 안전 등급'],
    [new RegExp(['생', '존'].join(''), 'g'), '안전'],
    [new RegExp(['게', '임 모드'].join(''), 'g'), '조심할 점 확인'],
    [new RegExp(['게', '임 상태'].join(''), 'g'), '분석 상태'],
    [/미션/g, '확인할 목표'],
    [/플레이어/g, '교사'],
    [/턴별/g, '순서별'],
    [/(\d+)\s*턴/g, '$1번째'],
    [/행동\s*확률/g, '위험 계산값'],
    [/분류\s*신뢰도/g, 'AI 판단 확실도'],
    [/필요 이상 보상 위험/g, '사실 확인 전 과잉 대응 위험'],
    [/너무 많이 보상할 위험/g, '사실 확인 전 과잉 대응 위험'],
    [/상대 요구를 너무 많이 들어줄 위험/g, '사실 확인 전 과잉 대응 위험'],
    [/학부모 요구를 너무 많이 들어줄 위험/g, '사실 확인 전 과잉 대응 위험'],
    [/정당한 민원 누락 위험/g, '정당한 문제 제기를 놓칠 과소 대응 위험'],
    [/정당한 요청을 놓칠 위험/g, '정당한 문제 제기를 놓칠 과소 대응 위험'],
    [/내부 규정 위반 위험/g, '학교 규정을 벗어날 위험'],
    [/규정을 어길 위험/g, '학교 규정을 벗어날 위험'],
    [/관리자 검토 필요/g, '관리자에게 공유할 필요성'],
    [/관리자와 함께 볼 필요/g, '관리자에게 공유할 필요성'],
    [/주장 근거의 타당성/g, '주장과 요구의 확인 정도'],
    [/권장 정책안/g, '학교 규정에 반영할 문장'],
    [/대안 정책/g, '보완한 학교 규정'],
    [/정책 비교/g, '학교 규정을 보완했을 때'],
    [/취약 조항/g, '학교 규정에서 확인할 부분'],
    [/현재 규정의 취약점/g, '학교 규정에서 확인할 부분'],
    [/증빙 요건/g, '확인 자료 기준'],
    [/승인 주체/g, '누가 확인할지'],
    [/관리자 이관 요구/g, '관리자 면담 요구'],
    [/관리자 이관/g, '관리자에게 공유'],
    [/리뷰·공개 압박/g, '온라인 공개 언급'],
    [/예외 적용 요구/g, '예외 처리 요구'],
    [/증거 제출/g, '관련 기록·자료 제시'],
    [/사실관계 불명확/g, '아직 사실을 확인하지 못함'],
    [/증거 충분/g, '기록이 충분함'],
    [/증거 일부/g, '기록이 일부 있음'],
    [/증거 부족/g, '기록이 부족함'],
    [/일부 허위정보 포함/g, '사실과 다른 내용이 일부 있음'],
    [/예측 신뢰도/g, 'AI 판단 확실도'],
    [/선택 성향/g, '위험 반복 가능성'],
    [/행동 유형/g, '분석 유형'],
    [/과잉양보/g, '과잉 대응'],
    [/정당한\s*민원\s*과소대응/g, '정당한 문제 제기를 놓치는 과소 대응'],
    [/과소대응/g, '과소 대응'],
    [/페르소나/g, '내부 분석 모델'],
    [/시뮬레이션/g, '미리 보기'],
    [/효용/g, '내부 위험 계산값'],
    [/전액 환불/g, '생활지도 철회'],
    [/환불 정책/g, '학교 규정'],
    [/환불/g, '조치 철회'],
    [/금전 보상/g, '추가 조치'],
    [/추가 보상/g, '담임 교체·추가 조치'],
    [/보상/g, '추가 조치'],
    [/처리 기준/g, '학교 대응 기준'],
    [/학교·기관 기준/g, '학교 규정'],
    [/기관 기준/g, '학교 규정'],
    [/정책/g, '학교 규정'],
    [/정당형|오해형|감정형|기회주의형|적대형/g, '내부 위험 패턴'],
    [/\bQRE\b/gi, '내부 위험 계산'],
    [/λ/g, '위험 반복 가능성'],
  ];
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value ?? ''));
}

function formatAssistantMessage(content) {
  const lines = sanitizeProductLanguage(content).trim().split('\n');
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

function hasAnalysisResult(source = messages) {
  return source.some((message) =>
    message.role === 'assistant' &&
    (message.metadata?.simulation_state || message.metadata?.game_state || message.metadata?.analysis_state)
  );
}

function renderWorkspaceState() {
  if (workspaceView === 'results' && analysisPhase !== 'loading' && !isSending && !hasAnalysisResult()) {
    workspaceView = 'input';
  }
  const showingCalendar = workspaceView === 'calendar';
  const showingInput = workspaceView === 'input';
  const showingResults = workspaceView === 'results';
  const showingFullLoader = showingResults && analysisPhase === 'loading';
  if (dom.workspaceCalendar) dom.workspaceCalendar.hidden = !showingCalendar;
  if (dom.workspaceInput) dom.workspaceInput.hidden = !showingInput;
  if (dom.workspaceResults) dom.workspaceResults.hidden = !showingResults;
  if (dom.workspaceResults) dom.workspaceResults.setAttribute('aria-busy', isSending || showingFullLoader ? 'true' : 'false');
  if (dom.analysisLoading) dom.analysisLoading.hidden = !showingFullLoader;
  if (dom.analysisContent) dom.analysisContent.hidden = showingFullLoader;
  if (dom.resultsCalendar) dom.resultsCalendar.disabled = isSending;
  if (dom.editPolicy) dom.editPolicy.disabled = isSending;
  dom.workspaceTabs.forEach((tab) => {
    const selected = tab.dataset.workspaceTab === workspaceView;
    tab.disabled = isSending && !selected;
    if (tab.getAttribute('role') === 'tab') {
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    } else {
      tab.removeAttribute('aria-selected');
      if (selected) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  });
  if (dom.resultStatus) {
    dom.resultStatus.textContent = analysisPhase === 'loading'
      ? '현재 정책과 위험도를 분석하는 중'
      : analysisPhase === 'refreshing'
        ? '정책 변경을 반영하는 중'
        : '정책 위험 분석';
  }
}

function setWorkspaceView(nextView, { focus = false, force = false } = {}) {
  const requested = ['calendar', 'results'].includes(nextView) ? nextView : 'input';
  if (requested === 'results' && !force && analysisPhase !== 'loading' && !isSending && !hasAnalysisResult()) {
    showToast('아직 정책 위험 분석 결과가 없습니다. 새 상황을 먼저 적어 주세요.', 'error');
    return;
  }
  workspaceView = requested;
  renderWorkspaceState();
  if (focus) {
    const target = requested === 'results' ? dom.workspaceResults : requested === 'calendar' ? dom.workspaceCalendar : dom.incidentConditions;
    window.setTimeout(() => target?.focus?.(), 60);
  }
}

function recordsForDate(dateKey) {
  return conversations.filter((conversation) => conversationDateKey(conversation) === dateKey);
}

function conversationIsAnalyzed(conversation) {
  if (!conversation) return false;
  if (String(conversation.report_markdown ?? '').trim()) return true;
  return /ready|complete|action|required|review/i.test(String(conversation.status ?? ''));
}

function renderCalendarAgenda() {
  if (dom.agendaDate) dom.agendaDate.textContent = formatCalendarDate(selectedCalendarDate);
  if (!dom.calendarAgenda) return;
  const records = recordsForDate(selectedCalendarDate);
  if (!records.length) {
    dom.calendarAgenda.innerHTML = `
      <div class="agenda-empty">
        <i aria-hidden="true">✎</i>
        <strong>아직 기록이 없습니다.</strong>
        <p>이 날짜에 있었던 일을 짧게 남겨보세요.</p>
      </div>
    `;
    return;
  }
  dom.calendarAgenda.innerHTML = records.map((conversation) => `
    <button class="agenda-record" type="button" data-agenda-record="${escapeHtml(conversation.id)}">
      <i aria-hidden="true" data-tone="${conversation.status === 'action_required' ? 'danger' : 'default'}"></i>
      <span><strong>${escapeHtml(sanitizeProductLanguage(conversation.title || '제목 없는 기록'))}</strong><small>${escapeHtml(formatDate(conversation.updated_at || conversation.created_at))} · ${conversation.status === 'action_required' ? '다시 확인 필요' : conversationIsAnalyzed(conversation) ? '위험 분석 완료' : '기록만 저장됨'}</small></span>
      <span aria-hidden="true">›</span>
    </button>
  `).join('');
  dom.calendarAgenda.querySelectorAll('[data-agenda-record]').forEach((button) => {
    button.addEventListener('click', () => selectConversation(button.dataset.agendaRecord));
  });
}

function renderCalendar() {
  if (!dom.calendarGrid) return;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayKey = toDateKey(new Date());
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41);
  const selectedDate = dateFromKey(selectedCalendarDate);
  const selectedIsVisible = selectedDate >= gridStart && selectedDate <= gridEnd;
  const rovingDateKey = selectedIsVisible ? selectedCalendarDate : `${monthKey}-01`;
  const monthRecords = conversations.filter((conversation) => conversationDateKey(conversation).startsWith(monthKey));

  if (dom.calendarMonth) dom.calendarMonth.textContent = `${year}년 ${month + 1}월`;
  if (dom.monthRecords) dom.monthRecords.textContent = String(monthRecords.length);
  if (dom.monthAnalyzed) dom.monthAnalyzed.textContent = String(monthRecords.filter(conversationIsAnalyzed).length);
  if (dom.recordCount) dom.recordCount.textContent = String(conversations.length);

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const records = recordsForDate(dateKey);
    const outside = date.getMonth() !== month;
    const selected = dateKey === selectedCalendarDate;
    const today = dateKey === todayKey;
    cells.push(`
      <button class="calendar-day${outside ? ' is-outside' : ''}${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}" type="button" data-calendar-date="${dateKey}" tabindex="${dateKey === rovingDateKey ? '0' : '-1'}" aria-pressed="${selected ? 'true' : 'false'}"${today ? ' aria-current="date"' : ''} aria-label="${escapeHtml(formatCalendarDate(dateKey))}, 기록 ${records.length}개${selected ? ', 선택됨' : ''}">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-records">
          ${records.slice(0, 2).map((record) => `<span class="day-record">${escapeHtml(sanitizeProductLanguage(record.title || '기록'))}</span>`).join('')}
          ${records.length > 2 ? `<span class="day-more">+${records.length - 2}</span>` : ''}
        </span>
      </button>
    `);
  }
  dom.calendarGrid.innerHTML = cells.join('');
  const activateDate = (dateKey, focusAfterRender = false) => {
    selectedCalendarDate = dateKey;
    const chosen = dateFromKey(selectedCalendarDate);
    if (chosen.getMonth() !== calendarCursor.getMonth() || chosen.getFullYear() !== calendarCursor.getFullYear()) {
      calendarCursor = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
    }
    renderCalendar();
    if (focusAfterRender) {
      window.requestAnimationFrame(() => dom.calendarGrid?.querySelector(`[data-calendar-date="${dateKey}"]`)?.focus());
    }
  };
  dom.calendarGrid.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => activateDate(button.dataset.calendarDate));
    button.addEventListener('keydown', (event) => {
      const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      let delta = deltas[event.key];
      const current = dateFromKey(button.dataset.calendarDate);
      const weekday = (current.getDay() + 6) % 7;
      if (event.key === 'Home') delta = -weekday;
      if (event.key === 'End') delta = 6 - weekday;
      if (!Number.isFinite(delta)) return;
      event.preventDefault();
      current.setDate(current.getDate() + delta);
      activateDate(toDateKey(current), true);
    });
  });
  renderCalendarAgenda();
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
  const wasOpen = isChatHistoryOpen;
  const isDrawer = Boolean(drawerMediaQuery.matches);
  isChatHistoryOpen = isDrawer && Boolean(open);
  dom.body.classList.toggle('is-chat-history-open', isChatHistoryOpen);
  dom.chatHistoryToggle?.setAttribute('aria-expanded', isChatHistoryOpen ? 'true' : 'false');
  if (dom.chatSidebar) {
    if (isDrawer) {
      dom.chatSidebar.toggleAttribute('inert', !isChatHistoryOpen);
      dom.chatSidebar.setAttribute('aria-hidden', isChatHistoryOpen ? 'false' : 'true');
    } else {
      dom.chatSidebar.removeAttribute('inert');
      dom.chatSidebar.removeAttribute('aria-hidden');
    }
  }
  if (isDrawer && isChatHistoryOpen && !wasOpen) {
    window.setTimeout(() => dom.chatSidebar?.querySelector('[data-chat-history-close]')?.focus(), 40);
  } else if (isDrawer && !isChatHistoryOpen && wasOpen) {
    window.setTimeout(() => dom.chatHistoryToggle?.focus(), 40);
  }
}

function normalizeUsagePayload(payload = {}) {
  let nextUsage = payload;

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(nextUsage)) {
      nextUsage = nextUsage[0] ?? {};
      continue;
    }
    if (!nextUsage || typeof nextUsage !== 'object') return {};

    const nested = nextUsage.usage ?? nextUsage.usage_state ?? nextUsage.usageState;
    if (nested !== undefined && nested !== nextUsage) {
      nextUsage = nested;
      continue;
    }
    if (nextUsage.data !== undefined && nextUsage.data !== nextUsage) {
      nextUsage = nextUsage.data;
      continue;
    }
    break;
  }

  return nextUsage && typeof nextUsage === 'object' && !Array.isArray(nextUsage) ? nextUsage : {};
}

function usagePeriodFromPayload(nextUsage = {}) {
  return String(nextUsage.period ?? nextUsage.month ?? nextUsage.period_month ?? nextUsage.periodMonth ?? '').trim();
}

function usageLimitFromPayload(nextUsage = {}) {
  return (
    numberOrNull(nextUsage.limit_points) ??
    numberOrNull(nextUsage.limitPoints) ??
    numberOrNull(nextUsage.limit_messages) ??
    numberOrNull(nextUsage.limitMessages) ??
    numberOrNull(nextUsage.limit_reports) ??
    numberOrNull(nextUsage.limitReports) ??
    numberOrNull(nextUsage.limit) ??
    numberOrNull(nextUsage.monthly_limit) ??
    numberOrNull(nextUsage.monthlyLimit)
  );
}

function usageUsedFromPayload(nextUsage = {}, limit = null) {
  const used =
    numberOrNull(nextUsage.used_points) ??
    numberOrNull(nextUsage.usedPoints) ??
    numberOrNull(nextUsage.used_messages) ??
    numberOrNull(nextUsage.usedMessages) ??
    numberOrNull(nextUsage.used_reports) ??
    numberOrNull(nextUsage.usedReports) ??
    numberOrNull(nextUsage.used);
  if (used !== null) return used;

  const remaining =
    numberOrNull(nextUsage.remaining_points) ??
    numberOrNull(nextUsage.remainingPoints) ??
    numberOrNull(nextUsage.remaining_messages) ??
    numberOrNull(nextUsage.remainingMessages) ??
    numberOrNull(nextUsage.remaining_reports) ??
    numberOrNull(nextUsage.remainingReports) ??
    numberOrNull(nextUsage.remaining);
  return remaining !== null && limit !== null ? limit - remaining : null;
}

function applyUsageState(payload = {}, { minimumUsed = null } = {}) {
  const nextUsage = normalizeUsagePayload(payload);
  const tier = normalizeTier(nextUsage.tier ?? nextUsage.membership_tier ?? usageState.tier);
  const info = tierInfo(tier);
  const limit = Math.max(0, usageLimitFromPayload(nextUsage) ?? info.limit);
  const reportedUsed = usageUsedFromPayload(nextUsage, limit);
  const nextPeriod = usagePeriodFromPayload(nextUsage) || usageState.period;
  const periodChanged = Boolean(nextPeriod && usageState.period && nextPeriod !== usageState.period);
  const usageFloor = periodChanged ? null : numberOrNull(minimumUsed);
  const used = Math.max(reportedUsed ?? usageState.used ?? 0, usageFloor ?? 0);

  usageState = {
    tier,
    used: Math.max(0, Math.min(limit, used)),
    limit,
    period: nextPeriod,
  };

  renderUsage();
  return { hasReportedUsage: reportedUsed !== null, periodChanged };
}

function commitUsageAfterRequest(responseData, usageBefore, fallbackUnits) {
  const responseUsage = normalizeUsagePayload(
    responseData?.usage ?? responseData?.usage_state ?? responseData?.usageState ?? {}
  );
  const responsePeriod = usagePeriodFromPayload(responseUsage);
  const responseLimit = usageLimitFromPayload(responseUsage) ?? usageBefore.limit;
  const reportedUsed = usageUsedFromPayload(responseUsage, responseLimit);
  const periodChanged = Boolean(
    responsePeriod && (
      (usageBefore.period && responsePeriod !== usageBefore.period) ||
      (!usageBefore.period && reportedUsed !== null && reportedUsed < usageBefore.used)
    )
  );
  const units = Math.max(0, numberOrNull(responseData?.meta?.cost) ?? fallbackUnits);
  const expectedUsed = periodChanged ? units : usageBefore.used + units;
  const result = applyUsageState(responseUsage, { minimumUsed: expectedUsed });

  if (!result.hasReportedUsage || usageState.used < expectedUsed) {
    const fallbackLimit = usageBefore.limit || tierInfo(usageBefore.tier).limit;
    applyUsageState(
      {
        tier: responseUsage.tier ?? responseUsage.membership_tier ?? usageBefore.tier,
        used: expectedUsed,
        limit: usageLimitFromPayload(responseUsage) ?? fallbackLimit,
        period: responsePeriod || usageBefore.period,
      },
      { minimumUsed: expectedUsed }
    );
  }

  return { used: usageState.used, period: usageState.period };
}

function reconcileUsageSoon(minimumUsed = usageState.used) {
  window.clearTimeout(usageReconcileTimer);
  usageReconcileTimer = window.setTimeout(() => {
    usageReconcileTimer = null;
    void loadUsage({ preserveOnError: true, minimumUsed });
  }, 700);
}

function renderUsage() {
  const signedIn = Boolean(session?.user);
  const info = tierInfo();
  const percent = usagePercent();
  const used = Math.min(usageState.used, usageState.limit);
  const text = signedIn
    ? `${info.license} · 이번 달 사용 ${used}/${usageState.limit} · ${percent}%`
    : '로그인 필요';

  if (dom.usagePill) {
    dom.usagePill.hidden = !signedIn;
    dom.usagePill.textContent = text;
  }

  if (dom.usageCopy) {
    dom.usageCopy.textContent = signedIn
      ? `${info.label} · AI 이용 포인트 ${remainingUsage()} 남음`
      : '로그인하면 메모와 결과를 달력에 저장할 수 있습니다.';
  }
}

function renderAuth() {
  const signedIn = Boolean(session?.user);
  dom.body.dataset.authenticated = signedIn ? 'true' : 'false';

  if (dom.authPanel) dom.authPanel.hidden = signedIn;
  if (dom.userPanel) dom.userPanel.hidden = !signedIn;
  dom.userEmails.forEach((element) => { element.textContent = session?.user?.email ?? ''; });
  if (dom.headerCtaLabel) dom.headerCtaLabel.textContent = signedIn ? '새 학부모 민원' : '정책 위험 분석';
  if (dom.headerCtaLabelShort) dom.headerCtaLabelShort.textContent = signedIn ? '새 기록' : '시작';
  if (dom.sidebarUserEmail) dom.sidebarUserEmail.textContent = session?.user?.email ?? '';
  renderUsage();
}

function resetSimulationState() {
  simulationState = createDefaultSimulationState();
  analysisPhase = 'idle';
}

function prepareBlankRecord(dateKey = selectedCalendarDate) {
  resetSimulationState();
  simulationState.scenarioTitle = '새 기록';
  simulationState.recordDate = dateKey || toDateKey(new Date());
  simulationState.recordTitle = '';
  simulationState.policyDocument = '';
  simulationState.incidentConditions = '';
  simulationState.policyBalanceScore = 0;
  simulationState.claimValidity = 0;
  simulationState.manipulationRisk = 0;
  simulationState.handoffNeed = 0;
  simulationState.overConcessionRisk = 0;
  simulationState.underResponseRisk = 0;
  simulationState.policyViolationRisk = 0;
  simulationState.currentPolicyRisks = { overallRisk: 0, factCheckNeed: 0, manipulationRisk: 0, handoffNeed: 0, overConcessionRisk: 0, underResponseRisk: 0, policyViolationRisk: 0 };
  simulationState.alternativePolicyRisks = { overallRisk: null, factCheckNeed: null, manipulationRisk: null, handoffNeed: null, overConcessionRisk: null, underResponseRisk: null, policyViolationRisk: null };
  simulationState.hasAlternativeRiskData = false;
  simulationState.verifiedPolicyText = '';
  simulationState.policySummary = '';
  simulationState.policyStrengths = [];
  simulationState.policySafeguards = {};
  simulationState.vulnerabilities = [];
  simulationState.alternativePolicy = '';
  simulationState.recommendation = '';
  simulationState.analysisHeadline = '';
  simulationState.riskReasons = {};
  simulationState.cycle = 0;
  simulationState.isComplete = false;
  analysisPhase = 'idle';
  selectedCalendarDate = simulationState.recordDate;
  workspaceView = 'input';
}


function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return null;
}

function remapApiSimulationState(nextState = {}, isComplete = false) {
  const api = nextState && typeof nextState === 'object' ? nextState : {};
  const cycle = Number(api.cycle ?? api.step ?? api.turn ?? simulationState.cycle ?? 0);
  const maxCycles = Number(api.max_cycles ?? api.maxCycles ?? api.max_turns ?? api.maxTurns ?? simulationState.maxCycles ?? MAX_ANALYSIS_CYCLES);
  const legacyProceduralSafety = api.procedural_safety ?? api.proceduralSafety;
  const providedBalanceScore = numberOrNull(
    api.policy_balance_score ?? api.policyBalanceScore ?? api.policy_stress_score ?? api.policyStressScore ?? api.survival_score ?? api.survivalScore
  );
  const revisedOverallRisk = numberOrNull(api.revised_overall_risk ?? api.revisedOverallRisk);
  const revisedClaimValidity = numberOrNull(api.revised_claim_validity ?? api.revisedClaimValidity);
  const revisedManipulationRisk = numberOrNull(api.revised_manipulation_risk ?? api.revisedManipulationRisk ?? api.alternative_manipulation_risk);
  const revisedHandoffNeed = numberOrNull(api.revised_escalation_need ?? api.revisedEscalationNeed);
  const revisedOverConcessionRisk = numberOrNull(api.revised_over_concession_risk ?? api.revisedOverConcessionRisk ?? api.alternative_over_concession_risk);
  const revisedUnderResponseRisk = numberOrNull(api.revised_under_response_risk ?? api.revisedUnderResponseRisk ?? api.alternative_under_response_risk);
  const revisedPolicyViolationRisk = numberOrNull(api.revised_policy_violation_risk ?? api.revisedPolicyViolationRisk ?? api.alternative_policy_violation_risk);
  const comparisonFlag = api.risk_comparison_valid ?? api.riskComparisonValid;
  const comparisonValid = comparisonFlag == null
    ? Boolean(api.verified_policy_document ?? api.verifiedPolicyDocument ?? api.policy_document ?? api.policyDocument ?? simulationState.policyDocument)
    : Boolean(comparisonFlag);
  const hasRevisedRiskData = [
    revisedOverallRisk,
    revisedClaimValidity,
    revisedManipulationRisk,
    revisedHandoffNeed,
    revisedOverConcessionRisk,
    revisedUnderResponseRisk,
    revisedPolicyViolationRisk,
  ].every((value) => value !== null) && comparisonValid;

  simulationState = {
    ...simulationState,
    mode: 'policy_simulation',
    cycle: Math.max(0, Math.min(maxCycles, Math.round(Number.isFinite(cycle) ? cycle : 0))),
    maxCycles: Math.max(1, Math.round(Number.isFinite(maxCycles) ? maxCycles : MAX_ANALYSIS_CYCLES)),
    policyBalanceScore: clampMetric(providedBalanceScore, simulationState.policyBalanceScore),
    claimValidity: clampMetric(api.claim_validity ?? api.claimValidity, simulationState.claimValidity),
    manipulationRisk: clampMetric(api.manipulation_risk ?? api.manipulationRisk ?? api.pressure, simulationState.manipulationRisk),
    handoffNeed: clampMetric(api.handoff_need ?? api.handoffNeed ?? api.escalation_need ?? api.escalationNeed ?? api.escalation_risk ?? api.escalationRisk, simulationState.handoffNeed),
    overConcessionRisk: clampMetric(api.over_concession_risk ?? api.overConcessionRisk ?? api.liability_risk ?? api.liabilityRisk, simulationState.overConcessionRisk),
    underResponseRisk: clampMetric(api.under_response_risk ?? api.underResponseRisk, simulationState.underResponseRisk),
    policyViolationRisk: clampMetric(
      api.policy_violation_risk ??
        api.policyViolationRisk ??
        (legacyProceduralSafety == null ? undefined : 100 - Number(legacyProceduralSafety)),
      simulationState.policyViolationRisk
    ),
    scenarioTitle: api.policy_title ?? api.policyTitle ?? api.scenario_title ?? api.scenarioTitle ?? simulationState.scenarioTitle,
    recordDate: api.record_date ?? api.recordDate ?? simulationState.recordDate,
    recordTitle: api.record_title ?? api.recordTitle ?? simulationState.recordTitle,
    policyDocument: api.policy_document ?? api.policyDocument ?? simulationState.policyDocument,
    incidentConditions: api.incident_conditions ?? api.incidentConditions ?? api.scenario_briefing ?? api.scenarioBriefing ?? simulationState.incidentConditions,
    vulnerabilities: normalizeStringList(api.policy_gaps ?? api.policyGaps ?? api.vulnerabilities ?? api.weak_clauses ?? api.weakClauses) ?? simulationState.vulnerabilities,
    alternativePolicy: api.revised_policy ?? api.revisedPolicy ?? api.alternative_policy ?? api.alternativePolicy ?? simulationState.alternativePolicy,
    recommendation: api.revised_policy_rationale ?? api.revisedPolicyRationale ?? api.recommendation ?? api.policy_recommendation ?? api.policyRecommendation ?? simulationState.recommendation,
    verifiedPolicyText: api.verified_policy_document ?? api.verifiedPolicyDocument ?? api.policy_document ?? api.policyDocument ?? simulationState.verifiedPolicyText,
    policySummary: api.policy_diagnosis ?? api.policyDiagnosis ?? simulationState.policySummary,
    policyStrengths: normalizeStringList(api.policy_strengths ?? api.policyStrengths) ?? simulationState.policyStrengths,
    policySafeguards: api.current_policy_safeguards ?? api.currentPolicySafeguards ?? simulationState.policySafeguards,
    analysisHeadline: api.analysis_headline ?? api.analysisHeadline ?? api.headline ?? simulationState.analysisHeadline,
    riskReasons: api.risk_reasons ?? api.riskReasons ?? simulationState.riskReasons,
    isComplete: Boolean(isComplete || api.is_complete || api.isComplete),
  };

  simulationState.currentPolicyRisks = {
    overallRisk: criticalRiskScore(),
    factCheckNeed: clampMetric(100 - simulationState.claimValidity),
    manipulationRisk: simulationState.manipulationRisk,
    handoffNeed: simulationState.handoffNeed,
    overConcessionRisk: simulationState.overConcessionRisk,
    underResponseRisk: simulationState.underResponseRisk,
    policyViolationRisk: simulationState.policyViolationRisk,
  };

  simulationState.alternativePolicyRisks = {
    overallRisk: hasRevisedRiskData ? clampMetric(revisedOverallRisk) : null,
    factCheckNeed: hasRevisedRiskData ? clampMetric(100 - revisedClaimValidity) : null,
    manipulationRisk: hasRevisedRiskData ? clampMetric(revisedManipulationRisk) : null,
    handoffNeed: hasRevisedRiskData ? clampMetric(revisedHandoffNeed) : null,
    overConcessionRisk: hasRevisedRiskData ? clampMetric(revisedOverConcessionRisk) : null,
    underResponseRisk: hasRevisedRiskData ? clampMetric(revisedUnderResponseRisk) : null,
    policyViolationRisk: hasRevisedRiskData ? clampMetric(revisedPolicyViolationRisk) : null,
  };
  simulationState.hasAlternativeRiskData = hasRevisedRiskData;

  if (simulationState.cycle >= simulationState.maxCycles) simulationState.isComplete = true;
  if (providedBalanceScore == null) simulationState.policyBalanceScore = calculatePolicyBalanceScore(simulationState);
}

function syncSimulationStateFromMessages() {
  const reversed = [...messages].reverse();
  const latestAssistant = reversed.find((message) =>
    message.role === 'assistant' && (message.metadata?.simulation_state || message.metadata?.game_state)
  );
  const latest = latestAssistant ?? reversed.find((message) => message.metadata?.simulation_state || message.metadata?.game_state);
  if (latest) {
    remapApiSimulationState(latest.metadata?.simulation_state ?? latest.metadata?.game_state, Boolean(latest.metadata?.is_complete ?? latest.metadata?.is_game_over));
    return;
  }
  const count = analysisRequestCount();
  simulationState.cycle = Math.min(simulationState.maxCycles, count);
  simulationState.isComplete = count >= simulationState.maxCycles;
}

function buildApiCompatibleState() {
  return {
    mode: 'policy_simulation',
    cycle: simulationState.cycle,
    max_cycles: simulationState.maxCycles,
    turn: simulationState.cycle,
    max_turns: simulationState.maxCycles,
    policy_balance_score: simulationState.policyBalanceScore,
    survival_score: simulationState.policyBalanceScore,
    claim_validity: simulationState.claimValidity,
    manipulation_risk: simulationState.manipulationRisk,
    handoff_need: simulationState.handoffNeed,
    escalation_need: simulationState.handoffNeed,
    over_concession_risk: simulationState.overConcessionRisk,
    under_response_risk: simulationState.underResponseRisk,
    policy_violation_risk: simulationState.policyViolationRisk,
    policy_document: simulationState.policyDocument,
    record_date: simulationState.recordDate,
    record_title: simulationState.recordTitle,
    incident_conditions: simulationState.incidentConditions,
    vulnerabilities: simulationState.vulnerabilities,
    verified_policy_document: simulationState.verifiedPolicyText,
    policy_diagnosis: simulationState.policySummary,
    policy_strengths: simulationState.policyStrengths,
    policy_gaps: simulationState.vulnerabilities,
    current_policy_safeguards: simulationState.policySafeguards,
    revised_policy: simulationState.alternativePolicy,
    revised_policy_rationale: simulationState.recommendation,
    risk_comparison_valid: Boolean(simulationState.verifiedPolicyText && simulationState.hasAlternativeRiskData),
    alternative_policy: simulationState.alternativePolicy,
    recommendation: simulationState.recommendation,
    analysis_headline: simulationState.analysisHeadline,
    risk_reasons: simulationState.riskReasons,
    scenario_title: simulationState.scenarioTitle,
    scenario_briefing: simulationState.incidentConditions,
  };
}

function syncPolicyInputsFromState() {
  if (dom.policyDocument) dom.policyDocument.value = simulationState.policyDocument ?? '';
  if (dom.incidentConditions) dom.incidentConditions.value = simulationState.incidentConditions ?? '';
  if (dom.recordDate) dom.recordDate.value = simulationState.recordDate || selectedCalendarDate || toDateKey(new Date());
  if (dom.recordTitle) dom.recordTitle.value = simulationState.recordTitle ?? '';
}

function syncSimulationStateFromInputs() {
  if (dom.policyDocument) simulationState.policyDocument = dom.policyDocument.value.trim();
  if (dom.incidentConditions) simulationState.incidentConditions = dom.incidentConditions.value.trim();
  if (dom.recordDate) simulationState.recordDate = dom.recordDate.value || toDateKey(new Date());
  if (dom.recordTitle) simulationState.recordTitle = dom.recordTitle.value.trim();
}


function riskMetricRows() {
  const reasons = simulationState.riskReasons && typeof simulationState.riskReasons === 'object'
    ? simulationState.riskReasons
    : {};
  const rows = [
    {
      key: 'factCheckNeed',
      label: '사실을 더 확인할 필요',
      technicalLabel: '사실 확인',
      value: clampMetric(100 - simulationState.claimValidity),
      help: reasons.fact_check_need || '정책에 학생 진술, 교사 관찰, 상담·연락 기록을 확인하는 기준이 필요한 정도입니다.',
    },
    {
      key: 'manipulationRisk',
      label: '민원 압박에 흔들릴 위험',
      technicalLabel: '압박 영향',
      value: simulationState.manipulationRisk,
      help: reasons.manipulation_risk || '정책이 반복 항의·공개 언급과 사실 판단을 분리하지 못할 위험입니다.',
    },
    {
      key: 'overConcessionRisk',
      label: '확인 전에 약속할 위험',
      technicalLabel: '성급한 약속',
      value: simulationState.overConcessionRisk,
      help: reasons.over_concession_risk || '정책에 사실 확인 전 사과·지도 철회·담임 교체를 제한하는 기준이 부족한 정도입니다.',
    },
    {
      key: 'underResponseRisk',
      label: '필요한 대응을 놓칠 위험',
      technicalLabel: '대응 누락',
      value: simulationState.underResponseRisk,
      help: reasons.under_response_risk || '정책에 근거 있는 문제 제기와 학생 보호 필요를 검토하는 기준이 부족한 정도입니다.',
    },
    {
      key: 'policyViolationRisk',
      label: '학교 기준을 벗어날 위험',
      technicalLabel: '학교 기준',
      value: simulationState.policyViolationRisk,
      help: reasons.policy_violation_risk || '사실 확인, 개인정보 보호, 생활지도 기록과 학교 절차가 충분히 정해지지 않은 정도입니다.',
    },
    {
      key: 'handoffNeed',
      label: '관리자에게 공유할 필요',
      technicalLabel: '관리자 공유',
      value: simulationState.handoffNeed,
      help: reasons.escalation_need || '정책에 교장·교감·부장교사와 공유할 조건을 구체적으로 둘 필요가 있는 정도입니다.',
    },
  ];
  return rows.map((row) => ({
    ...row,
    revisedValue: simulationState.hasAlternativeRiskData
      ? numberOrNull(simulationState.alternativePolicyRisks?.[row.key])
      : null,
  }));
}

function renderPolicyAssessment() {
  if (!dom.policyAssessment) return;
  const safeguards = simulationState.policySafeguards && typeof simulationState.policySafeguards === 'object'
    ? simulationState.policySafeguards
    : {};
  const safeguardRows = [
    ['evidence_required', '사실·기록 확인'],
    ['approval_required', '관리자 승인'],
    ['threshold_defined', '적용 기준'],
    ['deadline_defined', '처리 기한'],
    ['handoff_defined', '관리자 공유'],
    ['pressure_separated', '압박과 사실 판단 분리'],
    ['privacy_guard', '개인정보 보호'],
  ];
  const verifiedPolicy = String(simulationState.verifiedPolicyText || '').trim();
  const strengths = Array.isArray(simulationState.policyStrengths) ? simulationState.policyStrengths : [];
  const gaps = Array.isArray(simulationState.vulnerabilities) ? simulationState.vulnerabilities : [];
  const currentRisk = criticalRiskScore();
  const revisedRisk = simulationState.alternativePolicyRisks?.overallRisk;
  const delta = simulationState.hasAlternativeRiskData ? Number(revisedRisk) - currentRisk : null;

  dom.policyAssessment.innerHTML = `
    <section class="policy-source-card" data-status="${verifiedPolicy ? 'provided' : 'missing'}">
      <span>${verifiedPolicy ? '점수에 반영한 현재 정책' : '정책 문장을 확인하지 못함'}</span>
      <p>${escapeHtml(sanitizeProductLanguage(verifiedPolicy || '현재 정책에서 위험 계산에 반영할 수 있는 명확한 기준을 찾지 못했습니다.'))}</p>
    </section>
    <p class="policy-diagnosis-copy">${escapeHtml(sanitizeProductLanguage(simulationState.policySummary || '현재 정책의 구성과 빠진 기준을 분석했습니다.'))}</p>
    <div class="policy-safeguard-grid" aria-label="현재 정책 안전장치">
      ${safeguardRows.map(([key, label]) => `<span data-covered="${safeguards[key] ? 'true' : 'false'}"><i aria-hidden="true">${safeguards[key] ? '✓' : '–'}</i>${escapeHtml(label)}<small>${safeguards[key] ? '정책에 있음' : '보완 필요'}</small></span>`).join('')}
    </div>
    <div class="policy-findings-grid">
      <section><span>정책의 강점</span>${strengths.length ? `<ul>${strengths.map((item) => `<li>${escapeHtml(sanitizeProductLanguage(item))}</li>`).join('')}</ul>` : '<p>명확히 확인된 강점이 없습니다.</p>'}</section>
      <section><span>정책의 빈틈</span>${gaps.length ? `<ul>${gaps.map((item) => `<li>${escapeHtml(sanitizeProductLanguage(item))}</li>`).join('')}</ul>` : '<p>추가로 확인된 빈틈이 없습니다.</p>'}</section>
    </div>
    ${simulationState.alternativePolicy ? `
      <section class="revised-policy-card">
        <div><span>권장 정책안</span><small>학교 내부 검토용 초안</small></div>
        <p>${escapeHtml(sanitizeProductLanguage(simulationState.alternativePolicy))}</p>
        ${simulationState.recommendation ? `<small>${escapeHtml(sanitizeProductLanguage(simulationState.recommendation))}</small>` : ''}
        <button class="ghost-button" type="button" data-copy-policy>정책안 복사</button>
      </section>
      ${simulationState.hasAlternativeRiskData ? `
        <div class="policy-risk-impact" data-tone="${delta < 0 ? 'better' : delta > 0 ? 'worse' : 'same'}">
          <div><span>현재 정책 위험</span><strong>${currentRisk}</strong></div><i aria-hidden="true">→</i><div><span>권장안 적용 예상</span><strong>${escapeHtml(revisedRisk)}</strong></div><b>${delta < 0 ? `${Math.abs(delta)}점 감소` : delta > 0 ? `${delta}점 증가` : '변화 없음'}</b>
        </div>
      ` : ''}
    ` : ''}
  `;

  dom.policyAssessment.querySelector('[data-copy-policy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(sanitizeProductLanguage(simulationState.alternativePolicy));
      showToast('권장 정책안을 복사했습니다.', 'ready');
    } catch {
      showToast('정책안을 복사할 수 없습니다.', 'error');
    }
  });
}

function renderSimulationHud() {
  if (!dom.simulationHud) return;
  if (!String(simulationState.verifiedPolicyText || '').trim()) {
    dom.simulationHud.innerHTML = `
      <section class="policy-source-card risk-unavailable-card" data-status="missing">
        <span>위험 점수를 표시하지 않았습니다</span>
        <p>정책·학교 기준 입력란에 실제로 적용 중인 문장을 붙여 넣고 다시 분석해 주세요.</p>
      </section>
    `;
    return;
  }
  const summary = policyDecisionSummary();
  const overallRisk = criticalRiskScore();
  const metrics = riskMetricRows();
  const headline = simulationState.analysisHeadline || summary.title;
  dom.simulationHud.innerHTML = `
    <div class="decision-banner" data-tone="${summary.tone}">
      <div>
        <span>정책 위험 결론</span>
        <h3>${escapeHtml(sanitizeProductLanguage(headline))}</h3>
        <p>${escapeHtml(summary.detail)}</p>
      </div>
      <div class="balance-score">
        <span>전체 위험</span>
        <strong>${overallRisk}<small>/100</small></strong>
        <p>${metricStatusLabel(overallRisk)}</p>
      </div>
    </div>
    <section class="all-risk-details" aria-labelledby="school-risk-list-title">
      <h3 class="expanded-section-title" id="school-risk-list-title">세부 위험</h3>
      <div class="risk-list" aria-label="학교 대응 위험 6가지 점수">
        ${metrics.map((item) => `
          <div class="risk-row" data-tone="${metricTone(item.value)}">
            <div><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.help)}</small></div>
            <div class="risk-score-pair"><strong><small>현재</small>${escapeHtml(item.value)}</strong>${item.revisedValue !== null ? `<i aria-hidden="true">→</i><strong data-revised><small>권장안</small>${escapeHtml(item.revisedValue)}</strong>` : ''}</div>
            <i role="progressbar" aria-label="${escapeHtml(item.label)} ${escapeHtml(item.value)}점" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(item.value)}" style="--value: ${escapeHtml(item.value)}%"></i>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAnalysisPanels() {
  renderPolicyAssessment();
  renderSimulationHud();
  renderInputGuidance();
}

function renderConversations() {
  if (!dom.conversationList) return;
  dom.conversationList.innerHTML = '';

  if (!conversations.length) {
    const empty = document.createElement('p');
    empty.className = 'conversation-empty';
    empty.textContent = '아직 저장된 기록이 없습니다.';
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
      <strong>${escapeHtml(sanitizeProductLanguage(conversation.title || '새 기록'))}</strong>
      <span>${formatDate(conversation.saved_at || conversation.created_at)} · 위험 분석 완료</span>
    `;
    button.addEventListener('click', () => selectConversation(conversation.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'conversation-delete';
    deleteButton.setAttribute('aria-label', `${conversation.title || '새 기록'} 삭제`);
    deleteButton.title = '기록 삭제';
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
  syncSimulationStateFromMessages();
  if (dom.chatTitle) dom.chatTitle.textContent = sanitizeProductLanguage(activeConversation?.title || simulationState.recordTitle || simulationState.scenarioTitle || '내 기록');

  const firstAnalysisIndex = messages.findIndex((message) =>
    message.role === 'assistant' &&
    (message.metadata?.simulation_state || message.metadata?.game_state || message.metadata?.analysis_state)
  );
  const visibleMessages = firstAnalysisIndex >= 0 ? messages.slice(firstAnalysisIndex + 1) : [];

  if (!visibleMessages.length) {
    const empty = document.createElement('p');
    empty.className = 'followup-empty';
    empty.textContent = '위 결과에서 더 필요한 내용이 있으면 아래에 바로 물어보세요.';
    dom.messageList.append(empty);
  }

  for (const message of visibleMessages) {
    const item = document.createElement('article');
    item.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
    const role = message.role === 'user' ? '내가 적은 내용' : 'AI 정책 분석';
    item.innerHTML = `
      <span class="role">${role}</span>
      ${message.role === 'assistant' ? formatAssistantMessage(message.content) : `<p>${escapeHtml(compactText(sanitizeProductLanguage(message.content), 1200))}</p>`}
    `;
    dom.messageList.append(item);
  }

  if (isSending && firstAnalysisIndex >= 0) {
    const loading = document.createElement('article');
    loading.className = 'message assistant is-loading';
    loading.innerHTML = `
      <span class="role">AI가 정책과 위험을 분석하고 있어요</span>
      <div class="loading-copy">
        <span>현재 정책 확인 → 정책 빈틈 진단 → 6가지 위험 비교</span>
        <i></i><i></i><i></i>
      </div>
    `;
    dom.messageList.append(loading);
  }

  if (!isSending && analysisRequestCount() >= MAX_ANALYSIS_CYCLES) {
    dom.messageList.append(createPolicyReportPanel());
  }

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

function renderSendState() {
  dom.newChatButtons.forEach((button) => { button.disabled = isSending; });
  if (!dom.sendButton) return;
  const noCredits = remainingUsage() <= 0;
  const maxCycles = simulationState.isComplete || analysisRequestCount() >= MAX_ANALYSIS_CYCLES;
  dom.sendButton.disabled = isSending || !session?.user || noCredits || maxCycles;
  dom.sendButton.textContent = isSending
    ? '정책 위험 분석 중'
    : maxCycles
      ? '추가 질문을 모두 사용했어요'
      : noCredits
        ? 'AI 이용 포인트 없음'
        : '질문 보내기';

  if (dom.runSimulation) {
    dom.runSimulation.disabled = isSending || !session?.user || noCredits;
    dom.runSimulation.textContent = isSending
      ? '정책과 위험 계산 중...'
      : noCredits
        ? '이번 달 AI 이용량을 확인해 주세요'
        : '정책 위험 분석하기';
  }
}

function renderAll() {
  renderAuth();
  renderConversations();
  renderCalendar();
  syncSimulationStateFromMessages();
  renderAnalysisPanels();
  renderMessages();
  renderSendState();
  renderWorkspaceState();
}

function hasFinalReport() {
  return messages.some((message) => message.metadata?.mode === 'final_report');
}

function createPolicyReportPanel() {
  const panel = document.createElement('section');
  panel.className = 'final-report-card';
  const reportCreated = hasFinalReport();
  const canRequestDetail =
    session?.user && activeConversation?.id && remainingUsage() >= FINAL_REPORT_COST && !isRequestingReport && !reportCreated;
  const hasVerifiedPolicy = Boolean(String(simulationState.verifiedPolicyText || '').trim());
  panel.innerHTML = `
    <span class="section-kicker">정리가 끝났어요</span>
    <h2>정책과 위험 한눈에 보기</h2>
    <div class="result-tags">
      ${hasVerifiedPolicy ? `<span>현재 정책 위험 ${criticalRiskScore()}/100</span>` : '<span>현재 정책 확인 필요</span>'}
      ${hasVerifiedPolicy && simulationState.hasAlternativeRiskData ? `<span>권장안 예상 위험 ${simulationState.alternativePolicyRisks.overallRisk}/100</span>` : ''}
      ${hasVerifiedPolicy ? `<span>정책 안전장치 ${scoreGrade(simulationState.policyBalanceScore)}등급</span><span>관리자에게 공유할 필요 ${simulationState.handoffNeed}/100</span>` : ''}
    </div>
    <p>${analysisRequestCount()}/${simulationState.maxCycles}회 분석을 바탕으로 현재 정책의 빈틈, 권장 정책안과 위험 변화를 정리했습니다.</p>
    <div class="result-actions">
      <button class="primary-button" type="button" data-new-simulation>새 기록</button>
      <button class="ghost-button" type="button" data-final-report ${canRequestDetail ? '' : 'disabled'}>
        ${reportCreated ? '자세한 분석을 만들었어요' : isRequestingReport ? '자세한 분석 만드는 중' : `자세한 분석 보기 · ${FINAL_REPORT_COST}포인트`}
      </button>
    </div>
  `;
  panel.querySelector('[data-final-report]')?.addEventListener('click', requestFinalReport);
  panel.querySelector('[data-new-simulation]')?.addEventListener('click', newChat);
  return panel;
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

function syncModalLock() {
  const modalOpen = [dom.authModal, dom.guideModal, dom.legalModal].some((modal) => modal && !modal.hidden);
  dom.body.classList.toggle('is-modal-open', modalOpen);
}

function setAuthModal(open, mode = 'login') {
  if (!dom.authModal || !dom.authBackdrop) return;
  dom.authBackdrop.hidden = !open;
  dom.authModal.hidden = !open;
  dom.authModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  syncModalLock();
  if (open) {
    setAuthMode(mode === 'signup' ? 'signup' : 'login');
    window.setTimeout(() => dom.authEmail?.focus(), 80);
  }
}

function setGuideModal(open) {
  if (!dom.guideModal || !dom.guideBackdrop) return;
  dom.guideBackdrop.hidden = !open;
  dom.guideModal.hidden = !open;
  dom.guideModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  syncModalLock();
}

function setLegalModal(kind = 'privacy', open = true, trigger = null) {
  if (!dom.legalModal || !dom.legalBackdrop) return;
  const selectedKind = kind === 'terms' ? 'terms' : 'privacy';
  if (open) lastLegalTrigger = trigger || document.activeElement;
  dom.legalContents.forEach((content) => {
    content.hidden = !open || content.dataset.legalContent !== selectedKind;
  });
  if (dom.legalTitle) dom.legalTitle.textContent = selectedKind === 'terms' ? '이용약관' : '개인정보처리방침';
  dom.legalBackdrop.hidden = !open;
  dom.legalModal.hidden = !open;
  dom.legalModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  syncModalLock();
  if (open) {
    dom.legalModal.scrollTop = 0;
    window.setTimeout(() => dom.legalClose?.focus(), 60);
  } else if (lastLegalTrigger instanceof HTMLElement) {
    window.setTimeout(() => lastLegalTrigger?.focus(), 60);
  }
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
  const message = sanitizeProductLanguage(String(error?.message || error || ''));
  if (/Authentication required|JWT|401/i.test(message)) return '로그인이 풀렸습니다. 다시 로그인해 주세요.';
  if (/limit|quota|usage|credit|한도|크레딧/i.test(message)) return '이번 달 AI 이용 포인트를 확인해 주세요.';
  if (/timeout|지연|aborted|network/i.test(message)) return '분석이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.';
  if (/Failed to send a request|FunctionsHttpError|Edge Function|fetch/i.test(message)) {
    return 'AI 분석 결과를 받아오지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  }
  return message || '내용을 정리하는 중 문제가 생겼습니다.';
}


async function invokeReportChat(payload) {
  const result = await withTimeout(
    supabase.functions.invoke('report-chat', { body: payload }),
    105000,
    '정책 위험 분석이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.'
  );
  if (!result.error) return result;

  const context = result.error.context;
  if (context instanceof Response) {
    const errorBody = await context.clone().json().catch(() => null);
    if (errorBody?.error) {
      const serviceError = new Error(errorBody.error);
      serviceError.usage = errorBody.usage ?? errorBody.usage_state ?? errorBody.usageState ?? null;
      serviceError.cost = numberOrNull(errorBody.meta?.cost);
      throw serviceError;
    }
  }
  throw result.error;
}

async function restoreSession() {
  const client = ensureClient();
  if (!client) {
    showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
    return null;
  }

  const { data, error } = await withTimeout(client.auth.getSession(), 12000, '로그인 세션 확인이 지연되고 있습니다.');
  if (error) throw error;
  session = data.session ?? null;
  renderAuth();
  return session;
}

async function loadUsage({ preserveOnError = true, minimumUsed = null } = {}) {
  if (!session?.user || !supabase) {
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_my_report_usage'),
      12000,
      '이번 달 AI 사용량을 확인하는 데 시간이 걸리고 있습니다.'
    );
    if (!error && data) {
      applyUsageState(data, { minimumUsed });
      lastUsageRefreshAt = Date.now();
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
        used: preserveOnError ? Math.max(usageState.used, numberOrNull(minimumUsed) ?? 0) : 0,
        limit: tierInfo(tier).limit,
      });
      lastUsageRefreshAt = Date.now();
      return;
    }
  } catch {
    // Preserve the last known quota if Supabase is temporarily slow.
  }

  if (!preserveOnError) {
    applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }
}

function refreshUsageWhenVisible() {
  if (document.visibilityState === 'hidden' || !session?.user || !supabase || isSending || isRequestingReport) return;
  const now = Date.now();
  if (now - lastUsageRefreshAt < 5000) return;
  lastUsageRefreshAt = now;
  void loadUsage({ preserveOnError: true });
}

async function loadConversations() {
  if (!session?.user || !supabase) {
    conversations = [];
    activeConversation = null;
    messages = [];
    resetSimulationState();
    workspaceView = 'input';
    return;
  }

  const { data, error } = await withTimeout(
    supabase
      .from('report_conversations')
      .select(conversationSelect)
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(500),
    12000,
    '저장된 기록을 불러오는 데 시간이 걸리고 있습니다.'
  );
  if (error) throw error;

  conversations = data ?? [];
  activeConversation = conversations[0] ?? null;
  await loadMessages({ silent: true });
}

async function loadMessages({ silent = false } = {}) {
  if (!activeConversation?.id || !session?.user || !supabase) {
    messages = [];
    const previousView = workspaceView;
    prepareBlankRecord(selectedCalendarDate || toDateKey(new Date()));
    workspaceView = previousView === 'calendar' ? 'calendar' : 'input';
    syncPolicyInputsFromState();
    renderMessages();
    return;
  }

  const hadConfirmedAnalysis = hasAnalysisResult();
  const preservedMessages = hadConfirmedAnalysis ? [...messages] : null;
  if (!hadConfirmedAnalysis) analysisPhase = 'loading';
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
      'AI가 정리한 내용을 불러오는 데 시간이 걸리고 있습니다.'
    );
    if (error) throw error;
    const loadedMessages = data ?? [];
    const loadedIsStale = preservedMessages && analysisRequestCount(loadedMessages) < analysisRequestCount(preservedMessages);
    messages = loadedIsStale ? preservedMessages : loadedMessages;
    syncSimulationStateFromMessages();
    workspaceView = hasAnalysisResult() ? 'results' : 'input';
    analysisPhase = hasAnalysisResult() ? 'success' : 'idle';
    syncPolicyInputsFromState();
  } catch (error) {
    analysisPhase = hadConfirmedAnalysis ? 'success' : 'error';
    if (!hadConfirmedAnalysis) workspaceView = 'input';
    if (!silent) showToast(friendlyServiceError(error), 'error');
  }

  renderMessages();
}

async function selectConversation(id) {
  if (isSending) {
    showToast('정리가 끝난 뒤 다른 기록을 열 수 있습니다.', 'info');
    return;
  }
  setChatHistoryOpen(false);
  activeConversation = conversations.find((conversation) => conversation.id === id) ?? null;
  if (activeConversation) {
    selectedCalendarDate = conversationDateKey(activeConversation);
    const selectedDate = dateFromKey(selectedCalendarDate);
    calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }
  messages = [];
  analysisPhase = activeConversation ? 'loading' : 'idle';
  renderAll();
  await loadMessages();
  renderAll();
}

function newChat(dateValue = selectedCalendarDate) {
  if (isSending) {
    showToast('지금 정리가 끝난 뒤 새 기록을 만들 수 있습니다.', 'info');
    return;
  }
  setChatHistoryOpen(false);
  activeConversation = null;
  messages = [];
  const requestedDate = typeof dateValue === 'string' ? dateValue : selectedCalendarDate;
  prepareBlankRecord(requestedDate || toDateKey(new Date()));
  syncPolicyInputsFromState();
  renderAll();
  window.setTimeout(() => dom.incidentConditions?.focus(), 60);
}

async function deleteConversation(id) {
  if (isSending) {
    showToast('정리가 끝난 뒤 기록을 삭제할 수 있습니다.', 'info');
    return;
  }
  if (!id || !session?.user || !supabase) {
    showToast('로그인 후 저장된 기록을 삭제할 수 있습니다.', 'error');
    return;
  }

  const target = conversations.find((conversation) => conversation.id === id);
  const title = sanitizeProductLanguage(target?.title || '새 기록');
  const confirmed = window.confirm(`'${title}' 기록을 삭제할까요?\nAI가 정리한 내용도 함께 삭제됩니다.`);
  if (!confirmed) return;

  const wasActive = activeConversation?.id === id;
  showToast('기록을 삭제하는 중입니다.');

  try {
    const deleteConversationRecord = () =>
      withTimeout(
        supabase
          .from('report_conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id),
        12000,
        '기록을 삭제하는 데 시간이 걸리고 있습니다.'
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
        'AI가 정리한 내용을 삭제하는 데 시간이 걸리고 있습니다.'
      );
      if (messageError) throw messageError;

      ({ error } = await deleteConversationRecord());
      if (error) throw error;
    }

    conversations = conversations.filter((conversation) => conversation.id !== id);

    if (wasActive) {
      activeConversation = conversations[0] ?? null;
      messages = [];
      if (activeConversation) {
        selectedCalendarDate = conversationDateKey(activeConversation);
        const selectedDate = dateFromKey(selectedCalendarDate);
        calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        await loadMessages({ silent: true });
      }
      else {
        prepareBlankRecord(selectedCalendarDate || toDateKey(new Date()));
        workspaceView = 'calendar';
        syncPolicyInputsFromState();
      }
    }

    renderAll();
    showToast('기록을 삭제했습니다.', 'ready');
  } catch (error) {
    showToast(friendlyServiceError(error), 'error');
  }
}

function currentProduct() {
  return usageState.tier === 'teacher' ? 'teachers' : 'pro';
}

function openPolicyConsole(event) {
  event?.preventDefault();
  if (dom.mobileSiteMenu) dom.mobileSiteMenu.open = false;
  if (session?.user) {
    if (event?.currentTarget?.hasAttribute('data-reset-simulation')) {
      activeConversation = null;
      messages = [];
      prepareBlankRecord(toDateKey(new Date()));
      syncPolicyInputsFromState();
    } else {
      workspaceView = 'calendar';
    }
    setView('chat');
    renderAll();
    window.setTimeout(() => (workspaceView === 'input' ? dom.incidentConditions : dom.workspaceCalendar)?.focus?.(), 80);
    return;
  }
  pendingNewSimulation = Boolean(event?.currentTarget?.hasAttribute('data-reset-simulation'));
  const requestedMode = event?.currentTarget?.dataset.authModeTarget === 'signup' ? 'signup' : 'login';
  setAuthModal(true, requestedMode);
}

function buildPolicyAnalysisRequest(extraText = '') {
  syncSimulationStateFromInputs();
  const request = [
    '[기록 정보]',
    `${simulationState.recordDate || toDateKey(new Date())} · ${simulationState.recordTitle || '제목 자동 생성'}`,
    '',
    '[상황 기록]',
    simulationState.incidentConditions,
    '',
    '[현재 적용 중인 정책·학교 기준]',
    simulationState.policyDocument || '입력하지 않음',
    '',
    '[요청]',
    extraText || '현재 정책의 강점과 빈틈을 진단하고, 학교 대응 위험 6가지와 권장 정책안을 쉬운 한국어로 정리해줘.',
  ].join('\n');
  return compactText(request, MAX_POLICY_ANALYSIS_CHARS);
}

async function runPolicySimulation() {
  if (!session?.user) {
    pendingNewSimulation = false;
    setAuthModal(true);
    showToast('로그인하면 현재 정책과 학교 대응 위험을 분석할 수 있습니다.', 'error');
    return;
  }
  syncSimulationStateFromInputs();
  const inputStatus = requiredInputStatus();
  if (inputStatus.missing.length) {
    const firstMissing = inputStatus.missing[0];
    showToast(`${firstMissing.label}을(를) 먼저 입력해 주세요.`, 'error');
    firstMissing.element?.focus();
    return;
  }
  await sendMessage(buildPolicyAnalysisRequest(), { generatedFromInput: true });
}

async function sendMessage(message, { generatedFromInput = false } = {}) {
  const rawText = String(message ?? '').trim();
  if (rawText.length > MAX_POLICY_ANALYSIS_CHARS) {
    showToast(`한 번에 적을 수 있는 글은 ${MAX_POLICY_ANALYSIS_CHARS}자까지입니다.`, 'error');
    return;
  }
  const text = compactText(rawText, MAX_POLICY_ANALYSIS_CHARS);
  if (!text || isSending) return;

  if (!session?.user) {
    setAuthModal(true);
    showToast('로그인하면 현재 정책과 학교 대응 위험을 분석할 수 있습니다.', 'error');
    return;
  }

  if (!supabase) {
    showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
    return;
  }

  syncSimulationStateFromInputs();

  if (!simulationState.incidentConditions) {
    showToast('상황 기록을 먼저 적어 주세요.', 'error');
    dom.incidentConditions?.focus();
    return;
  }

  const requestState = buildApiCompatibleState();
  if (remainingUsage() <= 0) {
    showToast('이번 달 AI 이용 포인트를 모두 사용했습니다.', 'error');
    return;
  }

  if (simulationState.isComplete || analysisRequestCount() >= MAX_ANALYSIS_CYCLES) {
    showToast(`한 기록에서는 AI 분석을 총 ${MAX_ANALYSIS_CYCLES}번까지 할 수 있습니다.`, 'error');
    return;
  }

  const hadConfirmedAnalysis = hasAnalysisResult();
  const displayContent = generatedFromInput
    ? `이 기록을 분석해 주세요: ${simulationState.recordTitle || compactText(simulationState.incidentConditions, 36)}`
    : text;

  const tempUser = {
    id: `local-user-${Date.now()}`,
    role: 'user',
    content: displayContent,
    metadata: { mode: 'policy_simulation', pending: true },
    created_at: new Date().toISOString(),
  };
  messages = [...messages, tempUser];
  if (!generatedFromInput && dom.chatInput) dom.chatInput.value = '';
  resizeComposer();
  isSending = true;
  analysisPhase = generatedFromInput || !hadConfirmedAnalysis ? 'loading' : 'refreshing';
  workspaceView = 'results';
  renderAll();

  const usageBefore = { ...usageState };
  let committedUsage = null;
  try {
    const { data } = await invokeReportChat({
      conversationId: activeConversation?.id ?? null,
      recordDate: requestState.record_date,
      recordTitle: requestState.record_title,
      product: currentProduct(),
      mode: 'teacher_analysis',
      message: text,
      [compatStateKey]: requestState,
    });
    if (data?.error) throw new Error(data.error);
    committedUsage = commitUsageAfterRequest(data, usageBefore, 1);
    reconcileUsageSoon(committedUsage.used);

    const assistantMessage = sanitizeProductLanguage(
      data?.assistantMessage ??
      data?.assistant_message ??
      data?.message ??
      data?.reply ??
      '현재 정책과 학교 대응 위험을 분석했습니다.'
    );

    const confirmedState = data?.simulation_state ?? data?.simulationState ?? data?.game_state ?? data?.[compatStateKey];
    if (!confirmedState || typeof confirmedState !== 'object') {
      throw new Error('정리된 결과를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    }
    remapApiSimulationState(
      confirmedState,
      Boolean(data?.is_complete ?? data?.isComplete ?? data?.is_game_over ?? data?.isGameOver)
    );
    messages = [
      ...messages,
      {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage,
        metadata: {
          mode: 'policy_simulation',
          simulation_state: confirmedState,
          game_state: confirmedState,
          analysis_state: data?.analysis_state ?? null,
          analysis_result: data?.analysis_result ?? null,
          is_complete: simulationState.isComplete,
        },
        created_at: new Date().toISOString(),
      },
    ];
    analysisPhase = 'success';

    if (data?.conversation) {
      activeConversation = data.conversation;
      const existingIndex = conversations.findIndex((item) => item.id === activeConversation.id);
      if (existingIndex >= 0) conversations[existingIndex] = activeConversation;
      else conversations.unshift(activeConversation);
      await loadMessages({ silent: true });
    }

    syncPolicyInputsFromState();
    showToast('현재 정책과 학교 대응 위험을 분석했습니다.', 'ready');
  } catch (error) {
    if (error?.usage) committedUsage = commitUsageAfterRequest(error, usageBefore, error?.cost ?? 1);
    reconcileUsageSoon(committedUsage?.used ?? usageBefore.used);
    messages = [
      ...messages,
      {
        id: `local-error-${Date.now()}`,
        role: 'assistant',
        content: `오류 안내: ${friendlyServiceError(error)}`,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ];
    analysisPhase = hadConfirmedAnalysis ? 'success' : 'error';
    if (!hadConfirmedAnalysis) workspaceView = 'input';
    showToast(friendlyServiceError(error), 'error');
  } finally {
    isSending = false;
    renderAll();
    if (generatedFromInput && analysisPhase === 'success') {
      window.setTimeout(() => dom.analysisContent?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }
}

async function requestFinalReport() {
  if (isRequestingReport || !session?.user || !activeConversation?.id) return;
  if (remainingUsage() < FINAL_REPORT_COST) {
    showToast(`자세한 분석에는 AI 이용 포인트 ${FINAL_REPORT_COST}이 필요합니다.`, 'error');
    return;
  }

  isRequestingReport = true;
  renderAll();

  const usageBefore = { ...usageState };
  let committedUsage = null;
  try {
    const { data } = await invokeReportChat({
      conversationId: activeConversation.id,
      product: currentProduct(),
      mode: 'final_report',
      message: '현재 정책 진단과 6가지 위험, 권장 정책안의 영향을 더 자세히 설명해줘.',
      [compatStateKey]: buildApiCompatibleState(),
      clientGuidance: [
        '자세한 분석은 현재 정책 진단과 학교 대응 위험 검토에 바로 쓸 수 있게 작성한다.',
        '내부 계산은 드러내지 않고 현재 정책의 강점과 빈틈, 6가지 위험점수, 권장 정책안, 정책 보완 전후 위험 변화를 포함한다.',
        '사용자에게 보이는 본문에는 QRE, Logit-QRE, λ, 효용, 페르소나, 선택 성향, 행동 유형, 과잉양보, 과소대응, 취약점, 이관을 쓰지 않는다.',
        '사용자에게 보이는 결과는 현재 정책 진단, 정책의 강점과 빈틈, 학교 대응 위험 6가지, 권장 정책안, 예상 위험 변화로만 구성한다.',
        '학부모를 평가하거나 공격하지 않고 교육활동 침해 여부를 단정하지 않는다.',
        '이전 제품의 놀이형 훈련 어휘를 쓰지 않는다.',
        '법률 판단, 책임 인정, 행정 처분 결론은 단정하지 않는다.',
      ].join('\n'),
    });
    if (data?.error) throw new Error(data.error);
    committedUsage = commitUsageAfterRequest(data, usageBefore, FINAL_REPORT_COST);
    reconcileUsageSoon(committedUsage.used);

    const assistantMessage = sanitizeProductLanguage(
      data?.assistantMessage ??
      data?.assistant_message ??
      data?.message ??
      data?.reply ??
      '자세한 분석을 정리했습니다.'
    );

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
          id: `local-final-report-${Date.now()}`,
          role: 'assistant',
          content: assistantMessage,
          metadata: { mode: 'final_report' },
          created_at: new Date().toISOString(),
        },
      ];
    }

    showToast('자세한 분석을 정리했습니다.', 'ready');
  } catch (error) {
    if (error?.usage) committedUsage = commitUsageAfterRequest(error, usageBefore, error?.cost ?? FINAL_REPORT_COST);
    reconcileUsageSoon(committedUsage?.used ?? usageBefore.used);
    showToast(friendlyServiceError(error), 'error');
  } finally {
    isRequestingReport = false;
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
  if (!client) return showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
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
  if (!client) return showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');

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
  dom.headerMenus.forEach((menu) => { menu.open = false; });
  if (remote && supabase) await supabase.auth.signOut();
  session = null;
  conversations = [];
  activeConversation = null;
  messages = [];
  pendingNewSimulation = false;
  resetSimulationState();
  syncPolicyInputsFromState();
  applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
  setView('landing');
  renderAll();
}

async function enterChatAfterLogin() {
  renderAuth();
  setAuthModal(false);
  setView('chat');
  const shouldStartNewRecord = pendingNewSimulation;
  try {
    await loadUsage({ preserveOnError: false });
    await loadConversations();
  } catch (error) {
    showToast(friendlyServiceError(error), 'error');
    if (!usageState.limit) applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }
  if (shouldStartNewRecord) {
    activeConversation = null;
    messages = [];
    prepareBlankRecord(toDateKey(new Date()));
    syncPolicyInputsFromState();
  } else {
    workspaceView = 'calendar';
  }
  pendingNewSimulation = false;
  renderAll();
  if (workspaceView === 'input') window.setTimeout(() => dom.incidentConditions?.focus(), 80);
}

async function boot() {
  document.body.dataset.authMode = authMode;
  syncPolicyInputsFromState();
  const client = ensureClient();
  renderAll();

  if (!client) {
    showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
    return;
  }

  try {
    await restoreSession();
    if (session?.user) {
      setView('chat');
      try {
        await loadUsage({ preserveOnError: false });
        await loadConversations();
      } catch (error) {
        showToast(friendlyServiceError(error), 'error');
        if (!usageState.limit) applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
      }
      workspaceView = 'calendar';
      renderAll();
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
    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      renderAuth();
      return;
    }
    if (event === 'SIGNED_OUT' || !nextSession?.user) {
      await signOut(false);
      return;
    }
    await enterChatAfterLogin();
  });
}

function handlePolicyInputChange(event) {
  if (!event?.target?.matches('[data-policy-document], [data-incident-conditions], [data-record-title], [data-record-date]')) return;
  syncSimulationStateFromInputs();
  if (simulationState.recordTitle) simulationState.scenarioTitle = simulationState.recordTitle;
  if (simulationState.recordDate) selectedCalendarDate = simulationState.recordDate;
  renderInputGuidance();
}

dom.authOpenButtons.forEach((button) => {
  button.addEventListener('click', openPolicyConsole);
});

dom.headerMenus.forEach((menu) => {
  menu.addEventListener('toggle', () => {
    const isAccountMenu = menu.classList.contains('account-menu');
    const summary = menu.querySelector('summary');
    summary?.setAttribute('aria-label', `${isAccountMenu ? '계정' : '전체'} 메뉴 ${menu.open ? '닫기' : '열기'}`);
    if (!menu.open) return;
    dom.headerMenus.forEach((otherMenu) => {
      if (otherMenu !== menu) otherMenu.open = false;
    });
  });
});

dom.mobileSiteMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => { dom.mobileSiteMenu.open = false; });
});

document.addEventListener('click', (event) => {
  dom.headerMenus.forEach((menu) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const openMenu = [...dom.headerMenus].find((menu) => menu.open);
  if (!openMenu) return;
  openMenu.open = false;
  openMenu.querySelector('summary')?.focus();
});

function syncHeaderScroll() {
  dom.siteHeader?.classList.toggle('is-scrolled', window.scrollY > 14);
}

window.addEventListener('scroll', syncHeaderScroll, { passive: true });
syncHeaderScroll();

dom.homeLinks.forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  setView('landing');
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));

dom.backHome?.addEventListener('click', () => setView('landing'));
dom.newChatButtons.forEach((button) => button.addEventListener('click', () => newChat()));
dom.chatHistoryToggle?.addEventListener('click', () => setChatHistoryOpen(!isChatHistoryOpen));
dom.chatHistoryCloseButtons.forEach((button) => button.addEventListener('click', () => setChatHistoryOpen(false)));
dom.signOutButtons.forEach((button) => button.addEventListener('click', signOut));
dom.sidebarSignOut?.addEventListener('click', signOut);
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
dom.legalOpenButtons.forEach((button) => {
  button.addEventListener('click', () => setLegalModal(button.dataset.legalOpen, true, button));
});
dom.legalClose?.addEventListener('click', () => setLegalModal('privacy', false));
dom.legalBackdrop?.addEventListener('click', () => setLegalModal('privacy', false));
dom.workspaceTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.hasAttribute('data-new-record-nav')) newChat(selectedCalendarDate);
    else {
      setWorkspaceView(tab.dataset.workspaceTab);
      if (tab.closest('[data-chat-sidebar]')) setChatHistoryOpen(false);
    }
  });
  if (tab.getAttribute('role') === 'tab') {
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
      const currentIndex = tabs.indexOf(tab);
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[nextIndex]?.click();
      tabs[nextIndex]?.focus();
    });
  }
});
dom.editPolicy?.addEventListener('click', () => setWorkspaceView('input', { force: true }));
dom.resultsCalendar?.addEventListener('click', () => setWorkspaceView('calendar', { force: true }));
dom.agendaNew?.addEventListener('click', () => newChat(selectedCalendarDate));
dom.calendarPrev?.addEventListener('click', () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});
dom.calendarNext?.addEventListener('click', () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});
dom.calendarToday?.addEventListener('click', () => {
  const today = new Date();
  selectedCalendarDate = toDateKey(today);
  calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
});
dom.promptSuggestions.forEach((button) => {
  button.addEventListener('click', () => {
    if (!dom.chatInput) return;
    dom.chatInput.value = button.dataset.promptSuggestion || '';
    resizeComposer();
    dom.chatInput.focus();
  });
});
dom.chatInput?.addEventListener('input', resizeComposer);
dom.chatInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    dom.chatForm?.requestSubmit();
  }
});
dom.chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const followUp = dom.chatInput?.value ?? '';
  if (!followUp.trim()) return;
  sendMessage(followUp);
});
dom.runSimulation?.addEventListener('click', runPolicySimulation);
dom.policyInputForm?.addEventListener('input', handlePolicyInputChange);
dom.policyInputForm?.addEventListener('change', handlePolicyInputChange);

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (dom.legalModal && !dom.legalModal.hidden) {
    setLegalModal('privacy', false);
    return;
  }
  setAuthModal(false);
  setGuideModal(false);
  setChatHistoryOpen(false);
});

drawerMediaQuery.addEventListener?.('change', () => setChatHistoryOpen(false));
document.addEventListener('visibilitychange', refreshUsageWhenVisible);
window.addEventListener('focus', refreshUsageWhenVisible);
window.addEventListener('online', refreshUsageWhenVisible);
setChatHistoryOpen(false);
boot();
