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
  admin: { label: '관리자 연구 계정', license: 'ADMIN', limit: 1000 },
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
  heroMotion: document.querySelector('[data-hero-motion]'),
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
  todayLabel: document.querySelector('[data-today-label]'),
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
  personaAssessment: document.querySelector('[data-persona-assessment]'),
  simulationHud: document.querySelector('[data-simulation-hud]'),
  calculationBasis: document.querySelector('[data-calculation-basis]'),
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
  recordSourceCard: document.querySelector('[data-record-source-card]'),
  recordSourceDate: document.querySelector('[data-record-source-date]'),
  recordSourcePolicy: document.querySelector('[data-record-source-policy]'),
  recordSourceMemo: document.querySelector('[data-record-source-memo]'),
  analysisResultTitle: document.querySelector('#analysis-result-title'),
  analysisLoading: document.querySelector('[data-analysis-loading]'),
  analysisContent: document.querySelector('[data-analysis-content]'),
  promptSuggestions: document.querySelectorAll('[data-prompt-suggestion]'),
};

let supabase = null;
let session = null;
let usageState = { tier: 'unauth', used: 0, limit: 0, period: '' };
let researchAccessState = { verified: false, allowed: false, userId: '' };
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
const ADMIN_CALCULATION_LOG_GUIDANCE = [
  '관리자 연구 계정의 calculation_log에는 내부 사고 독백이 아니라 재현 가능한 직접 위험 계산 장부를 반환한다.',
  'run에는 run_id, engine_version, score_version, weights_version, prediction_provider, explanation_kind, precision, rounding을 넣는다.',
  'input.facts에는 원문에서 검증된 사실과 source_excerpt를, safeguards에는 고정 6개 항목의 present·partial·missing 상태를 넣는다.',
  'risk.metrics에는 6개 위험의 key, 공개 label, formula_id, terms(feature/value/weight/contribution), raw_score, score를 넣는다.',
  'gap_counterfactuals에는 누락 안전장치를 하나씩 보완했을 때의 종합 위험 감소폭을 넣고 biggest_gap을 하나만 고른다.',
  'verified_recommendations에는 서버 템플릿 ID, 연결 안전장치, 연결 위험, 예상 감소폭을 넣는다.',
  'judgment_graph에는 fact·safeguard·risk·gap·recommendation 노드와 실제 참조가 유효한 edge만 넣는다.',
  '실제로 계산하지 않은 weight와 contribution은 null로 두며 GNN attribution을 산술 기여도로 꾸미지 않는다.',
  'source_excerpt에는 학생·학부모 개인정보를 넣지 말고 필요한 짧은 문구만 마스킹하여 반환한다.',
].join('\n');

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
    analysisSchemaVersion: 'direct-risk-v1',
    facts: [],
    safeguards: [],
    riskMetrics: [],
    biggestGap: null,
    recommendedClauses: [],
    evidenceGraph: null,
    actorType: '',
    actorConfidence: null,
    actorProbabilities: {},
    personaSummary: '',
    qreLambda: null,
    claimType: '',
    evidenceState: '',
    pressureState: '',
    ruleConstraint: '',
    scoreVersion: '',
    weightsVersion: '',
    riskWeights: {},
    overallRiskSource: '',
    decisionTrace: null,
    calculationLog: null,
    overallRisk: null,
    hasOverallRiskData: false,
    riskAvailability: {
      factCheckNeed: false,
      manipulationRisk: false,
      handoffNeed: false,
      overConcessionRisk: false,
      underResponseRisk: false,
      policyViolationRisk: false,
    },
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
  if (tier === 'admin') return 'admin';
  if (tier === 'general') return 'general';
  return session?.user ? 'general' : 'unauth';
}

function hasAdminResearchAccess() {
  return Boolean(
    session?.user &&
    researchAccessState.verified &&
    researchAccessState.allowed &&
    researchAccessState.userId === session.user.id &&
    normalizeTier(usageState.tier) === 'admin'
  );
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

function finalReportRequestCost() {
  return hasAdminResearchAccess() ? 1 : FINAL_REPORT_COST;
}

function analysisRequestCount(source = messages) {
  return source.filter((message) =>
    message.role === 'assistant' &&
    message.metadata?.mode !== 'final_report' &&
    (
      message.metadata?.simulation_state ||
      message.metadata?.simulationState ||
      message.metadata?.game_state ||
      message.metadata?.gameState ||
      message.metadata?.analysis_state ||
      message.metadata?.analysisState
    )
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
  const directRisk = numberOrNull(simulationState.overallRisk);
  if (directRisk !== null) return clampMetric(directRisk);
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
    .filter((item) => !item.invert && item.available)
    .sort((a, b) => b.value - a.value)[0];
  const risk = priority?.value ?? (simulationState.hasOverallRiskData ? criticalRiskScore() : null);
  if (risk === null) {
    return {
      title: '확인된 위험 점수만 표시합니다',
      detail: '이번 응답에서 일부 위험 점수를 확인하지 못했습니다.',
      tone: 'neutral',
      priority: null,
    };
  }
  const title = risk >= 70
    ? '지금 대응 기준에는 꼭 보완해야 할 부분이 있어요'
    : risk >= 45
      ? '대응 기준을 조금 더 분명하게 적어야 해요'
      : '중요한 대응 기준이 비교적 잘 갖춰져 있어요';
  const detail = priority
    ? `가장 높은 항목은 ‘${priority.label}’이며 현재 ${priority.value}점입니다. ${priority.help}`
    : '입력한 대응 기준과 상황에서 높은 위험 항목을 찾지 못했습니다.';
  return { title, detail, tone: metricTone(risk), priority };
}

function requiredInputStatus() {
  const fields = [
    { key: 'incidentConditions', label: '선생님의 기록', element: dom.incidentConditions },
    { key: 'policyDocument', label: '학교 대응 기준', element: dom.policyDocument },
  ];
  const missing = fields.filter((field) => !String(field.element?.value ?? simulationState[field.key] ?? '').trim());
  return { fields, missing, complete: fields.length - missing.length };
}

function renderInputGuidance() {
  const status = requiredInputStatus();
  if (dom.formFeedback) {
    dom.formFeedback.textContent = status.missing.length
      ? `${status.missing.map((item) => item.label).join(', ')}을 입력해 주세요.`
      : '준비됐어요. 기록을 바탕으로 위험도와 보완할 기준을 살펴볼게요.';
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
    [/상대의 다음 행동/g, '학교 대응 위험 변화'],
    [/상대의 다음 반응/g, '학교 대응 위험 변화'],
    [/상대에게/g, '학부모에게'],
    [/상대 요구/g, '학부모 요구'],
    [/상대 주장/g, '학부모 주장'],
    [/상대는/g, '학부모는'],
    [/상대가/g, '학부모가'],
    [/상대의/g, '학부모의'],
    [/상대를/g, '학부모를'],
    [/QRE\s*행동\s*일관성/gi, '이전 반응 계산값'],
    [/QRE\s*기반/gi, '이전 분석을 바탕으로'],
    [/Logit-QRE/gi, '이전 반응 계산'],
    [/lambda_QRE/gi, '이전 반복 계수'],
    [/QRE\s*페르소나/gi, '이전 분석 가정'],
    [/QRE\s*Engine/gi, '이전 반응 계산'],
    [/\bQRE\b/gi, '이전 반응 계산'],
    [new RegExp(['ROOSY', '-X ', 'Surv', 'ival'].join(''), 'g'), '루지코지 반응·위험 계산 모델'],
    [new RegExp(['ROOSY', '-X'].join(''), 'g'), '반응·위험 계산 모델'],
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
    [/현재 정책 진단/g, '현재 대응 기준 점검'],
    [/정책 진단/g, '대응 기준 점검'],
    [/정책 위험 분석/g, '학교 대응 위험 분석'],
    [/정책 위험/g, '학교 대응 위험'],
    [/정책의 빈틈/g, '대응 기준에서 빠진 부분'],
    [/정책 안전장치/g, '대응 안전장치'],
    [/정책 문장/g, '대응 기준 원문'],
    [/정책 초안/g, '대응 기준 초안'],
    [/정책 근거/g, '대응 기준 근거'],
    [/권장 정책 적용/g, '보완 기준 적용'],
    [/권장 정책안/g, '보완 기준'],
    [/대안 정책/g, '보완한 대응 기준'],
    [/정책 비교/g, '대응 기준을 보완했을 때'],
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
    [/환불 정책/g, '학교 대응 기준'],
    [/환불/g, '조치 철회'],
    [/금전 보상/g, '추가 조치'],
    [/추가 보상/g, '담임 교체·추가 조치'],
    [/보상/g, '추가 조치'],
    [/처리 기준/g, '학교 대응 기준'],
    [/학교·기관 기준/g, '학교 규정'],
    [/기관 기준/g, '학교 규정'],
    [/정책/g, '대응 기준'],
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
    (
      message.metadata?.simulation_state ||
      message.metadata?.simulationState ||
      message.metadata?.game_state ||
      message.metadata?.gameState ||
      message.metadata?.analysis_state ||
      message.metadata?.analysisState
    )
  );
}

function hasDecisionTraceResult(source = messages) {
  return source.some((message) => Boolean(
    message.metadata?.decision_trace ||
    message.metadata?.decisionTrace ||
    message.metadata?.simulation_state?.decision_trace ||
    message.metadata?.simulation_state?.decisionTrace ||
    message.metadata?.simulationState?.decisionTrace ||
    message.metadata?.game_state?.decision_trace ||
    message.metadata?.game_state?.decisionTrace ||
    message.metadata?.analysis_state?.decision_trace ||
    message.metadata?.analysis_state?.decisionTrace ||
    message.metadata?.analysis_result?.decision_trace ||
    message.metadata?.analysis_result?.decisionTrace ||
    message.metadata?.calculation_basis?.decision_trace ||
    message.metadata?.calculation_basis?.decisionTrace ||
    message.metadata?.calculation_basis?.trace ||
    message.metadata?.calculationBasis?.decisionTrace ||
    message.metadata?.calculationBasis?.trace ||
    message.metadata?.calculation_log ||
    message.metadata?.calculationLog
  ));
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
      ? '선생님의 기록과 학교 기준을 살펴보는 중'
      : analysisPhase === 'refreshing'
        ? '추가 질문을 반영하는 중'
        : '분석이 끝났어요';
  }
}

function setWorkspaceView(nextView, { focus = false, force = false } = {}) {
  const requested = ['calendar', 'results'].includes(nextView) ? nextView : 'input';
  if (requested === 'results' && !force && analysisPhase !== 'loading' && !isSending && !hasAnalysisResult()) {
    showToast('아직 점검 결과가 없습니다. 새 기록을 먼저 적어 주세요.', 'error');
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
      <span><strong>${escapeHtml(sanitizeProductLanguage(conversation.title || '제목 없는 기록'))}</strong><small>${escapeHtml(formatDate(conversation.updated_at || conversation.created_at))} · ${conversation.status === 'action_required' ? '다시 확인 필요' : conversationIsAnalyzed(conversation) ? '점검 완료' : '기록만 저장됨'}</small></span>
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

function clearAdminResearchState() {
  messages = messages.map(stripEmbeddedCalculationLogs);
  if (simulationState) simulationState.calculationLog = null;
}

function setResearchAccessVerification(tier, userId = session?.user?.id ?? '') {
  const normalizedTier = normalizeTier(tier);
  const allowed = Boolean(userId) && normalizedTier === 'admin';
  researchAccessState = { verified: true, allowed, userId: String(userId || '') };
  if (!allowed) clearAdminResearchState();
}

function invalidateResearchAccess({ clearData = false } = {}) {
  researchAccessState = { verified: false, allowed: false, userId: session?.user?.id ?? '' };
  if (clearData) clearAdminResearchState();
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
  const verifiedTier = firstMeaningfulValue(
    responseData?.meta?.access_tier,
    responseData?.meta?.accessTier,
    responseUsage?.tier,
    responseUsage?.membership_tier
  );
  if (verifiedTier !== undefined && session?.user) {
    setResearchAccessVerification(verifiedTier, session.user.id);
  }
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
  const adminResearch = signedIn && hasAdminResearchAccess();
  const text = signedIn
    ? adminResearch
      ? `${info.license} · 이번 달 분석 요청 ${used}/${usageState.limit} · ${percent}%`
      : `${info.license} · 이번 달 사용 ${used}/${usageState.limit} · ${percent}%`
    : '로그인 필요';

  if (dom.usagePill) {
    dom.usagePill.hidden = !signedIn;
    dom.usagePill.textContent = text;
  }

  if (dom.usageCopy) {
    dom.usageCopy.textContent = signedIn
      ? adminResearch
        ? `${info.label} · 연구용 분석 요청 ${remainingUsage()}회 남음`
        : `${info.label} · AI 이용 포인트 ${remainingUsage()} 남음`
      : '로그인하면 메모와 결과를 달력에 저장할 수 있습니다.';
  }
}

function renderAuth() {
  const signedIn = Boolean(session?.user);
  dom.body.dataset.authenticated = signedIn ? 'true' : 'false';
  dom.body.dataset.researchAccess = hasAdminResearchAccess() ? 'true' : 'false';

  if (dom.authPanel) dom.authPanel.hidden = signedIn;
  if (dom.userPanel) dom.userPanel.hidden = !signedIn;
  dom.userEmails.forEach((element) => { element.textContent = session?.user?.email ?? ''; });
  if (dom.headerCtaLabel) dom.headerCtaLabel.textContent = signedIn ? '새 기록' : '위험도와 코칭 보기';
  if (dom.headerCtaLabelShort) dom.headerCtaLabelShort.textContent = signedIn ? '새 기록' : '점검';
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
  simulationState.actorType = '';
  simulationState.actorConfidence = null;
  simulationState.actorProbabilities = {};
  simulationState.personaSummary = '';
  simulationState.qreLambda = null;
  simulationState.claimType = '';
  simulationState.evidenceState = '';
  simulationState.pressureState = '';
  simulationState.ruleConstraint = '';
  simulationState.scoreVersion = '';
  simulationState.weightsVersion = '';
  simulationState.riskWeights = {};
  simulationState.overallRiskSource = '';
  simulationState.decisionTrace = null;
  simulationState.calculationLog = null;
  simulationState.overallRisk = null;
  simulationState.hasOverallRiskData = false;
  simulationState.riskAvailability = {
    factCheckNeed: false,
    manipulationRisk: false,
    handoffNeed: false,
    overConcessionRisk: false,
    underResponseRisk: false,
    policyViolationRisk: false,
  };
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

const ACTOR_TYPES = ['정당형', '오해형', '감정형', '기회주의형', '적대형'];
const ACTOR_HOLD_MARGIN = 0.015;
const ACTOR_TYPE_ALIASES = {
  정당형: '정당형',
  legitimate: '정당형',
  justified: '정당형',
  오해형: '오해형',
  misunderstood: '오해형',
  감정형: '감정형',
  emotional: '감정형',
  기회주의형: '기회주의형',
  opportunistic: '기회주의형',
  적대형: '적대형',
  adversarial: '적대형',
  hostile: '적대형',
};

function normalizeActorType(value) {
  const key = String(value ?? '').trim();
  return ACTOR_TYPE_ALIASES[key] ?? ACTOR_TYPE_ALIASES[key.toLowerCase()] ?? '';
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeActorProbabilities(value) {
  const source = asObject(value);
  const totals = Object.entries(source).reduce((result, [rawType, rawProbability]) => {
    const type = normalizeActorType(rawType);
    if (type) result[type] += Math.max(0, Number(rawProbability) || 0);
    return result;
  }, Object.fromEntries(ACTOR_TYPES.map((type) => [type, 0])));
  const entries = ACTOR_TYPES.map((type) => [type, totals[type]]);
  const total = entries.reduce((sum, [, probability]) => sum + probability, 0);
  if (!total) return {};
  return Object.fromEntries(entries.map(([type, probability]) => [type, probability / total]));
}

function normalizeQreLambda(value) {
  const number = numberOrNull(value);
  if (number === null) return null;
  return [0.5, 1.5, 3].find((option) => Math.abs(number - option) < 0.01) ?? null;
}

function firstMeaningfulValue(...values) {
  return values.find((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  });
}

function compactTraceText(value, max = 180) {
  return compactText(value, max).replace(/\s+/g, ' ').trim();
}

function normalizeDecisionTrace(value) {
  if (value === null || value === undefined) return null;
  const root = Array.isArray(value) ? { steps: value } : asObject(value);
  const directSteps = firstMeaningfulValue(root.steps, root.items, root.trace);
  let candidates = Array.isArray(directSteps) ? directSteps : [];

  if (!candidates.length && Array.isArray(root.phases)) {
    candidates = root.phases.flatMap((phase) => {
      const phaseKey = compactTraceText(firstMeaningfulValue(phase?.key, phase?.phase), 30);
      const phaseOrder = Number(phase?.phase);
      const phaseSignals = Array.isArray(phase?.signals) ? phase.signals : [];
      return (Array.isArray(phase?.evidence) ? phase.evidence : []).map((evidence) => {
        const evidenceId = String(evidence?.id ?? '').trim();
        const signal = phaseSignals.find((item) =>
          Array.isArray(item?.evidence_ids) && item.evidence_ids.map(String).includes(evidenceId)
        );
        const normalizedPhase = phaseOrder === 2 || /persona|qre|actor|반응|유형/i.test(phaseKey)
          ? 'persona_qre'
          : phaseOrder === 3 || /risk|score|위험/i.test(phaseKey)
            ? 'risk'
            : 'input';
        const effect = normalizedPhase === 'persona_qre'
          ? '학부모 유형·QRE 산출에 사용'
          : normalizedPhase === 'risk'
            ? '6가지 위험도와 종합 위험 산출에 사용'
            : '학부모 유형·QRE 판단의 입력으로 전달';
        return {
          phase: normalizedPhase,
          source: evidence?.source ?? evidence?.field ?? phaseKey,
          evidence: evidence?.summary ?? evidence?.evidence,
          interpretation: signal?.label ?? signal?.key ?? phase?.interpretation ?? phase?.summary ?? '입력 단계에서 확인된 단서',
          effect,
          target: signal?.target ?? normalizedPhase,
        };
      });
    });
  }

  if (!candidates.length && Array.isArray(root.signals)) {
    const evidenceById = Object.fromEntries(
      (Array.isArray(root.evidence) ? root.evidence : [])
        .map((item) => [String(item?.id ?? '').trim(), item])
        .filter(([id]) => id)
    );
    const persona = asObject(root.persona);
    const qre = asObject(root.qre);
    const risks = Array.isArray(root.risks) ? root.risks : [];
    const personaFactors = Array.isArray(persona.factors) ? persona.factors : [];
    const qreCandidates = Array.isArray(qre.candidates) ? qre.candidates : [];

    candidates = root.signals.map((signal) => {
      const signalId = String(signal?.id ?? '').trim();
      const citedEvidence = (Array.isArray(signal?.evidence_ids) ? signal.evidence_ids : [])
        .map((id) => evidenceById[String(id)])
        .find(Boolean);
      const relatedRisk = risks.find((risk) =>
        (Array.isArray(risk?.signal_ids) && risk.signal_ids.map(String).includes(signalId)) ||
        (Array.isArray(risk?.evidence_ids) && citedEvidence?.id && risk.evidence_ids.map(String).includes(String(citedEvidence.id)))
      );
      const personaFactor = personaFactors.find((factor) => String(factor?.signal_id ?? '') === signalId);
      const qreCandidate = qreCandidates.find((candidate) =>
        Array.isArray(candidate?.factor_ids) && candidate.factor_ids.map(String).includes(signalId)
      );
      let effect = '';
      if (relatedRisk) {
        const metric = riskMetricLabel(relatedRisk.key);
        const score = numberOrNull(relatedRisk.score);
        effect = `${metric}${score === null ? '' : ` ${clampMetric(score)}점`} 산출에 반영`;
      } else if (personaFactor && persona.selected_type) {
        const direction = String(personaFactor.direction ?? '').toLowerCase();
        effect = `${persona.selected_type} 가능성을 ${/against|decrease|oppose/.test(direction) ? '낮추는' : '높이는'} 방향`;
      } else if (qreCandidate?.action) {
        const probability = numberOrNull(qreCandidate.probability);
        const probabilityPercent = probability === null ? null : probability <= 1 ? probability * 100 : probability;
        effect = `QRE 행동 ‘${qreCandidate.action}’${probabilityPercent === null ? '' : ` ${formatBasisPercent(probabilityPercent)}%`}에 연결`;
      } else {
        effect = '유형·QRE·위험 산출 입력에 연결';
      }
      return {
        phase: signal?.phase ?? (relatedRisk ? 'risk' : personaFactor || qreCandidate ? 'persona_qre' : 'input'),
        source: citedEvidence?.source ?? signal?.source ?? '서버 근거',
        evidence: citedEvidence?.summary ?? signal?.evidence ?? signal?.summary,
        interpretation: signal?.label ?? signal?.interpretation ?? signal?.key,
        effect,
        target: relatedRisk?.key ?? (personaFactor ? 'persona' : qreCandidate ? 'qre' : signal?.target),
      };
    });
  }

  const steps = candidates.slice(0, 6).map((item) => {
    const phase = compactTraceText(firstMeaningfulValue(item?.phase, item?.stage, item?.phase_key, item?.phaseKey), 30);
    const source = compactTraceText(firstMeaningfulValue(item?.source_label, item?.sourceLabel, item?.source, item?.category), 40);
    const evidence = compactTraceText(firstMeaningfulValue(item?.evidence, item?.cue, item?.summary, item?.source_excerpt, item?.sourceExcerpt), 180);
    const interpretation = compactTraceText(firstMeaningfulValue(item?.interpretation, item?.meaning, item?.signal, item?.label), 180);
    const effect = compactTraceText(firstMeaningfulValue(item?.effect, item?.impact, item?.result, item?.output), 180);
    const target = compactTraceText(firstMeaningfulValue(item?.target, item?.risk_key, item?.riskKey, item?.output_type, item?.outputType), 50);
    return { phase, source: source || '분석 근거', evidence, interpretation, effect, target };
  }).filter((item) => item.evidence && item.interpretation && item.effect);

  return {
    traceVersion: compactTraceText(firstMeaningfulValue(root.trace_version, root.traceVersion, root.version), 60),
    status: compactTraceText(root.status, 30) || (steps.length ? 'complete' : 'partial'),
    source: compactTraceText(root.source, 40),
    steps,
    limitations: (normalizeStringList(root.limitations) ?? []).slice(0, 4).map((item) => compactTraceText(item, 180)),
  };
}

function riskMetricLabel(key) {
  const labels = {
    unverified_response_risk: '확인 없이 답할 위험',
    fact_check_need: '확인 없이 답할 위험',
    factCheckNeed: '확인 없이 답할 위험',
    pressure_judgment_risk: '압박에 판단이 흔들릴 위험',
    manipulation_risk: '압박에 판단이 흔들릴 위험',
    manipulationRisk: '압박에 판단이 흔들릴 위험',
    premature_promise_risk: '성급히 약속할 위험',
    over_concession_risk: '성급히 약속할 위험',
    overConcessionRisk: '성급히 약속할 위험',
    legitimate_issue_miss_risk: '정당한 문제를 놓칠 위험',
    under_response_risk: '정당한 문제를 놓칠 위험',
    underResponseRisk: '정당한 문제를 놓칠 위험',
    school_procedure_risk: '학교 절차를 놓칠 위험',
    policy_violation_risk: '학교 절차를 놓칠 위험',
    policyViolationRisk: '학교 절차를 놓칠 위험',
    solo_handling_risk: '혼자 대응하다 커질 위험',
    escalation_need: '혼자 대응하다 커질 위험',
    escalationNeed: '혼자 대응하다 커질 위험',
    handoff_need: '혼자 대응하다 커질 위험',
    handoffNeed: '혼자 대응하다 커질 위험',
  };
  return labels[key] || compactTraceText(key, 60) || '위험 점수';
}

function riskReasonsFromMetrics(...sources) {
  const reasons = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(asObject(source))) {
      const reason = typeof value === 'string'
        ? value
        : firstMeaningfulValue(value?.reason, value?.summary, value?.explanation);
      if (reason && !reasons[key]) reasons[key] = String(reason);
    }
  }
  return reasons;
}

function composeSimulationPayload(primaryState, analysisState, analysisResult, explicitCalculationBasis, explicitDecisionTrace, explicitCalculationLog) {
  const primary = asObject(primaryState);
  const analysis = asObject(analysisState);
  const result = asObject(analysisResult);
  const comparison = asObject(result.risk_comparison ?? result.riskComparison);
  const riskSummary = asObject(result.risk_summary ?? result.riskSummary);
  const parent = asObject(result.parent_profile ?? result.parentProfile ?? result.parent_response ?? result.parentResponse);
  const persona = asObject(analysis.persona);
  const qre = asObject(analysis.qre);
  const risk = asObject(analysis.risk);
  const calculationBasis = asObject(firstMeaningfulValue(
    explicitCalculationBasis,
    primary.calculation_basis,
    primary.calculationBasis,
    analysis.calculation_basis,
    analysis.calculationBasis,
    result.calculation_basis,
    result.calculationBasis
  ));
  const basisPersona = asObject(calculationBasis.persona);
  const basisRisk = asObject(calculationBasis.risk);
  const basisEngine = asObject(calculationBasis.engine);
  const decisionTrace = firstMeaningfulValue(
    explicitDecisionTrace,
    result.decision_trace,
    result.decisionTrace,
    analysis.decision_trace,
    analysis.decisionTrace,
    primary.decision_trace,
    primary.decisionTrace,
    calculationBasis.decision_trace,
    calculationBasis.decisionTrace,
    calculationBasis.trace
  );
  const traceRoot = asObject(decisionTrace);
  const calculationLog = firstMeaningfulValue(
    explicitCalculationLog,
    result.calculation_log,
    result.calculationLog,
    analysis.calculation_log,
    analysis.calculationLog,
    primary.calculation_log,
    primary.calculationLog,
    calculationBasis.calculation_log,
    calculationBasis.calculationLog,
    Array.isArray(traceRoot.phases) ? traceRoot : null
  );
  const tracePhases = Array.isArray(asObject(decisionTrace).phases) ? asObject(decisionTrace).phases : [];
  const phaseByPattern = (pattern, order) => tracePhases.find((phase) => {
    const key = `${phase?.key ?? ''} ${phase?.phase ?? ''}`.toLowerCase();
    return pattern.test(key) || Number(phase?.phase) === order;
  }) ?? {};
  const personaQrePhase = phaseByPattern(/persona|qre|actor|반응|유형/, 2);
  const riskScoringPhase = phaseByPattern(/risk|score|위험/, 3);
  const phasePersona = asObject(personaQrePhase.persona);
  const phaseQre = asObject(personaQrePhase.qre);
  const phaseRisks = Array.isArray(riskScoringPhase.risks) ? riskScoringPhase.risks : [];
  const phaseOverallRisk = asObject(riskScoringPhase.overall);
  const phaseRiskReasons = Object.fromEntries(phaseRisks
    .map((item) => [String(item?.key ?? '').trim(), compactTraceText(item?.reason, 240)])
    .filter(([key, reason]) => key && reason));
  const metricReasons = riskReasonsFromMetrics(
    comparison.metrics,
    asObject(comparison.current).metrics,
    riskSummary.metrics,
    basisRisk.metrics
  );
  const payload = {
    ...asObject(comparison.current),
    ...risk,
    ...parent,
    ...persona,
    ...qre,
    ...primary,
  };
  payload.actor_type = firstMeaningfulValue(
    primary.actor_type,
    primary.actorType,
    persona.actor_type,
    persona.actorType,
    parent.actor_type,
    parent.actorType,
    phasePersona.selected_type,
    phasePersona.selectedType,
    phasePersona.actor_type,
    phasePersona.actorType
  );
  payload.actor_probabilities = firstMeaningfulValue(
    primary.actor_probabilities,
    primary.actorProbabilities,
    persona.actor_probabilities,
    persona.actorProbabilities,
    phasePersona.probabilities,
    phasePersona.actor_probabilities,
    phasePersona.actorProbabilities
  );
  payload.actor_confidence = firstMeaningfulValue(
    primary.actor_confidence,
    primary.actorConfidence,
    persona.actor_confidence,
    persona.actorConfidence,
    parent.confidence,
    phasePersona.confidence
  );
  payload.persona_summary = firstMeaningfulValue(
    primary.persona_summary,
    primary.personaSummary,
    persona.persona_summary,
    persona.personaSummary,
    parent.summary
  );
  payload.lambda_qre = firstMeaningfulValue(
    primary.lambda_qre,
    primary.lambdaQre,
    primary.qre_lambda,
    primary.qreLambda,
    qre.lambda_qre,
    qre.lambdaQre,
    qre.lambda,
    persona.lambda_qre,
    persona.lambdaQre,
    phaseQre.lambda_qre,
    phaseQre.lambdaQre,
    phaseQre.lambda
  );
  payload.claim_type = firstMeaningfulValue(
    primary.claim_type,
    primary.claimType,
    persona.claim_type,
    persona.claimType,
    basisPersona.claim_type,
    basisPersona.claimType
  );
  payload.evidence_state = firstMeaningfulValue(
    primary.evidence_state,
    primary.evidenceState,
    persona.evidence_state,
    persona.evidenceState,
    basisPersona.evidence_state,
    basisPersona.evidenceState
  );
  payload.pressure_state = firstMeaningfulValue(
    primary.pressure_state,
    primary.pressureState,
    persona.pressure_state,
    persona.pressureState,
    basisPersona.pressure_state,
    basisPersona.pressureState
  );
  payload.rule_constraint = firstMeaningfulValue(
    primary.rule_constraint,
    primary.ruleConstraint,
    persona.rule_constraint,
    persona.ruleConstraint,
    basisPersona.rule_constraint,
    basisPersona.ruleConstraint
  );
  payload.risk_reasons = firstMeaningfulValue(
    primary.risk_reasons,
    primary.riskReasons,
    risk.risk_reasons,
    risk.riskReasons,
    risk.reasons,
    metricReasons,
    phaseRiskReasons
  );
  payload.flags = firstMeaningfulValue(primary.flags, risk.flags, basisRisk.flags);
  payload.risk_weights = firstMeaningfulValue(
    primary.risk_weights,
    primary.riskWeights,
    basisRisk.overall_weights,
    basisRisk.overallWeights
  );
  payload.score_version = firstMeaningfulValue(
    primary.score_version,
    primary.scoreVersion,
    risk.score_version,
    risk.scoreVersion,
    asObject(comparison.current).score_version,
    asObject(comparison.current).scoreVersion,
    basisRisk.score_version,
    basisRisk.scoreVersion,
    result.score_version,
    result.scoreVersion,
    basisEngine.score_version,
    basisEngine.scoreVersion,
    phaseOverallRisk.score_version,
    phaseOverallRisk.scoreVersion
  );
  payload.weights_version = firstMeaningfulValue(
    primary.weights_version,
    primary.weightsVersion,
    basisRisk.weights_version,
    basisRisk.weightsVersion
  );
  payload.calculation_source = firstMeaningfulValue(
    primary.calculation_source,
    primary.calculationSource,
    basisRisk.calculation_source,
    basisRisk.calculationSource
  );
  const phaseRiskKeyMap = {
    fact_check_need: 'fact_check_need',
    factCheckNeed: 'fact_check_need',
    claim_validity: 'claim_validity',
    claimValidity: 'claim_validity',
    manipulation_risk: 'manipulation_risk',
    manipulationRisk: 'manipulation_risk',
    over_concession_risk: 'over_concession_risk',
    overConcessionRisk: 'over_concession_risk',
    under_response_risk: 'under_response_risk',
    underResponseRisk: 'under_response_risk',
    policy_violation_risk: 'policy_violation_risk',
    policyViolationRisk: 'policy_violation_risk',
    escalation_need: 'escalation_need',
    escalationNeed: 'escalation_need',
    handoff_need: 'escalation_need',
    handoffNeed: 'escalation_need',
  };
  for (const item of phaseRisks) {
    const key = phaseRiskKeyMap[item?.key];
    if (key) payload[key] = firstMeaningfulValue(payload[key], item?.score);
  }
  const directRiskSet = asObject(firstMeaningfulValue(
    result.risks,
    primary.risks,
    analysis.risks,
    analysis.risk
  ));
  const directRiskMetrics = Array.isArray(directRiskSet.metrics) ? directRiskSet.metrics : [];
  const directMetricAliases = {
    unverified_response_risk: 'fact_check_need',
    pressure_judgment_risk: 'manipulation_risk',
    premature_promise_risk: 'over_concession_risk',
    legitimate_issue_miss_risk: 'under_response_risk',
    solo_handling_risk: 'escalation_need',
    school_procedure_risk: 'policy_violation_risk',
  };
  for (const item of directRiskMetrics) {
    const canonicalKey = String(firstMeaningfulValue(item?.legacy_key, item?.legacyKey, item?.key) ?? '');
    const legacyKey = directMetricAliases[canonicalKey] || canonicalKey;
    if (legacyKey) payload[legacyKey] = firstMeaningfulValue(payload[legacyKey], item?.score, item?.final_score, item?.finalScore);
  }
  payload.analysis_schema_version = firstMeaningfulValue(
    primary.analysis_schema_version,
    primary.analysisSchemaVersion,
    result.schema_version,
    result.schemaVersion,
    analysis.schema_version,
    analysis.schemaVersion
  );
  payload.extracted_facts = firstMeaningfulValue(
    primary.extracted_facts,
    primary.extractedFacts,
    result.facts,
    analysis.facts
  );
  payload.policy_safeguards = firstMeaningfulValue(
    primary.policy_safeguards,
    primary.policySafeguards,
    result.policy_safeguards,
    result.policySafeguards,
    analysis.safeguards
  );
  payload.risks = directRiskSet;
  payload.largest_policy_gap = firstMeaningfulValue(
    primary.largest_policy_gap,
    primary.largestPolicyGap,
    result.largest_policy_gap,
    result.largestPolicyGap,
    analysis.largest_policy_gap,
    analysis.largestPolicyGap
  );
  payload.recommended_clauses = firstMeaningfulValue(
    primary.recommended_clauses,
    primary.recommendedClauses,
    result.recommended_clauses,
    result.recommendedClauses,
    analysis.recommended_clauses,
    analysis.recommendedClauses
  );
  payload.judgment_graph = firstMeaningfulValue(
    primary.judgment_graph,
    primary.judgmentGraph,
    result.judgment_graph,
    result.judgmentGraph,
    analysis.judgment_graph,
    analysis.judgmentGraph
  );
  payload.overall_risk = firstMeaningfulValue(
    payload.overall_risk,
    payload.overallRisk,
    directRiskSet.overall,
    phaseOverallRisk.score
  );
  payload.decision_trace = decisionTrace;
  payload.calculation_log = calculationLog && typeof calculationLog === 'object' ? calculationLog : null;
  return payload;
}

function remapApiSimulationState(nextState = {}, isComplete = false) {
  const api = nextState && typeof nextState === 'object' ? nextState : {};
  const incomingSchemaVersion = String(
    api.analysis_schema_version ?? api.analysisSchemaVersion ?? simulationState.analysisSchemaVersion ?? ''
  );
  const isDirectRiskSchema = /policy-risk-v2|direct-risk/i.test(incomingSchemaVersion);
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
  const actorProbabilities = normalizeActorProbabilities(
    api.actor_probabilities ?? api.actorProbabilities ?? simulationState.actorProbabilities
  );
  const rankedActorTypes = Object.entries(actorProbabilities).sort((a, b) => Number(b[1]) - Number(a[1]));
  const explicitActorType = normalizeActorType(api.actor_type ?? api.actorType);
  const actorType = explicitActorType || rankedActorTypes[0]?.[0] || simulationState.actorType;
  const actorConfidenceValue = numberOrNull(api.actor_confidence ?? api.actorConfidence ?? api.confidence);
  const actorConfidence = actorConfidenceValue === null
    ? simulationState.actorConfidence
    : Math.max(0, Math.min(1, actorConfidenceValue > 1 ? actorConfidenceValue / 100 : actorConfidenceValue));
  const qreLambda = normalizeQreLambda(api.lambda_qre ?? api.lambdaQre ?? api.qre_lambda ?? api.qreLambda ?? api.lambda)
    ?? simulationState.qreLambda;
  const directOverallRisk = numberOrNull(api.overall_risk ?? api.overallRisk);
  const factCheckNeed = numberOrNull(
    api.fact_check_need ?? api.factCheckNeed ?? api.unverified_response_risk ?? api.unverifiedResponseRisk
  );
  const claimValidity = numberOrNull(api.claim_validity ?? api.claimValidity);
  const manipulationRisk = numberOrNull(
    api.manipulation_risk ?? api.manipulationRisk ?? api.pressure_judgment_risk ?? api.pressureJudgmentRisk ?? api.pressure
  );
  const handoffNeed = numberOrNull(
    api.handoff_need ?? api.handoffNeed ?? api.escalation_need ?? api.escalationNeed ??
    api.solo_handling_risk ?? api.soloHandlingRisk ?? api.escalation_risk ?? api.escalationRisk
  );
  const overConcessionRisk = numberOrNull(
    api.over_concession_risk ?? api.overConcessionRisk ?? api.premature_promise_risk ??
    api.prematurePromiseRisk ?? api.liability_risk ?? api.liabilityRisk
  );
  const underResponseRisk = numberOrNull(
    api.under_response_risk ?? api.underResponseRisk ?? api.legitimate_issue_miss_risk ?? api.legitimateIssueMissRisk
  );
  const policyViolationRisk = numberOrNull(
    api.policy_violation_risk ??
      api.policyViolationRisk ??
      api.school_procedure_risk ??
      api.schoolProcedureRisk ??
      (legacyProceduralSafety == null ? undefined : 100 - Number(legacyProceduralSafety))
  );
  const incomingRiskAvailability = {
    factCheckNeed: factCheckNeed !== null || claimValidity !== null,
    manipulationRisk: manipulationRisk !== null,
    handoffNeed: handoffNeed !== null,
    overConcessionRisk: overConcessionRisk !== null,
    underResponseRisk: underResponseRisk !== null,
    policyViolationRisk: policyViolationRisk !== null,
  };
  const riskAvailability = Object.fromEntries(
    Object.keys(incomingRiskAvailability).map((key) => [
      key,
      incomingRiskAvailability[key] || Boolean(simulationState.riskAvailability?.[key]),
    ])
  );
  const hasAllCurrentRisks = Object.values(riskAvailability).every(Boolean);
  const providedCalculationSource = String(api.calculation_source ?? api.calculationSource ?? '').trim();
  const overallRiskSource = providedCalculationSource || (
    directOverallRisk !== null
      ? 'server_overall'
      : providedBalanceScore !== null
        ? 'policy_balance'
        : hasAllCurrentRisks
          ? 'weighted_fallback'
          : simulationState.overallRiskSource
  );
  const incomingRiskWeights = asObject(api.risk_weights ?? api.riskWeights);
  const incomingDecisionTrace = normalizeDecisionTrace(api.decision_trace ?? api.decisionTrace);
  const rawCalculationLog = api.calculation_log ?? api.calculationLog;
  const incomingCalculationLog = rawCalculationLog && typeof rawCalculationLog === 'object' ? rawCalculationLog : null;
  const incomingFacts = Array.isArray(api.extracted_facts ?? api.extractedFacts ?? api.facts)
    ? (api.extracted_facts ?? api.extractedFacts ?? api.facts)
    : isDirectRiskSchema ? [] : simulationState.facts;
  const incomingSafeguards = Array.isArray(api.policy_safeguards ?? api.policySafeguards)
    ? (api.policy_safeguards ?? api.policySafeguards)
    : Array.isArray(api.current_policy_safeguards ?? api.currentPolicySafeguards)
      ? (api.current_policy_safeguards ?? api.currentPolicySafeguards)
      : isDirectRiskSchema ? [] : simulationState.safeguards;
  const incomingRisks = asObject(api.risks);
  const incomingRiskMetrics = Array.isArray(incomingRisks.metrics)
    ? incomingRisks.metrics
    : isDirectRiskSchema ? [] : simulationState.riskMetrics;
  const incomingBiggestGap = firstMeaningfulValue(
    api.largest_policy_gap,
    api.largestPolicyGap,
    api.biggest_gap,
    api.biggestGap
  );
  const incomingRecommendations = Array.isArray(api.recommended_clauses ?? api.recommendedClauses)
    ? (api.recommended_clauses ?? api.recommendedClauses)
    : isDirectRiskSchema ? [] : simulationState.recommendedClauses;
  const incomingEvidenceGraph = firstMeaningfulValue(
    api.judgment_graph,
    api.judgmentGraph,
    api.evidence_graph,
    api.evidenceGraph
  );
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
    analysisSchemaVersion: incomingSchemaVersion || simulationState.analysisSchemaVersion,
    facts: incomingFacts,
    safeguards: incomingSafeguards,
    riskMetrics: incomingRiskMetrics,
    biggestGap: incomingBiggestGap && typeof incomingBiggestGap === 'object'
      ? incomingBiggestGap
      : isDirectRiskSchema ? null : simulationState.biggestGap,
    recommendedClauses: incomingRecommendations,
    evidenceGraph: incomingEvidenceGraph && typeof incomingEvidenceGraph === 'object'
      ? incomingEvidenceGraph
      : isDirectRiskSchema ? null : simulationState.evidenceGraph,
    actorType: isDirectRiskSchema ? '' : actorType,
    actorConfidence: isDirectRiskSchema ? null : actorConfidence,
    actorProbabilities: isDirectRiskSchema ? {} : actorProbabilities,
    personaSummary: isDirectRiskSchema ? '' : api.persona_summary ?? api.personaSummary ?? api.summary ?? simulationState.personaSummary,
    qreLambda: isDirectRiskSchema ? null : qreLambda,
    claimType: api.claim_type ?? api.claimType ?? simulationState.claimType,
    evidenceState: api.evidence_state ?? api.evidenceState ?? api.information_state ?? api.informationState ?? simulationState.evidenceState,
    pressureState: api.pressure_state ?? api.pressureState ?? api.pressure_level ?? api.pressureLevel ?? simulationState.pressureState,
    ruleConstraint: api.rule_constraint ?? api.ruleConstraint ?? simulationState.ruleConstraint,
    scoreVersion: api.score_version ?? api.scoreVersion ?? simulationState.scoreVersion,
    weightsVersion: api.weights_version ?? api.weightsVersion ?? simulationState.weightsVersion,
    riskWeights: Object.keys(incomingRiskWeights).length ? incomingRiskWeights : simulationState.riskWeights,
    overallRiskSource,
    decisionTrace: incomingDecisionTrace,
    calculationLog: incomingCalculationLog,
    overallRisk: directOverallRisk === null ? null : clampMetric(directOverallRisk),
    hasOverallRiskData: directOverallRisk !== null || providedBalanceScore !== null || hasAllCurrentRisks,
    riskAvailability,
    policyBalanceScore: providedBalanceScore === null
      ? simulationState.policyBalanceScore
      : clampMetric(providedBalanceScore),
    claimValidity: factCheckNeed === null
      ? (claimValidity === null ? simulationState.claimValidity : clampMetric(claimValidity))
      : clampMetric(100 - factCheckNeed),
    manipulationRisk: manipulationRisk === null ? simulationState.manipulationRisk : clampMetric(manipulationRisk),
    handoffNeed: handoffNeed === null ? simulationState.handoffNeed : clampMetric(handoffNeed),
    overConcessionRisk: overConcessionRisk === null ? simulationState.overConcessionRisk : clampMetric(overConcessionRisk),
    underResponseRisk: underResponseRisk === null ? simulationState.underResponseRisk : clampMetric(underResponseRisk),
    policyViolationRisk: policyViolationRisk === null ? simulationState.policyViolationRisk : clampMetric(policyViolationRisk),
    scenarioTitle: api.policy_title ?? api.policyTitle ?? api.scenario_title ?? api.scenarioTitle ?? simulationState.scenarioTitle,
    recordDate: api.record_date ?? api.recordDate ?? simulationState.recordDate,
    recordTitle: api.record_title ?? api.recordTitle ?? simulationState.recordTitle,
    policyDocument: api.policy_document ?? api.policyDocument ?? simulationState.policyDocument,
    incidentConditions: api.incident_conditions ?? api.incidentConditions ?? api.scenario_briefing ?? api.scenarioBriefing ?? simulationState.incidentConditions,
    vulnerabilities: normalizeStringList(api.policy_gaps ?? api.policyGaps ?? api.vulnerabilities ?? api.weak_clauses ?? api.weakClauses) ?? simulationState.vulnerabilities,
    alternativePolicy: api.revised_policy ?? api.revisedPolicy ?? api.alternative_policy ?? api.alternativePolicy ?? simulationState.alternativePolicy,
    recommendation: api.revised_policy_rationale ?? api.revisedPolicyRationale ?? api.recommendation ?? api.policy_recommendation ?? api.policyRecommendation ?? simulationState.recommendation,
    verifiedPolicyText: (
      api.verified_policy_document ??
      api.verifiedPolicyDocument ??
      api.policy_document ??
      api.policyDocument ??
      simulationState.verifiedPolicyText
    ) || simulationState.policyDocument,
    policySummary: api.policy_diagnosis ?? api.policyDiagnosis ?? simulationState.policySummary,
    policyStrengths: normalizeStringList(api.policy_strengths ?? api.policyStrengths) ?? simulationState.policyStrengths,
    policySafeguards: firstMeaningfulValue(
      api.current_policy_safeguards,
      api.currentPolicySafeguards,
      api.flags
    ) ?? simulationState.policySafeguards,
    analysisHeadline: api.analysis_headline ?? api.analysisHeadline ?? api.headline ?? simulationState.analysisHeadline,
    riskReasons: api.risk_reasons ?? api.riskReasons ?? simulationState.riskReasons,
    isComplete: Boolean(isComplete || api.is_complete || api.isComplete),
  };

  if (providedBalanceScore == null) simulationState.policyBalanceScore = calculatePolicyBalanceScore(simulationState);

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
}

function syncSimulationStateFromMessages() {
  const reversed = [...messages].reverse();
  const latestAssistant = reversed.find((message) =>
    message.role === 'assistant' && (
      message.metadata?.simulation_state ||
      message.metadata?.simulationState ||
      message.metadata?.game_state ||
      message.metadata?.gameState ||
      message.metadata?.analysis_state ||
      message.metadata?.analysisState ||
      message.metadata?.analysis_result ||
      message.metadata?.analysisResult ||
      message.metadata?.decision_trace ||
      message.metadata?.decisionTrace ||
      message.metadata?.calculation_log ||
      message.metadata?.calculationLog
    )
  );
  const latest = latestAssistant ?? reversed.find((message) =>
    message.metadata?.simulation_state ||
    message.metadata?.simulationState ||
    message.metadata?.game_state ||
    message.metadata?.gameState ||
    message.metadata?.analysis_state ||
    message.metadata?.analysisState ||
    message.metadata?.analysis_result ||
    message.metadata?.analysisResult ||
    message.metadata?.decision_trace ||
    message.metadata?.decisionTrace ||
    message.metadata?.calculation_log ||
    message.metadata?.calculationLog
  );
  if (latest) {
    const payload = composeSimulationPayload(
      latest.metadata?.simulation_state ?? latest.metadata?.simulationState ?? latest.metadata?.game_state ?? latest.metadata?.gameState,
      latest.metadata?.analysis_state ?? latest.metadata?.analysisState,
      latest.metadata?.analysis_result ?? latest.metadata?.analysisResult,
      latest.metadata?.calculation_basis ?? latest.metadata?.calculationBasis,
      latest.metadata?.decision_trace ?? latest.metadata?.decisionTrace,
      latest.metadata?.calculation_log ?? latest.metadata?.calculationLog
    );
    remapApiSimulationState(payload, Boolean(latest.metadata?.is_complete ?? latest.metadata?.is_game_over));
    return;
  }
  const count = analysisRequestCount();
  simulationState.cycle = Math.min(simulationState.maxCycles, count);
  simulationState.isComplete = count >= simulationState.maxCycles;
}

function buildApiCompatibleState() {
  const calculationRun = asObject(asObject(simulationState.calculationLog).run);
  return {
    mode: 'policy_simulation',
    analysis_schema_version: 'direct-risk-v1',
    cycle: simulationState.cycle,
    max_cycles: simulationState.maxCycles,
    turn: simulationState.cycle,
    max_turns: simulationState.maxCycles,
    overall_risk: simulationState.hasOverallRiskData ? criticalRiskScore() : null,
    policy_balance_score: simulationState.hasOverallRiskData ? simulationState.policyBalanceScore : null,
    survival_score: simulationState.hasOverallRiskData ? simulationState.policyBalanceScore : null,
    evidence_state: simulationState.evidenceState,
    extracted_facts: simulationState.facts,
    policy_safeguards: simulationState.safeguards,
    risks: { metrics: simulationState.riskMetrics },
    largest_policy_gap: simulationState.biggestGap,
    recommended_clauses: simulationState.recommendedClauses,
    judgment_graph: simulationState.evidenceGraph,
    score_version: simulationState.scoreVersion,
    weights_version: simulationState.weightsVersion,
    risk_weights: simulationState.riskWeights,
    calculation_source: simulationState.overallRiskSource,
    decision_trace: simulationState.decisionTrace,
    previous_calculation_run_id: calculationRun.run_id ?? calculationRun.runId ?? null,
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

function riskReasonText(...values) {
  const value = firstMeaningfulValue(...values);
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 3).join(' · ');
  if (value && typeof value === 'object') {
    return String(firstMeaningfulValue(value.reason, value.summary, value.explanation) ?? '').trim();
  }
  return '';
}


function riskMetricRows() {
  const reasons = simulationState.riskReasons && typeof simulationState.riskReasons === 'object'
    ? simulationState.riskReasons
    : {};
  const factCheckReason = riskReasonText(reasons.unverified_response_risk, reasons.unverifiedResponseRisk, reasons.fact_check_need, reasons.factCheckNeed);
  const manipulationReason = riskReasonText(reasons.pressure_judgment_risk, reasons.pressureJudgmentRisk, reasons.manipulation_risk, reasons.manipulationRisk);
  const overConcessionReason = riskReasonText(reasons.premature_promise_risk, reasons.prematurePromiseRisk, reasons.over_concession_risk, reasons.overConcessionRisk);
  const underResponseReason = riskReasonText(reasons.legitimate_issue_miss_risk, reasons.legitimateIssueMissRisk, reasons.under_response_risk, reasons.underResponseRisk);
  const policyViolationReason = riskReasonText(reasons.school_procedure_risk, reasons.schoolProcedureRisk, reasons.policy_violation_risk, reasons.policyViolationRisk);
  const handoffReason = riskReasonText(reasons.solo_handling_risk, reasons.soloHandlingRisk, reasons.escalation_need, reasons.escalationNeed);
  const rows = [
    {
      key: 'factCheckNeed',
      label: '확인 없이 답할 위험',
      technicalLabel: '사실 확인',
      value: clampMetric(100 - simulationState.claimValidity),
      help: factCheckReason || '현재 대응 기준에 학생 진술, 교사 관찰, 상담·연락 기록을 확인하는 내용이 필요한 정도입니다.',
      reasonSource: factCheckReason ? 'analysis' : 'definition',
    },
    {
      key: 'manipulationRisk',
      label: '압박에 판단이 흔들릴 위험',
      technicalLabel: '압박 영향',
      value: simulationState.manipulationRisk,
      help: manipulationReason || '현재 대응 기준이 반복 항의·공개 언급과 사실 판단을 분리하지 못할 위험입니다.',
      reasonSource: manipulationReason ? 'analysis' : 'definition',
    },
    {
      key: 'overConcessionRisk',
      label: '성급히 약속할 위험',
      technicalLabel: '성급한 약속',
      value: simulationState.overConcessionRisk,
      help: overConcessionReason || '현재 대응 기준에 사실 확인 전 사과·지도 철회·담임 교체를 제한하는 내용이 부족한 정도입니다.',
      reasonSource: overConcessionReason ? 'analysis' : 'definition',
    },
    {
      key: 'underResponseRisk',
      label: '정당한 문제를 놓칠 위험',
      technicalLabel: '대응 누락',
      value: simulationState.underResponseRisk,
      help: underResponseReason || '현재 대응 기준에 근거 있는 문제 제기와 학생 보호 필요를 검토하는 내용이 부족한 정도입니다.',
      reasonSource: underResponseReason ? 'analysis' : 'definition',
    },
    {
      key: 'policyViolationRisk',
      label: '학교 절차를 놓칠 위험',
      technicalLabel: '학교 기준',
      value: simulationState.policyViolationRisk,
      help: policyViolationReason || '사실 확인, 개인정보 보호, 생활지도 기록과 학교 절차가 충분히 정해지지 않은 정도입니다.',
      reasonSource: policyViolationReason ? 'analysis' : 'definition',
    },
    {
      key: 'handoffNeed',
      label: '혼자 대응하다 커질 위험',
      technicalLabel: '관리자 공유',
      value: simulationState.handoffNeed,
      help: handoffReason || '현재 대응 기준에 교장·교감·부장교사와 공유할 조건을 구체적으로 둘 필요가 있는 정도입니다.',
      reasonSource: handoffReason ? 'analysis' : 'definition',
    },
  ];
  return rows.map((row) => ({
    ...row,
    available: Boolean(simulationState.riskAvailability?.[row.key]),
    revisedValue: simulationState.hasAlternativeRiskData
      ? numberOrNull(simulationState.alternativePolicyRisks?.[row.key])
      : null,
  }));
}

const PROVISIONAL_RISK_WEIGHTS = {
  factCheckNeed: 0.08,
  manipulationRisk: 0.22,
  overConcessionRisk: 0.2,
  underResponseRisk: 0.2,
  policyViolationRisk: 0.2,
  handoffNeed: 0.1,
};

function formatBasisPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const rounded = Math.round(number * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function basisValueText(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(' · ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([label]) => label)
      .join(' · ');
  }
  return String(value ?? '').trim();
}

function policyFlagValue(source, ...keys) {
  const flags = asObject(source);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(flags, key)) {
      const value = flags[key];
      if (value === false || value === 0 || String(value).toLowerCase() === 'false') return false;
      return Boolean(value);
    }
  }
  return null;
}

function normalizedOverallWeights() {
  const raw = asObject(simulationState.riskWeights);
  const aliases = {
    factCheckNeed: ['unverified_response_risk', 'unverifiedResponseRisk', 'fact_check_need', 'factCheckNeed'],
    manipulationRisk: ['pressure_judgment_risk', 'pressureJudgmentRisk', 'manipulation_risk', 'manipulationRisk'],
    overConcessionRisk: ['premature_promise_risk', 'prematurePromiseRisk', 'over_concession_risk', 'overConcessionRisk'],
    underResponseRisk: ['legitimate_issue_miss_risk', 'legitimateIssueMissRisk', 'under_response_risk', 'underResponseRisk'],
    policyViolationRisk: ['school_procedure_risk', 'schoolProcedureRisk', 'policy_violation_risk', 'policyViolationRisk'],
    handoffNeed: ['solo_handling_risk', 'soloHandlingRisk', 'escalation_need', 'escalationNeed', 'handoff_need', 'handoffNeed'],
  };
  const fromServer = Object.fromEntries(Object.entries(aliases).map(([key, candidates]) => {
    const value = numberOrNull(firstMeaningfulValue(...candidates.map((candidate) => raw[candidate])));
    const normalized = value === null ? null : value > 1 ? value / 100 : value;
    return [key, normalized !== null && normalized >= 0 && normalized <= 1 ? normalized : null];
  }));
  if (Object.values(fromServer).every((value) => value !== null)) return fromServer;
  if (simulationState.scoreVersion === 'qre-risk-v2-provisional' || simulationState.overallRiskSource === 'weighted_fallback') {
    return PROVISIONAL_RISK_WEIGHTS;
  }
  return null;
}

function isUsefulBasisValue(value) {
  const text = basisValueText(value).trim();
  if (!text) return false;
  return !/^(자동\s*추정|자동|미입력|입력\s*없음|없음|해당\s*없음|미제공|확인\s*필요)$/i.test(text);
}

function decisionTraceSourceLabel(value) {
  const source = String(value ?? '').trim();
  const labels = {
    situation_record: '선생님의 기록',
    incident_conditions: '선생님의 기록',
    record: '선생님의 기록',
    policy_document: '대응 기준 원문',
    policy: '대응 기준 원문',
    structured_input: '보조 정보',
    input: '보조 정보',
    server_evidence: '서버 근거',
  };
  return labels[source] || sanitizeProductLanguage(source) || '분석 근거';
}

function decisionTracePhaseLabel(value) {
  const phase = String(value ?? '').trim();
  if (/persona|qre|actor|유형|반응/i.test(phase)) return '유형·QRE';
  if (/risk|score|위험/i.test(phase)) return '위험';
  return '입력';
}

function decisionTraceTargetLabel(value) {
  const target = String(value ?? '').trim();
  if (/persona.?qre/i.test(target)) return '유형·QRE';
  if (/^persona$|actor|유형/i.test(target)) return '유형';
  if (/qre/i.test(target)) return 'QRE';
  if (/risk|score|fact.?check|manipulation|concession|response|violation|escalation|handoff|위험/i.test(target)) return '위험';
  if (/input|assessment|입력/i.test(target)) return '입력';
  if (/policy|정책|규정|대응\s*기준/i.test(target)) return '대응 기준';
  if (!target || /common|공통/i.test(target)) return '공통';
  return compactTraceText(sanitizeProductLanguage(target), 14);
}

function buildDecisionTrace() {
  const providedTrace = simulationState.decisionTrace && typeof simulationState.decisionTrace === 'object'
    ? simulationState.decisionTrace
    : null;
  if (providedTrace?.steps?.length) {
    return {
      ...providedTrace,
      source: 'server',
      steps: providedTrace.steps.slice(0, 6),
    };
  }

  const steps = [];
  const addStep = (source, evidence, interpretation, effect, target = '') => {
    if (steps.length >= 5) return;
    const item = {
      phase: 'input',
      source,
      evidence: compactTraceText(evidence, 150),
      interpretation: compactTraceText(interpretation, 150),
      effect: compactTraceText(effect, 150),
      target,
    };
    if (!item.evidence || steps.some((step) => step.evidence === item.evidence)) return;
    steps.push(item);
  };

  const situation = String(simulationState.incidentConditions ?? '');
  const structured = [simulationState.claimType, simulationState.pressureState, simulationState.evidenceState]
    .filter(isUsefulBasisValue)
    .map(basisValueText)
    .join(' ');
  const cueText = `${situation} ${structured}`;
  const evidenceState = isUsefulBasisValue(simulationState.evidenceState)
    ? basisValueText(simulationState.evidenceState)
    : '';

  if (evidenceState && /일부|불명확|부족|미확인|확인\s*전|진술.*(?:다름|불일치)/.test(evidenceState)) {
    addStep(
      '보조 정보',
      `정보 상태: ${evidenceState}`,
      '확인할 사실과 기록이 아직 남아 있음',
      '사실 확인 필요와 확인 전 약속 위험을 높이는 방향',
      'factCheckNeed'
    );
  } else if (/아직.*(?:확인|검토).*전|미확인|사실관계.*불명확|증거.*부족|기록.*(?:없|부족)|진술.*(?:다름|불일치)/.test(cueText)) {
    addStep(
      '선생님의 기록',
      '사실·기록이 아직 확인되지 않았다고 적혀 있음',
      '현재 정보만으로 사실관계를 확정하기 어려움',
      '사실 확인 필요와 확인 전 약속 위험을 높이는 방향',
      'factCheckNeed'
    );
  }

  if (/공식\s*사과|사과\s*(?:요구|요청)|책임\s*인정/.test(cueText)) {
    addStep(
      '선생님의 기록',
      '공식 사과 또는 책임 인정 요구가 기록됨',
      '결과뿐 아니라 감정적 인정·책임 확인을 원하는 신호',
      '학부모 유형 분류와 확인 전 약속 위험에 반영',
      'persona'
    );
  }

  if (/반복|계속|재차|세\s*차례|여러\s*번|수차례/.test(cueText)) {
    addStep(
      '선생님의 기록',
      '같거나 비슷한 요구가 반복되었다고 적혀 있음',
      '효과가 있다고 느낀 요구를 이어갈 수 있는 반복성 신호',
      'QRE λ와 민원 압박 위험 판단에 반영',
      'qre'
    );
  }

  if (/교육청|온라인|공개|커뮤니티|언론|게시|신고/.test(cueText)) {
    addStep(
      '선생님의 기록',
      '교육청·온라인 공개 등 외부 채널이 언급됨',
      '사실 판단과 분리해 살펴야 하는 외부 압박 신호',
      '민원 압박 위험과 관리자 공유 필요를 높이는 방향',
      'manipulationRisk'
    );
  }

  if (/담임\s*교체|교사\s*교체|생활지도\s*철회|지도\s*철회/.test(cueText)) {
    addStep(
      '선생님의 기록',
      '담임 교체 또는 생활지도 철회 요구가 기록됨',
      '확인 전에 학교 조치를 바꾸도록 요구하는 신호',
      '확인 전 약속 위험과 관리자 공유 필요에 반영',
      'overConcessionRisk'
    );
  }

  const missingSafeguards = [
    ['사실·기록 확인', policyFlagValue(simulationState.policySafeguards, 'evidence_required', 'evidenceRequired')],
    ['관리자 승인', policyFlagValue(simulationState.policySafeguards, 'approval_required', 'approvalRequired')],
    ['관리자 공유', policyFlagValue(simulationState.policySafeguards, 'handoff_defined', 'handoffDefined')],
  ].filter(([, value]) => value === false).map(([label]) => label);
  if (missingSafeguards.length) {
    addStep(
      '대응 기준 원문',
      `대응 기준에서 ${missingSafeguards.join('·')} 내용을 확인하지 못함`,
      '민원 상황에서 단독 판단을 막는 대응 안전장치가 부족함',
      '학교 기준 위험과 관리자 공유 필요를 높이는 방향',
      'policyViolationRisk'
    );
  } else if (steps.length < 4 && simulationState.vulnerabilities?.length) {
    addStep(
      '대응 기준 점검',
      sanitizeProductLanguage(simulationState.vulnerabilities[0]),
      '현재 대응 기준에서 보완이 필요한 부분으로 분류됨',
      '관련 위험 점수의 대응 기준 근거로 연결',
      'policyViolationRisk'
    );
  }

  if (steps.length < 3 && isUsefulBasisValue(simulationState.claimType)) {
    addStep(
      '보조 정보',
      `주장 유형: ${basisValueText(simulationState.claimType)}`,
      '요구가 제시된 방식을 구조화한 입력',
      '학부모 유형 확률과 위험 계산에 사용',
      'persona'
    );
  }
  if (steps.length < 3 && isUsefulBasisValue(simulationState.pressureState)) {
    addStep(
      '보조 정보',
      `압박 상태: ${basisValueText(simulationState.pressureState)}`,
      '요구가 사실 판단에 영향을 줄 수 있는지 보는 입력',
      '민원 압박 위험과 관리자 공유 필요에 사용',
      'manipulationRisk'
    );
  }

  return {
    traceVersion: '',
    status: 'partial',
    source: 'fallback',
    steps,
    limitations: ['단서별 실제 수치 기여값이 없어 영향 방향만 표시합니다.'],
  };
}

function calculationRecords(value, primitiveField = 'value') {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([key, item]) => (
    item && typeof item === 'object' && !Array.isArray(item)
      ? { key, ...item }
      : { key, [primitiveField]: item }
  ));
}

function firstCalculationValue(...values) {
  return values.find((value) => value !== undefined);
}

function calculationNumber(value, maximumFractionDigits = 4) {
  if (value === null) return 'null';
  if (value === undefined || value === '') return '—';
  const number = numberOrNull(value);
  if (number === null) return '—';
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits,
    useGrouping: false,
  }).format(number);
}

function calculationProbability(value) {
  if (value === null) return 'null';
  if (value === undefined || value === '') return '—';
  const number = numberOrNull(value);
  if (number === null) return '—';
  const percentage = Math.abs(number) <= 1 ? number * 100 : number;
  return `${calculationNumber(percentage, 2)}%`;
}

function calculationValue(value) {
  if (value === null) return 'null';
  if (value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return calculationNumber(value);
  if (typeof value === 'object') {
    try {
      return compactTraceText(JSON.stringify(value), 90);
    } catch {
      return '—';
    }
  }
  return compactTraceText(value, 90);
}

function calculationTerms(value) {
  return calculationRecords(value).map((term) => ({
    name: compactTraceText(firstMeaningfulValue(
      term?.label,
      term?.name,
      term?.feature,
      term?.ref,
      term?.metric,
      term?.risk_key,
      term?.riskKey,
      term?.key
    ), 80) || '기여항',
    value: firstCalculationValue(term?.value, term?.feature_value, term?.featureValue, term?.score),
    weight: firstCalculationValue(term?.weight, term?.coefficient),
    contribution: firstCalculationValue(term?.contribution, term?.weighted_value, term?.weightedValue),
  }));
}

function sumProvidedContributions(terms) {
  if (!terms.length) return null;
  const values = terms.map((term) => numberOrNull(term.contribution));
  if (values.some((value) => value === null)) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function calculationPhase(root, pattern, order) {
  const phases = Array.isArray(root.phases) ? root.phases : [];
  return phases.find((phase) => {
    const key = `${phase?.key ?? ''} ${phase?.phase ?? ''}`;
    return pattern.test(key) || Number(phase?.phase) === order;
  }) ?? {};
}

function buildCalculationLogView() {
  const root = asObject(simulationState.calculationLog);
  const hasLog = Object.keys(root).length > 0;
  const inputPhase = calculationPhase(root, /input|assessment|입력/i, 1);
  const personaPhase = calculationPhase(root, /persona|qre|actor|유형|반응/i, 2);
  const riskPhase = calculationPhase(root, /risk|score|위험/i, 3);
  const input = asObject(firstMeaningfulValue(root.input, root.input_assessment, root.inputAssessment, inputPhase.input, inputPhase.inputs, inputPhase));
  const persona = asObject(firstMeaningfulValue(root.persona, personaPhase.persona));
  const qre = asObject(firstMeaningfulValue(root.qre, personaPhase.qre));
  const risk = asObject(firstMeaningfulValue(root.risk, root.risk_scoring, root.riskScoring, riskPhase.risk, riskPhase));
  const run = asObject(firstMeaningfulValue(root.run, root.meta, root.metadata));

  const evidence = calculationRecords(firstMeaningfulValue(input.evidence, inputPhase.evidence));
  const evidenceById = Object.fromEntries(evidence
    .map((item) => [String(item?.id ?? '').trim(), item])
    .filter(([id]) => id));
  const explicitFeatures = calculationRecords(firstMeaningfulValue(input.features, input.encoded_features, input.encodedFeatures));
  const signalFeatures = explicitFeatures.length ? [] : calculationRecords(firstMeaningfulValue(input.signals, inputPhase.signals));
  const features = (explicitFeatures.length ? explicitFeatures : signalFeatures).map((feature) => {
    const evidenceIds = Array.isArray(feature?.evidence_ids ?? feature?.evidenceIds)
      ? (feature.evidence_ids ?? feature.evidenceIds).map(String)
      : [];
    const citedEvidence = evidenceIds.map((id) => evidenceById[id]).find(Boolean);
    return {
      key: compactTraceText(firstMeaningfulValue(feature?.key, feature?.id), 80),
      label: compactTraceText(firstMeaningfulValue(feature?.label, feature?.name, feature?.key, feature?.id), 80) || '입력 특징',
      source: compactTraceText(firstMeaningfulValue(feature?.source, citedEvidence?.source), 50),
      excerpt: compactTraceText(firstMeaningfulValue(
        feature?.source_excerpt,
        feature?.sourceExcerpt,
        citedEvidence?.summary,
        citedEvidence?.excerpt,
        citedEvidence?.evidence
      ), 130),
      rawValue: firstCalculationValue(feature?.raw_value, feature?.rawValue, feature?.original_value, feature?.originalValue),
      encodedValue: firstCalculationValue(feature?.encoded_value, feature?.encodedValue, signalFeatures.length ? feature?.value : undefined),
      encoding: compactTraceText(firstMeaningfulValue(feature?.encoding, feature?.encoder), 50),
      missing: feature?.missing === true,
      confidence: firstCalculationValue(feature?.confidence, feature?.score),
    };
  });

  const selectedType = compactTraceText(firstMeaningfulValue(persona.selected_type, persona.selectedType, simulationState.actorType), 40);
  let personaCandidates = calculationRecords(firstMeaningfulValue(persona.candidates, persona.classes, persona.types));
  if (!personaCandidates.length) {
    personaCandidates = calculationRecords(firstMeaningfulValue(persona.probabilities, persona.actor_probabilities, persona.actorProbabilities), 'probability');
  }
  personaCandidates = personaCandidates.map((candidate) => {
    const terms = calculationTerms(firstMeaningfulValue(candidate?.terms, candidate?.factors, candidate?.contributions));
    const type = compactTraceText(firstMeaningfulValue(candidate?.type, candidate?.label, candidate?.key), 40) || '유형';
    const provenance = asObject(candidate?.provenance);
    return {
      type,
      selected: candidate?.selected === true || type === selectedType,
      rawProbability: firstCalculationValue(candidate?.raw_probability, candidate?.rawProbability, candidate?.model_probability, candidate?.modelProbability),
      normalizationFactor: firstCalculationValue(candidate?.normalization_factor, candidate?.normalizationFactor),
      source: compactTraceText(firstMeaningfulValue(
        provenance.raw_probability,
        provenance.kind,
        candidate?.source
      ), 70),
      base: firstCalculationValue(candidate?.base, candidate?.bias, candidate?.intercept),
      terms,
      contributionSum: firstCalculationValue(candidate?.contribution_sum, candidate?.contributionSum, sumProvidedContributions(terms)),
      logit: firstCalculationValue(candidate?.logit, candidate?.score, candidate?.raw_score, candidate?.rawScore),
      probability: firstCalculationValue(candidate?.probability, candidate?.p, candidate?.value),
    };
  });

  const sampledAction = compactTraceText(firstMeaningfulValue(qre.sampled_action, qre.sampledAction, qre.selected_action, qre.selectedAction), 80);
  const qreActions = calculationRecords(firstMeaningfulValue(qre.actions, qre.candidates)).map((action) => {
    const name = compactTraceText(firstMeaningfulValue(action?.action, action?.label, action?.name, action?.key), 80) || '행동';
    const terms = calculationTerms(firstMeaningfulValue(action?.utility_terms, action?.utilityTerms, action?.terms, action?.factors));
    return {
      name,
      eligible: action?.eligible,
      selected: action?.selected === true || Boolean(sampledAction && name === sampledAction),
      terms,
      utility: firstCalculationValue(action?.utility, action?.u),
      lambdaUtility: firstCalculationValue(action?.lambda_utility, action?.lambdaUtility, action?.qre_logit, action?.qreLogit),
      shiftedLambdaUtility: firstCalculationValue(action?.shifted_lambda_utility, action?.shiftedLambdaUtility),
      expValue: firstCalculationValue(action?.exp_value, action?.expValue),
      probability: firstCalculationValue(action?.probability, action?.p),
    };
  });

  const overall = asObject(firstMeaningfulValue(risk.overall, riskPhase.overall, root.overall));
  const overallTerms = calculationTerms(firstMeaningfulValue(overall.terms, overall.contributions));
  const overallTermByKey = Object.fromEntries(calculationRecords(firstMeaningfulValue(overall.terms, overall.contributions))
    .map((term) => [String(firstMeaningfulValue(term?.metric, term?.risk_key, term?.riskKey, term?.key) ?? '').trim(), term])
    .filter(([key]) => key));
  const riskMetrics = calculationRecords(firstMeaningfulValue(risk.metrics, risk.risks, riskPhase.risks), 'final_score').map((metric) => {
    const key = String(firstMeaningfulValue(metric?.key, metric?.risk_key, metric?.riskKey) ?? '').trim();
    const terms = calculationTerms(firstMeaningfulValue(metric?.terms, metric?.contributions, metric?.factors));
    const overallTerm = overallTermByKey[key] ?? {};
    return {
      key,
      label: compactTraceText(firstMeaningfulValue(metric?.label, riskMetricLabel(key)), 80),
      formulaId: compactTraceText(firstMeaningfulValue(metric?.formula_id, metric?.formulaId), 80),
      formula: compactTraceText(metric?.formula, 180),
      base: firstCalculationValue(metric?.base, metric?.intercept),
      terms,
      contributionSum: firstCalculationValue(metric?.contribution_sum, metric?.contributionSum, sumProvidedContributions(terms)),
      rawScore: firstCalculationValue(metric?.raw_score, metric?.rawScore),
      finalScore: firstCalculationValue(metric?.final_score, metric?.finalScore, metric?.score, metric?.value),
      rounding: compactTraceText(metric?.rounding, 50),
      overallWeight: firstCalculationValue(overallTerm?.weight, metric?.overall_weight, metric?.overallWeight),
      overallContribution: firstCalculationValue(overallTerm?.contribution, metric?.overall_contribution, metric?.overallContribution),
    };
  });

  const hasInputDetail = features.length > 0 && features.every((feature) => feature.encodedValue !== undefined && feature.encodedValue !== null);
  const hasPersonaDetail = personaCandidates.length >= ACTOR_TYPES.length && personaCandidates.every((candidate) => {
    const hasTransparentClassifierCalculation = candidate.logit !== undefined && candidate.logit !== null && candidate.terms.length > 0;
    const hasHonestModelNormalization = candidate.rawProbability !== undefined && candidate.rawProbability !== null;
    return candidate.probability !== undefined && candidate.probability !== null &&
      (hasTransparentClassifierCalculation || hasHonestModelNormalization);
  });
  const hasQreDetail = qreActions.length > 0 && qreActions.every((action) =>
    action.utility !== undefined && action.utility !== null &&
    action.probability !== undefined && action.probability !== null &&
    action.terms.length > 0
  );
  const hasRiskDetail = riskMetrics.length >= 6 && riskMetrics.every((metric) =>
    metric.terms.length > 0 &&
    metric.rawScore !== undefined && metric.rawScore !== null &&
    metric.finalScore !== undefined && metric.finalScore !== null
  );
  const hasOverallDetail = overallTerms.length > 0 && overallTerms.every((term) => term.contribution !== undefined && term.contribution !== null) &&
    firstMeaningfulValue(overall.raw_score, overall.rawScore) !== undefined;
  const stageStatus = (hasAny, complete) => complete ? 'complete' : hasAny ? 'partial' : 'missing';
  const inputStatus = stageStatus(features.length > 0, hasInputDetail);
  const personaStatus = stageStatus(personaCandidates.length > 0, hasPersonaDetail);
  const qreStatus = stageStatus(qreActions.length > 0, hasQreDetail);
  const riskStatus = stageStatus(riskMetrics.length > 0, hasRiskDetail && hasOverallDetail);
  const derivedStatus = inputStatus === 'complete' && personaStatus === 'complete' && qreStatus === 'complete' && riskStatus === 'complete'
    ? 'complete'
    : hasLog
      ? 'partial'
      : 'missing';

  return {
    root,
    hasLog,
    status: derivedStatus,
    declaredStatus: compactTraceText(firstMeaningfulValue(root.status, run.status), 30),
    limitations: (normalizeStringList(root.limitations) ?? []).slice(0, 4),
    run: {
      id: compactTraceText(firstMeaningfulValue(run.run_id, run.runId, run.id, root.trace_id, root.traceId), 80),
      schemaVersion: compactTraceText(firstMeaningfulValue(root.schema_version, root.schemaVersion, root.trace_version, root.traceVersion), 80),
      engineVersion: compactTraceText(firstMeaningfulValue(run.engine_version, run.engineVersion), 80),
      scoreVersion: compactTraceText(firstMeaningfulValue(run.score_version, run.scoreVersion, risk.score_version, risk.scoreVersion, simulationState.scoreVersion), 80),
      weightsVersion: compactTraceText(firstMeaningfulValue(run.weights_version, run.weightsVersion, overall.weights_version, overall.weightsVersion, simulationState.weightsVersion), 80),
      seed: firstCalculationValue(run.seed, qre.seed, qre.random_seed, qre.randomSeed),
      precision: firstCalculationValue(run.precision, root.precision),
      rounding: compactTraceText(firstMeaningfulValue(run.rounding, overall.rounding), 50),
    },
    input: {
      features,
      status: inputStatus,
    },
    persona: {
      candidates: personaCandidates,
      selectedType,
      confidence: firstCalculationValue(persona.confidence, simulationState.actorConfidence),
      holdMargin: firstCalculationValue(persona.hold_margin, persona.holdMargin, asObject(persona.selection).hold_margin, asObject(persona.selection).holdMargin),
      rawProbabilityTotal: firstCalculationValue(persona.raw_probability_total, persona.rawProbabilityTotal),
      normalizationFactor: firstCalculationValue(persona.normalization_factor, persona.normalizationFactor),
      source: compactTraceText(firstMeaningfulValue(asObject(persona.provenance).kind, persona.source), 70),
      formula: compactTraceText(persona.formula, 180),
      status: personaStatus,
    },
    qre: {
      actions: qreActions,
      lambda: firstCalculationValue(qre.lambda, qre.lambda_qre, qre.lambdaQre, simulationState.qreLambda),
      normalizer: firstCalculationValue(qre.normalizer_z, qre.normalizerZ, qre.z),
      seed: firstCalculationValue(qre.seed, qre.random_seed, qre.randomSeed, run.seed),
      sampleValue: firstCalculationValue(qre.sample_value, qre.sampleValue, qre.random_draw, qre.randomDraw),
      formula: compactTraceText(qre.formula, 180),
      status: qreStatus,
    },
    risk: {
      metrics: riskMetrics,
      overall: {
        method: compactTraceText(firstMeaningfulValue(overall.method, overall.source), 80),
        formula: compactTraceText(overall.formula, 180),
        terms: overallTerms,
        rawScore: firstCalculationValue(overall.raw_score, overall.rawScore),
        finalScore: firstCalculationValue(overall.final_score, overall.finalScore, overall.score),
        rounding: compactTraceText(overall.rounding, 50),
      },
      status: riskStatus,
    },
  };
}

function calculationStageLabel(status) {
  if (status === 'complete') return '전체 로그';
  if (status === 'partial') return '부분 로그';
  return '미제공';
}

const ADMIN_RESEARCH_FEATURE_ORDER = [
  'evidence',
  'claim_severity',
  'pressure',
  'constraint_sensitivity',
  'policy_ambiguity',
  'policy_flexibility',
  'policy_restraint',
  'response_under',
];

const ADMIN_RESEARCH_FEATURE_LABELS = {
  evidence: '정보 확인 정도',
  claim_severity: '주장 신호 강도',
  pressure: '압박 신호 강도',
  constraint_sensitivity: '학교 기준 민감도',
  policy_ambiguity: '대응 안전장치 공백',
  policy_flexibility: '대응 기준의 재량·수용 여지',
  policy_restraint: '대응 안전장치 강도',
  response_under: '현재 대응 누락 신호',
  actor_strategic: '유형 기반 전략성',
  qre_pressure: '압박 행동 확률',
};

function adminResearchFeatureMap(calculationLog) {
  return Object.fromEntries(calculationLog.input.features
    .filter((feature) => feature.key)
    .map((feature) => [feature.key, feature]));
}

function adminResearchCoreFeatures(calculationLog) {
  const byKey = adminResearchFeatureMap(calculationLog);
  const selected = ADMIN_RESEARCH_FEATURE_ORDER.map((key) => byKey[key]).filter(Boolean);
  return selected.length ? selected : calculationLog.input.features.slice(0, 8);
}

function adminResearchFeatureEvidence(feature) {
  const rawIsCompact = ['string', 'number', 'boolean'].includes(typeof feature.rawValue);
  const raw = rawIsCompact ? calculationValue(feature.rawValue) : '';
  const excerpt = compactTraceText(feature.excerpt, 105);
  if (raw && raw !== '—' && excerpt && raw !== excerpt) return `${raw} · ${excerpt}`;
  return raw && raw !== '—' ? raw : excerpt || '근거 문구 미제공';
}

function adminResearchSourceLabel(value) {
  const source = String(value ?? '').trim();
  if (/model_estimate.*benchmark_config/i.test(source)) return '모델 추정 → 공개 기준';
  if (/model_estimate.*deterministic_calculation/i.test(source)) return '모델 추정 → 서버 계산';
  if (/deterministic_calculation/i.test(source)) return '서버 고정 계산';
  return decisionTraceSourceLabel(source);
}

function adminResearchProbabilityPoints(value) {
  const number = numberOrNull(value);
  if (number === null) return null;
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function adminResearchSignedNumber(value) {
  const number = numberOrNull(value);
  if (number === null) return '—';
  return `${number > 0 ? '+' : ''}${calculationNumber(number, 2)}`;
}

function adminResearchTopTerms(terms, limit = 2) {
  return terms
    .filter((term) => numberOrNull(term.contribution) !== null)
    .sort((a, b) => Math.abs(numberOrNull(b.contribution)) - Math.abs(numberOrNull(a.contribution)))
    .slice(0, limit);
}

function buildAdminPolicyComparison(calculationLog) {
  const proposed = asObject(firstMeaningfulValue(
    calculationLog.root.proposed_policy_simulation,
    calculationLog.root.proposedPolicySimulation
  ));
  const proposedRisk = asObject(proposed.risk);
  const proposedOverall = asObject(proposedRisk.overall);
  const currentByKey = Object.fromEntries(calculationLog.risk.metrics.map((metric) => [metric.key, metric]));
  const metrics = calculationRecords(proposedRisk.metrics, 'final_score').map((metric) => {
    const key = String(firstMeaningfulValue(metric?.key, metric?.risk_key, metric?.riskKey) ?? '').trim();
    const currentScore = currentByKey[key]?.finalScore;
    const proposedScore = firstCalculationValue(metric?.final_score, metric?.finalScore, metric?.score);
    const currentNumber = numberOrNull(currentScore);
    const proposedNumber = numberOrNull(proposedScore);
    return {
      key,
      label: compactTraceText(firstMeaningfulValue(metric?.label, riskMetricLabel(key)), 80) || key,
      currentScore,
      proposedScore,
      delta: currentNumber === null || proposedNumber === null ? null : proposedNumber - currentNumber,
    };
  }).filter((metric) => metric.key);
  const currentOverall = calculationLog.risk.overall.finalScore;
  const proposedOverallScore = firstCalculationValue(proposedOverall.final_score, proposedOverall.finalScore, proposedOverall.score);
  const currentOverallNumber = numberOrNull(currentOverall);
  const proposedOverallNumber = numberOrNull(proposedOverallScore);
  return {
    status: compactTraceText(proposed.status, 40),
    metrics,
    currentOverall,
    proposedOverall: proposedOverallScore,
    overallDelta: currentOverallNumber === null || proposedOverallNumber === null
      ? null
      : proposedOverallNumber - currentOverallNumber,
  };
}

function renderAdminResearchAppendix(calculationLog) {
  if (!calculationLog.hasLog) return '';
  const rootValidation = asObject(calculationLog.root.validation);
  const qreValidation = asObject(asObject(calculationLog.root.qre).validation);
  const riskValidation = asObject(asObject(calculationLog.root.risk).validation);
  const entries = [
    ['유형 확률합', rootValidation.persona_probability_sum],
    ['QRE 확률합', firstCalculationValue(rootValidation.qre_probability_sum, qreValidation.exact_probability_sum)],
    ['효용 합산', rootValidation.qre_utility_terms_verified],
    ['위험 합산', rootValidation.risk_terms_verified],
    ['종합 합산', rootValidation.overall_terms_verified],
    ['유효 숫자', firstCalculationValue(rootValidation.finite_numbers, riskValidation.all_finite)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  const validationValue = (value) => typeof value === 'boolean'
    ? value ? '통과' : '확인 필요'
    : calculationNumber(value, 4);
  return `
    <section class="research-validation-summary" aria-label="연구 계산 검증 요약">
      <strong>계산 검증</strong>
      <ul>${entries.map(([label, value]) => `<li data-valid="${value === false ? 'false' : 'true'}"><span>${escapeHtml(label)}</span><b>${escapeHtml(validationValue(value))}</b></li>`).join('')}</ul>
    </section>
  `;
}

function renderCalculationBasisLegacy() {
  if (!dom.calculationBasis) return;
  const researchAccess = hasAdminResearchAccess();
  const probabilities = normalizeActorProbabilities(simulationState.actorProbabilities);
  const ranked = Object.entries(probabilities).sort((a, b) => Number(b[1]) - Number(a[1]));
  const confidenceValue = numberOrNull(simulationState.actorConfidence);
  const confidence = confidenceValue === null ? null : clampMetric(confidenceValue * 100);
  const topMargin = ranked.length > 1 ? (Number(ranked[0][1]) - Number(ranked[1][1])) * 100 : null;
  const basisInputs = [
    ['주장 유형', simulationState.claimType],
    ['정보 상태', simulationState.evidenceState],
    ['압박 상태', simulationState.pressureState],
    ['규칙 제약', simulationState.ruleConstraint],
  ].filter(([, value]) => isUsefulBasisValue(value)).map(([label, value]) => [label, basisValueText(value)]);
  const safeguards = [
    ['사실·기록 확인', policyFlagValue(simulationState.policySafeguards, 'evidence_required', 'evidenceRequired')],
    ['관리자 승인', policyFlagValue(simulationState.policySafeguards, 'approval_required', 'approvalRequired')],
    ['적용 기준', policyFlagValue(simulationState.policySafeguards, 'threshold_defined', 'thresholdDefined')],
    ['처리 기한', policyFlagValue(simulationState.policySafeguards, 'deadline_defined', 'deadlineDefined')],
    ['관리자 공유', policyFlagValue(simulationState.policySafeguards, 'handoff_defined', 'handoffDefined')],
    ['압박·사실 분리', policyFlagValue(simulationState.policySafeguards, 'pressure_separated', 'pressureSeparated')],
    ['개인정보 보호', policyFlagValue(simulationState.policySafeguards, 'privacy_guard', 'privacyGuard')],
  ];
  const calculationLog = buildCalculationLogView();
  const sourceLabels = {
    server_overall: '서버가 계산한 종합 위험',
    server_deterministic_scoring: '서버 고정식으로 계산',
    server_deterministic_audit_log: '서버 공개 계산 장부로 계산',
    policy_balance: '서버 대응 기준 균형 점수에서 환산',
    weighted_fallback: '화면 임시 계산 · 서버 계산 로그 아님',
  };
  let sourceLabel = sourceLabels[simulationState.overallRiskSource]
    || sanitizeProductLanguage(simulationState.overallRiskSource)
    || '계산 출처가 응답에 포함되지 않음';
  if (!researchAccess) sourceLabel = '선생님의 기록과 학교 기준을 함께 살펴본 결과';
  if (researchAccess && calculationLog.risk.overall.terms.length) {
    sourceLabel = `${calculationLog.risk.overall.method || '서버 관리자 계산 장부'} · ${calculationNumber(calculationLog.risk.overall.rawScore)} → ${calculationNumber(calculationLog.risk.overall.finalScore)}`;
  }
  const lambda = normalizeQreLambda(simulationState.qreLambda);
  const trace = buildDecisionTrace();
  const traceSteps = trace.steps ?? [];
  const actorIsClose = ranked.length > 1 && Number(ranked[0][1]) - Number(ranked[1][1]) < ACTOR_HOLD_MARGIN;
  const selectedActor = actorIsClose ? '판단 보류' : normalizeActorType(simulationState.actorType) || ranked[0]?.[0] || '판단 보류';
  const selectedActorFriendly = {
    정당형: '근거를 중심으로 말하는 반응',
    오해형: '설명이 먼저 필요한 반응',
    감정형: '감정 확인을 중요하게 여기는 반응',
    기회주의형: '예외 가능성을 계속 살피는 반응',
    적대형: '압박이 커질 수 있는 반응',
    '판단 보류': '한 가지 반응으로 보기 어려워요',
  }[selectedActor] || '반응 흐름 확인 필요';
  const selectedActorProbability = ranked.find(([type]) => type === selectedActor)?.[1] ?? null;
  const runnerUp = ranked[1];
  const allRiskMetrics = riskMetricRows();
  const metrics = allRiskMetrics.filter((item) => item.available);
  const highestRisk = [...metrics].sort((a, b) => b.value - a.value)[0];
  const traceStatus = trace.source === 'server'
    ? `서버가 반환한 구조화 근거 ${traceSteps.length}개${trace.traceVersion ? ` · ${trace.traceVersion}` : ''}`
    : '현재 응답의 기록 문구와 대응 안전장치만 연결한 부분 근거';
  const qreLabel = lambda === 0.5
    ? '요구 방식이 자주 바뀔 수 있음'
    : lambda === 1.5
      ? '요구가 비교적 일정한 편'
      : lambda === 3
        ? '같은 요구를 매우 일관되게 반복'
        : '일관성 값 확인 필요';
  const overallRisk = simulationState.hasOverallRiskData ? criticalRiskScore() : null;
  const uniqueStageValues = (values, limit = 2) => [...new Set(values.map((value) => compactTraceText(value, 90)).filter(Boolean))].slice(0, limit);
  const situationTraceSteps = traceSteps.filter((step) => !/정책|대응\s*기준/.test(decisionTraceSourceLabel(step.source)));
  const policyTraceSteps = traceSteps.filter((step) => /정책|대응\s*기준/.test(decisionTraceSourceLabel(step.source)));
  const situationStageValues = uniqueStageValues([
    ...basisInputs.filter(([label]) => label !== '규칙 제약').map(([label, value]) => `${label} · ${basisValueText(value)}`),
    ...situationTraceSteps.map((step) => step.evidence),
  ]);
  const missingSafeguardLabels = safeguards.filter(([, value]) => value === false).map(([label]) => label);
  const coveredSafeguardLabels = safeguards.filter(([, value]) => value === true).map(([label]) => label);
  const policyStageValues = uniqueStageValues([
    ...policyTraceSteps.map((step) => step.evidence),
    missingSafeguardLabels.length ? `${missingSafeguardLabels.slice(0, 3).join('·')} 기준 없음` : '',
    simulationState.vulnerabilities?.[0],
    coveredSafeguardLabels.length ? `${coveredSafeguardLabels.slice(0, 3).join('·')} 기준 확인` : '',
    simulationState.policySummary,
  ], 1);
  const personaStep = traceSteps.find((step) => /persona|유형|감정형|오해형|정당형|기회주의형|적대형/.test(`${step.target} ${step.effect}`));
  const qreStep = traceSteps.find((step) => /qre|반복|일관성/i.test(`${step.target} ${step.effect}`));
  const personaBasis = personaStep
    ? `${compactTraceText(personaStep.evidence, 48)} → ${compactTraceText(personaStep.interpretation, 62)}`
    : ranked.length ? '5가지 유형의 확률을 비교한 결과' : '유형별 확률 근거가 제공되지 않음';
  const qreBasis = qreStep
    ? `${compactTraceText(qreStep.evidence, 48)} → ${compactTraceText(qreStep.interpretation, 62)}`
    : lambda === null ? 'QRE 계산값이 제공되지 않음' : '서버가 반환한 요구 선택 일관성 값';
  const teacherPersonaBasis = `분석 유형 · ${selectedActor}${selectedActorProbability === null ? '' : ` · 가능성 ${formatBasisPercent(Number(selectedActorProbability) * 100)}%`}`;
  const teacherQreBasis = '같은 요구가 얼마나 꾸준히 이어질지 기록을 바탕으로 살펴본 값이에요.';
  const highestRiskBasis = highestRisk
    ? compactTraceText(sanitizeProductLanguage(highestRisk.help), 105)
    : '확인된 위험 점수가 없어 계산 결과를 연결하지 않음';
  const researchFeatures = adminResearchCoreFeatures(calculationLog);
  const researchFeatureByKey = adminResearchFeatureMap(calculationLog);
  const researchBridgeFeatures = ['actor_strategic', 'qre_pressure']
    .map((key) => researchFeatureByKey[key])
    .filter(Boolean);
  const researchPersonaRanked = calculationLog.persona.candidates
    .filter((candidate) => adminResearchProbabilityPoints(candidate.probability) !== null)
    .sort((a, b) => adminResearchProbabilityPoints(b.probability) - adminResearchProbabilityPoints(a.probability));
  const researchPersonaMargin = researchPersonaRanked.length > 1
    ? adminResearchProbabilityPoints(researchPersonaRanked[0].probability) - adminResearchProbabilityPoints(researchPersonaRanked[1].probability)
    : null;
  const researchQreTopAction = calculationLog.qre.actions
    .filter((action) => action.eligible !== false && adminResearchProbabilityPoints(action.probability) !== null)
    .sort((a, b) => adminResearchProbabilityPoints(b.probability) - adminResearchProbabilityPoints(a.probability))[0];
  const policyComparison = buildAdminPolicyComparison(calculationLog);
  const policyComparisonHighlights = [...policyComparison.metrics]
    .filter((metric) => metric.delta !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
  const calculationRun = asObject(calculationLog.root.run);
  const researchModelAlias = compactTraceText(firstMeaningfulValue(calculationRun.model_alias, calculationRun.modelAlias), 80);
  const scoreAndWeightVersions = [calculationLog.run.scoreVersion, calculationLog.run.weightsVersion].filter(Boolean).join(' · ');
  const calculationRunMeta = [
    ['계산 ID', calculationLog.run.id],
    ['모델', researchModelAlias],
    ['분석 버전', calculationLog.run.engineVersion],
    ['점수·가중치', scoreAndWeightVersions],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  const calculationPersonaQreStatus = calculationLog.persona.status === 'complete' && calculationLog.qre.status === 'complete'
    ? 'complete'
    : calculationLog.persona.status !== 'missing' || calculationLog.qre.status !== 'missing'
      ? 'partial'
      : 'missing';
  const calculationFlowStatus = researchAccess
    ? calculationLog.hasLog
      ? `입력 ${calculationStageLabel(calculationLog.input.status)} · 유형·QRE ${calculationStageLabel(calculationPersonaQreStatus)} · 위험 ${calculationStageLabel(calculationLog.risk.status)}`
      : `${traceStatus} · 이 기록의 관리자 계산 장부는 미제공`
    : '기록 확인 · 반응 흐름 살펴보기 · 학교 대응 위험 6가지 계산';

  dom.calculationBasis.innerHTML = `
    <section class="engine-decision-flow" aria-label="학교 대응 위험 분석 3단계">
      <div class="engine-flow-grid" role="list">
        <section class="engine-flow-stage" role="listitem">
          <header class="engine-stage-head"><b>01</b><div><span>기록 확인</span><h4>선생님의 기록·학교 기준</h4></div></header>
          <p class="engine-stage-description">기록 속 학부모 요구와 학교에서 따르는 대응 기준을 나누어 봐요.</p>
          <div class="engine-stage-results">
            <div><span>상황</span><strong>${escapeHtml(sanitizeProductLanguage(situationStageValues.join(' · ') || '상황 기록이 입력됨'))}</strong></div>
            <div><span>대응 기준</span><strong>${escapeHtml(sanitizeProductLanguage(policyStageValues[0] || (simulationState.verifiedPolicyText ? '현재 대응 기준이 입력됨' : '대응 기준 입력 확인 필요')))}</strong></div>
          </div>
        </section>
        <div class="engine-flow-link" aria-hidden="true"><span>반응 살펴보기</span><i>→</i></div>
        <section class="engine-flow-stage is-core" role="listitem">
          <header class="engine-stage-head"><b>02</b><div><span>반응 흐름</span><h4>예상되는 요구 흐름</h4></div></header>
          <p class="engine-stage-description">어떤 요구가 얼마나 꾸준히 이어질지 QRE로 살펴봐요.</p>
          <div class="engine-stage-results">
            <div><span>기록에서 보인 반응</span><strong>${escapeHtml(researchAccess ? selectedActor : selectedActorFriendly)}${researchAccess && selectedActorProbability !== null ? `<b>${formatBasisPercent(Number(selectedActorProbability) * 100)}%</b>` : ''}</strong><small>${escapeHtml(sanitizeProductLanguage(researchAccess ? personaBasis : teacherPersonaBasis))}${researchAccess && runnerUp && topMargin !== null ? ` · 1·2위 차이 ${formatBasisPercent(topMargin)}%p` : ''}</small></div>
            <div><span>요구가 이어지는 정도</span><strong>${escapeHtml(qreLabel)}<b>${lambda === null ? 'QRE —' : `QRE ${lambda.toFixed(1)}`}</b></strong><small>${escapeHtml(sanitizeProductLanguage(researchAccess ? qreBasis : teacherQreBasis))}</small></div>
          </div>
        </section>
        <div class="engine-flow-link" aria-hidden="true"><span>위험 살펴보기</span><i>→</i></div>
        <section class="engine-flow-stage" role="listitem">
          <header class="engine-stage-head"><b>03</b><div><span>위험도</span><h4>학교 대응 위험 6가지</h4></div></header>
          <p class="engine-stage-description">이 반응에 현재 대응 기준을 적용했을 때 조심할 점을 살펴봐요.</p>
          <div class="engine-stage-results">
            <div><span>전체 위험도</span><strong>${overallRisk === null ? '확인 필요' : `${overallRisk}<b>/100 · ${metricStatusLabel(overallRisk)}</b>`}</strong><small>${escapeHtml(sourceLabel)}</small></div>
            <div><span>가장 높은 위험</span><strong>${highestRisk ? `${escapeHtml(highestRisk.label)}<b>${highestRisk.value}점</b>` : '점수 확인 필요'}</strong><small>${escapeHtml(highestRiskBasis)}</small></div>
          </div>
        </section>
      </div>
      <p class="engine-flow-status"><span>${researchAccess ? calculationLog.hasLog ? 'ADMIN 계산 장부' : 'ADMIN 부분 기록' : '판단 순서'}</span>${escapeHtml(calculationFlowStatus)} · 기록 → 반응 흐름 → 위험도의 순서로 살펴봤어요.</p>
    </section>

    ${researchAccess ? `
    <aside class="admin-research-panel">
    <details class="calculation-spec" open>
      <summary><span>관리자 연구 계산 장부</span><small>ADMIN · 핵심값 3단계</small></summary>
      <section class="calculation-log-header" data-status="${calculationLog.hasLog ? calculationLog.status : 'missing'}">
        <div><span>${calculationLog.hasLog ? '핵심 연구 장부' : '계산 장부 미제공'}</span><strong>${calculationLog.hasLog ? '입력에서 위험 점수까지, 계산에 영향 준 값만 남겼습니다.' : '현재 기록에는 관리자용 계산값이 없습니다.'}</strong><p>${calculationLog.hasLog ? '전체 원시·중간값은 보호된 서버 로그에 그대로 보존됩니다.' : '관리자 권한으로 새 분석을 실행하면 3단계 핵심값이 표시됩니다.'}</p></div>
        ${calculationRunMeta.length ? `<dl>${calculationRunMeta.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(calculationValue(value))}</dd></div>`).join('')}</dl>` : ''}
      </section>
      <ol class="research-three-step calculation-ledger" aria-label="관리자 서버 계산 장부 3단계">
        <li>
          <header class="research-step-head"><b>01</b><div><span>상황·대응 기준 입력</span><h4>핵심 입력 변수</h4><p>위험 계산에 직접 쓰인 상황·대응 기준 값만 봅니다.</p></div><i data-status="${calculationLog.input.status}">${calculationStageLabel(calculationLog.input.status)}</i></header>
          <div class="research-step-body">
            ${researchFeatures.length ? `<div class="research-compact-table-wrap"><table class="research-compact-table research-input-table"><thead><tr><th>핵심 변수</th><th>계산값</th><th>판단 근거</th></tr></thead><tbody>${researchFeatures.map((feature) => `<tr data-missing="${feature.missing}"><th><span>${feature.key.startsWith('policy_') ? '대응 기준' : feature.key.startsWith('response_') ? '대응' : '상황'}</span><strong>${escapeHtml(sanitizeProductLanguage(ADMIN_RESEARCH_FEATURE_LABELS[feature.key] || feature.label))}</strong><code>${escapeHtml(feature.key || '—')}</code></th><td><b>${escapeHtml(calculationValue(feature.encodedValue))}</b></td><td><p>${escapeHtml(sanitizeProductLanguage(adminResearchFeatureEvidence(feature)))}</p>${feature.source ? `<small>${escapeHtml(adminResearchSourceLabel(feature.source))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="calculation-log-empty"><strong>핵심 입력값이 없습니다.</strong><p>이 기록에는 서버 입력 벡터가 저장되지 않았습니다.</p></div>'}
          </div>
        </li>
        <li>
          <header class="research-step-head"><b>02</b><div><span>학부모 반응 모델</span><h4>유형 확률·QRE</h4><p>유형별 가능성과 행동별 효용·확률을 함께 비교합니다.</p></div><i data-status="${calculationPersonaQreStatus}">${calculationStageLabel(calculationPersonaQreStatus)}</i></header>
          <div class="research-step-body">
            <div class="research-compact-columns">
              <section class="research-block">
                <div class="research-table-heading"><h5>유형 확률</h5><span>${calculationLog.persona.candidates.length}개 유형</span></div>
                ${calculationLog.persona.candidates.length ? `<div class="research-compact-table-wrap"><table class="research-compact-table research-persona-table"><thead><tr><th>유형</th><th>모델 P</th><th>최종 P</th></tr></thead><tbody>${calculationLog.persona.candidates.map((candidate) => `<tr data-selected="${candidate.selected}"><th>${escapeHtml(candidate.type)}${candidate.selected ? '<span>선택</span>' : ''}</th><td>${escapeHtml(calculationProbability(candidate.rawProbability))}</td><td><b>${escapeHtml(calculationProbability(candidate.probability))}</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="calculation-log-empty"><strong>유형 확률이 없습니다.</strong><p>5개 유형의 확률 기록이 필요합니다.</p></div>'}
                <p class="research-inline-summary"><span>선택 <b>${escapeHtml(calculationLog.persona.selectedType || '—')}</b></span><span>신뢰도 <b>${escapeHtml(calculationProbability(calculationLog.persona.confidence))}</b></span><span>1·2위 차이 <b>${researchPersonaMargin === null ? '—' : `${escapeHtml(calculationNumber(researchPersonaMargin, 2))}%p`}</b></span><span>보류 기준 <b>${escapeHtml(calculationProbability(calculationLog.persona.holdMargin))}</b></span></p>
              </section>
              <section class="research-block">
                <div class="research-table-heading"><h5>행동 효용·확률</h5><span>λ ${escapeHtml(calculationValue(calculationLog.qre.lambda))}</span></div>
                ${calculationLog.qre.actions.length ? `<div class="research-compact-table-wrap"><table class="research-compact-table research-qre-table"><thead><tr><th>행동</th><th>효용 U</th><th>확률 P</th></tr></thead><tbody>${calculationLog.qre.actions.map((action) => `<tr data-highlight="${action.selected || action === researchQreTopAction}" data-eligible="${action.eligible !== false}"><th>${escapeHtml(sanitizeProductLanguage(action.name))}${action.selected ? '<span>선택</span>' : action === researchQreTopAction ? '<span>최고 확률</span>' : ''}</th><td>${escapeHtml(calculationValue(action.utility))}</td><td><b>${escapeHtml(calculationProbability(action.probability))}</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="calculation-log-empty"><strong>행동별 효용·확률이 없습니다.</strong><p>QRE 행동 후보의 U와 P가 필요합니다.</p></div>'}
                <p class="research-inline-summary"><span>후보 <b>${calculationLog.qre.actions.length}개</b></span>${researchBridgeFeatures.map((feature) => `<span>${escapeHtml(ADMIN_RESEARCH_FEATURE_LABELS[feature.key] || feature.label)} <b>${escapeHtml(calculationValue(feature.encodedValue))}</b></span>`).join('')}</p>
              </section>
            </div>
          </div>
        </li>
        <li>
          <header class="research-step-head"><b>03</b><div><span>학교 대응 위험 계산</span><h4>6가지 위험·기여도</h4><p>점수와 종합 위험을 실제로 끌어올린 요인을 봅니다.</p></div><i data-status="${calculationLog.risk.status}">${calculationStageLabel(calculationLog.risk.status)}</i></header>
          <div class="research-step-body">
            ${calculationLog.risk.metrics.length ? `<div class="research-compact-table-wrap"><table class="research-compact-table research-risk-table"><thead><tr><th>위험</th><th>점수</th><th>가중치</th><th>종합 기여</th><th>주요 원인</th></tr></thead><tbody>${calculationLog.risk.metrics.map((metric) => { const topTerms = adminResearchTopTerms(metric.terms); return `<tr><th>${escapeHtml(sanitizeProductLanguage(metric.label))}</th><td><b>${escapeHtml(calculationValue(metric.finalScore))}</b></td><td>${escapeHtml(calculationValue(metric.overallWeight))}</td><td>${escapeHtml(calculationValue(metric.overallContribution))}</td><td>${topTerms.length ? topTerms.map((term) => `<span>${escapeHtml(sanitizeProductLanguage(term.name))} <b>${escapeHtml(adminResearchSignedNumber(term.contribution))}</b></span>`).join('') : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="calculation-log-empty"><strong>위험별 기여 계산이 없습니다.</strong><p>6개 위험의 점수와 종합 기여값이 필요합니다.</p></div>'}
            <section class="research-overall-summary">
              <div><span>종합 위험</span><strong>${escapeHtml(calculationValue(calculationLog.risk.overall.finalScore))}<small>/100</small></strong></div>
              <p>Σ(위험 점수 × 가중치) = <b>${escapeHtml(calculationValue(calculationLog.risk.overall.rawScore))}</b> → ${escapeHtml(calculationValue(calculationLog.risk.overall.finalScore))}</p>
            </section>
            ${policyComparison.metrics.length ? `<section class="research-policy-comparison"><header><div><span>보완 기준 비교</span><h5>변화가 큰 위험 ${policyComparisonHighlights.length}개</h5></div><small>${escapeHtml(policyComparison.status || '모의 계산')}</small></header><div class="research-policy-total"><span>종합 위험</span><b>${escapeHtml(calculationValue(policyComparison.currentOverall))}</b><i>→</i><strong>${escapeHtml(calculationValue(policyComparison.proposedOverall))}</strong><em data-delta="${policyComparison.overallDelta === null ? 'none' : policyComparison.overallDelta < 0 ? 'down' : policyComparison.overallDelta > 0 ? 'up' : 'same'}">${policyComparison.overallDelta === null ? '—' : adminResearchSignedNumber(policyComparison.overallDelta)}</em></div><ul>${policyComparisonHighlights.map((metric) => `<li><span>${escapeHtml(sanitizeProductLanguage(metric.label))}</span><b>${escapeHtml(calculationValue(metric.currentScore))} → ${escapeHtml(calculationValue(metric.proposedScore))}</b><em data-delta="${metric.delta < 0 ? 'down' : metric.delta > 0 ? 'up' : 'same'}">${escapeHtml(adminResearchSignedNumber(metric.delta))}</em></li>`).join('')}</ul></section>` : ''}
          </div>
        </li>
      </ol>
      ${renderAdminResearchAppendix(calculationLog)}
      ${calculationLog.limitations.length ? `<p class="calculation-log-limitations"><span>연구 유의</span>${escapeHtml(compactTraceText(calculationLog.limitations[0], 200))}</p>` : ''}
    </details>
    <p class="basis-disclaimer">화면에서 생략한 원시 JSON과 중간 계산값은 보호된 서버 원본 로그에 그대로 남습니다.</p>
    </aside>
    ` : '<p class="admin-access-note"><span>간단히 보기</span>세부 계산값은 연구 계정에서만 보여요.</p>'}
  `;
}

function renderRecordSource() {
  const policy = String(simulationState.policyDocument || '').trim();
  const memo = String(simulationState.incidentConditions || '').trim();
  const recordDate = simulationState.recordDate || (activeConversation ? conversationDateKey(activeConversation) : selectedCalendarDate);
  const todayKey = toDateKey(new Date());

  if (dom.todayLabel) {
    dom.todayLabel.textContent = recordDate && recordDate !== todayKey
      ? `${formatCalendarDate(recordDate)} 학교 기록`
      : '오늘의 학교 기록';
  }
  if (!dom.recordSourceCard) return;

  dom.recordSourceCard.hidden = !policy && !memo;
  if (dom.recordSourceDate) dom.recordSourceDate.textContent = recordDate ? formatCalendarDate(recordDate) : '';
  if (dom.recordSourcePolicy) dom.recordSourcePolicy.textContent = policy || '입력된 대응 기준이 없습니다.';
  if (dom.recordSourceMemo) dom.recordSourceMemo.textContent = memo || '입력된 상황 메모가 없습니다.';
}

function renderPolicyAssessmentLegacy() {
  if (!dom.policyAssessment) return;
  const verifiedPolicy = String(simulationState.verifiedPolicyText || '').trim();
  const strengths = Array.isArray(simulationState.policyStrengths) ? simulationState.policyStrengths : [];
  const gaps = Array.isArray(simulationState.vulnerabilities) ? simulationState.vulnerabilities : [];
  const strengthText = strengths.length
    ? strengths.slice(0, 2).map((item) => sanitizeProductLanguage(item)).join(' · ')
    : '현재 기록에서는 뚜렷하게 확인된 부분이 없습니다.';
  const gapText = gaps.length
    ? gaps.slice(0, 2).map((item) => sanitizeProductLanguage(item)).join(' · ')
    : '지금 확인된 큰 빠진 부분은 없습니다.';

  dom.policyAssessment.innerHTML = `
    <section class="policy-diagnosis-card" data-status="${verifiedPolicy ? 'provided' : 'missing'}">
      <span>한눈에 보기</span>
      <p>${escapeHtml(sanitizeProductLanguage(simulationState.policySummary || '학교 대응 기준에서 잘 갖춰진 부분과 빠진 부분을 살펴봤어요.'))}</p>
    </section>
    <div class="policy-key-points">
      <div><span>잘 갖춰진 부분</span><p>${escapeHtml(strengthText)}</p></div>
      <div><span>먼저 보완할 부분</span><p>${escapeHtml(gapText)}</p></div>
    </div>
  `;
}

function renderPersonaAssessmentLegacy() {
  if (!dom.personaAssessment) return;
  const probabilities = normalizeActorProbabilities(simulationState.actorProbabilities);
  const ranked = Object.entries(probabilities).sort((a, b) => Number(b[1]) - Number(a[1]));
  const isCloseCall = ranked.length > 1 && Number(ranked[0][1]) - Number(ranked[1][1]) < ACTOR_HOLD_MARGIN;
  const actorType = isCloseCall
    ? '판단 보류'
    : ACTOR_TYPES.includes(simulationState.actorType)
    ? simulationState.actorType
    : ranked[0]?.[0] || '판단 보류';
  const actorMeta = {
    정당형: { label: '근거 중심 반응', description: '확인 가능한 기록과 해결 절차를 중심으로 반응할 가능성이 큽니다.' },
    오해형: { label: '설명이 먼저 필요한 반응', description: '사실이나 학교 기준을 다르게 이해해 추가 설명이 필요할 가능성이 큽니다.' },
    감정형: { label: '감정 확인을 중시하는 반응', description: '결과뿐 아니라 감정이 받아들여졌다는 확인을 중요하게 여길 가능성이 큽니다.' },
    기회주의형: { label: '예외 가능성을 살피는 반응', description: '예외나 더 큰 조치가 가능한지 요구를 이어갈 가능성이 있습니다.' },
    적대형: { label: '압박 효과를 중시하는 반응', description: '책임 인정이나 공개 압박처럼 갈등이 커질 수 있는 요구를 이어갈 가능성이 있습니다.' },
    '판단 보류': { label: '유형 판단 보류', description: '현재 기록만으로는 한 가지 반응 유형을 뚜렷하게 고르기 어렵습니다.' },
  }[actorType];
  const lambda = normalizeQreLambda(simulationState.qreLambda);
  const qreMeta = lambda === 0.5
    ? { label: '반응 변화가 큰 편', description: '상황에 따라 여러 요구 방식으로 바뀔 가능성이 큽니다.' }
    : lambda === 3
      ? { label: '같은 요구를 반복할 가능성이 높음', description: '효과가 있다고 판단한 요구를 매우 일관되게 이어갈 가능성이 큽니다.' }
      : lambda === 1.5
        ? { label: '요구가 비교적 일정한 편', description: '효과가 있다고 느끼는 요구를 비교적 꾸준히 이어갈 가능성이 있습니다.' }
        : { label: 'QRE 값 확인 필요', description: '이번 분석에서 QRE 값을 확인하지 못했습니다.' };
  const personaDescription = actorType !== '판단 보류' && simulationState.personaSummary
    ? sanitizeProductLanguage(simulationState.personaSummary)
    : actorMeta.description;

  dom.personaAssessment.innerHTML = `
    <div class="persona-summary-grid">
      <section class="persona-type-card">
        <span>기록에서 보인 반응 경향</span>
        <strong>${escapeHtml(actorMeta.label)}<small>분석 유형 · ${escapeHtml(actorType)}</small></strong>
        <p>${escapeHtml(personaDescription)}</p>
      </section>
      <section class="qre-summary-card">
        <span>요구가 이어지는 정도 <b>QRE ${lambda === null ? '—' : lambda.toFixed(1)}</b></span>
        <strong>${escapeHtml(qreMeta.label)}</strong>
        <p>${escapeHtml(qreMeta.description)}</p>
      </section>
    </div>
    <p class="persona-disclaimer">QRE는 같은 요구가 얼마나 꾸준히 이어질지 계산한 값이에요. 사람의 성격을 판단하는 점수는 아닙니다.</p>
  `;
}

function renderSimulationHudLegacy() {
  if (!dom.simulationHud) return;
  if (!String(simulationState.verifiedPolicyText || '').trim()) {
    dom.simulationHud.innerHTML = `
      <section class="risk-unavailable-card">
        <span>아직 위험도를 보여드릴 수 없어요</span>
        <p>학교 대응 기준에 실제로 적용 중인 문장을 붙여 넣고 다시 점검해 주세요.</p>
      </section>
    `;
    return;
  }
  const summary = policyDecisionSummary();
  const metrics = riskMetricRows();
  const availableMetrics = metrics.filter((item) => item.available);
  const overallRisk = simulationState.hasOverallRiskData ? criticalRiskScore() : null;
  const headline = simulationState.analysisHeadline || summary.title;
  const highestRisk = [...availableMetrics].sort((a, b) => b.value - a.value)[0];
  const recommendation = compactText(
    sanitizeProductLanguage(
      simulationState.recommendation
      || highestRisk?.help
      || '기록 확인, 관리자 공유, 답변 기한이 대응 기준에 분명하게 적혀 있는지 살펴보세요.'
    ),
    650
  );
  const alternativePolicy = compactText(sanitizeProductLanguage(simulationState.alternativePolicy || ''), 850);
  dom.simulationHud.innerHTML = `
    <div class="compact-risk-summary" data-tone="${overallRisk === null ? 'neutral' : metricTone(overallRisk)}">
      <div class="compact-overall-score">
        <span>전체 위험도</span>
        <strong>${overallRisk === null ? '—' : overallRisk}${overallRisk === null ? '' : '<small>/100</small>'}</strong>
        <b>${overallRisk === null ? '확인 필요' : metricStatusLabel(overallRisk)}</b>
      </div>
      <div>
        <span>선생님의 기록을 바탕으로 한 참고 결과</span>
        <h4>${escapeHtml(sanitizeProductLanguage(headline))}</h4>
        <p>${highestRisk ? `가장 조심할 부분은 ‘${escapeHtml(highestRisk.label)}’이며 ${escapeHtml(highestRisk.value)}점이에요.` : '위험 점수를 확인하지 못했어요.'}</p>
      </div>
    </div>
    <section class="risk-coaching-card">
      <header><span>루지코지 쉬운 코칭</span><b>대응 기준 보완</b></header>
      <h4>${escapeHtml(summary.title)}</h4>
      <p>${escapeHtml(recommendation)}</p>
      ${alternativePolicy ? `<div><span>기준을 이렇게 보완해 보세요</span><strong>${escapeHtml(alternativePolicy)}</strong></div>` : ''}
    </section>
    <section aria-label="학교 대응 위험 6가지 점수">
      <ul class="compact-risk-grid">
        ${metrics.map((item) => `
          <li data-tone="${item.available ? metricTone(item.value) : 'neutral'}" data-available="${item.available}">
            <div><span>${escapeHtml(item.label)}</span><strong>${item.available ? escapeHtml(item.value) : '—'}</strong></div>
            <i${item.available ? ` role="progressbar" aria-label="${escapeHtml(item.label)}" aria-describedby="risk-reason-${escapeHtml(item.key)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(item.value)}" aria-valuetext="${metricStatusLabel(item.value)} ${escapeHtml(item.value)}점" style="--value: ${escapeHtml(item.value)}%"` : ' aria-hidden="true"'}></i>
            <small id="risk-reason-${escapeHtml(item.key)}"><b>${item.reasonSource === 'analysis' ? '이 기록에서 본 근거' : '이 점수의 뜻'}</b>${escapeHtml(sanitizeProductLanguage(item.help))}</small>
          </li>
        `).join('')}
      </ul>
      ${availableMetrics.length < metrics.length ? '<p class="risk-missing-note">아직 확인하지 못한 항목은 —로 표시했어요.</p>' : ''}
    </section>
  `;
}

const DIRECT_SAFEGUARD_VIEW = [
  { key: 'fact_record_check', label: '기록부터 확인하는가', legacy: ['evidence_required', 'evidenceRequired'] },
  { key: 'scope_threshold', label: '언제 적용하는지 정해져 있는가', legacy: ['threshold_defined', 'thresholdDefined'] },
  { key: 'response_deadline', label: '언제까지 답할지 정해져 있는가', legacy: ['deadline_defined', 'deadlineDefined'] },
  { key: 'shared_decision', label: '중요한 결정을 혼자 하지 않는가', legacy: ['approval_required', 'approvalRequired', 'handoff_defined', 'handoffDefined'] },
  { key: 'pressure_fact_separation', label: '압박과 사실 판단을 나누는가', legacy: ['pressure_separated', 'pressureSeparated'] },
  { key: 'privacy_guard', label: '개인정보를 지키는가', legacy: ['privacy_guard', 'privacyGuard'] },
];

function directFactsForView() {
  const facts = Array.isArray(simulationState.facts) ? simulationState.facts : [];
  if (facts.length) {
    return facts.slice(0, 8).map((item, index) => ({
      id: String(item?.id || `fact-${index + 1}`),
      category: String(item?.category || '사건'),
      text: compactText(firstMeaningfulValue(item?.text, item?.label, item?.source_excerpt, item?.sourceExcerpt), 280),
      certainty: item?.certainty === 'confirmed' ? 'confirmed' : 'unclear',
      excerpt: compactText(firstMeaningfulValue(item?.source_excerpt, item?.sourceExcerpt), 180),
    })).filter((item) => item.text);
  }
  const memo = compactText(simulationState.incidentConditions, 280);
  return memo ? [{
    id: 'legacy-record',
    category: '상황 기록',
    text: memo,
    certainty: 'unclear',
    excerpt: '',
  }] : [];
}

function directSafeguardsForView() {
  const supplied = Array.isArray(simulationState.safeguards) ? simulationState.safeguards : [];
  if (supplied.length) {
    const byKey = Object.fromEntries(supplied.map((item) => [String(item?.key || ''), item]));
    return DIRECT_SAFEGUARD_VIEW.map((definition) => {
      const item = byKey[definition.key] || {};
      const numericValue = numberOrNull(item?.value);
      const rawState = String(item?.state || '');
      const state = ['present', 'partial', 'missing'].includes(rawState)
        ? rawState
        : numericValue === null ? 'missing' : numericValue >= 1 ? 'present' : numericValue > 0 ? 'partial' : 'missing';
      return {
        ...definition,
        state,
        evidence: compactText(firstMeaningfulValue(item?.evidence_excerpt, item?.evidenceExcerpt), 180),
      };
    });
  }
  const legacy = asObject(simulationState.policySafeguards);
  return DIRECT_SAFEGUARD_VIEW.map((definition) => {
    const values = definition.legacy
      .filter((key) => Object.prototype.hasOwnProperty.call(legacy, key))
      .map((key) => Boolean(legacy[key]));
    const state = definition.key === 'shared_decision' && values.length > 1
      ? values.every(Boolean) ? 'present' : values.some(Boolean) ? 'partial' : 'missing'
      : values.some(Boolean) ? 'present' : 'missing';
    return { ...definition, state, evidence: '' };
  });
}

function directRecommendationsForView() {
  const supplied = Array.isArray(simulationState.recommendedClauses)
    ? simulationState.recommendedClauses
    : [];
  if (supplied.length) {
    return supplied.slice(0, 3).map((item, index) => ({
      id: String(item?.id || `recommendation-${index + 1}`),
      text: compactText(typeof item === 'string' ? item : firstMeaningfulValue(item?.text, item?.clause), 900),
      delta: numberOrNull(item?.expected_risk_delta ?? item?.expectedRiskDelta),
      rationale: compactText(firstMeaningfulValue(item?.rationale, item?.reason), 260),
      linkedRisks: Array.isArray(item?.linked_risks ?? item?.linkedRisks)
        ? (item?.linked_risks ?? item?.linkedRisks).map(String)
        : [],
    })).filter((item) => item.text);
  }
  const legacy = compactText(simulationState.alternativePolicy, 900);
  return legacy ? [{
    id: 'legacy-recommendation',
    text: legacy,
    delta: null,
    rationale: '',
    linkedRisks: [],
  }] : [];
}

function renderPolicyAssessment() {
  if (!dom.policyAssessment) return;
  const facts = directFactsForView();
  const confirmedCount = facts.filter((item) => item.certainty === 'confirmed').length;
  dom.policyAssessment.innerHTML = facts.length ? `
    <div class="direct-fact-summary"><span>점수에 사용한 사실</span><strong>${facts.length}개</strong><small>명확 ${confirmedCount} · 확인 필요 ${facts.length - confirmedCount}</small></div>
    <ol class="direct-fact-list">
      ${facts.map((item) => `
        <li data-certainty="${item.certainty}">
          <span>${escapeHtml(item.category)}</span>
          <p>${escapeHtml(sanitizeProductLanguage(item.text))}</p>
          <small>${item.certainty === 'confirmed' ? '기록에 명확히 적힘' : '추가 확인이 필요함'}</small>
        </li>
      `).join('')}
    </ol>
  ` : `
    <section class="risk-unavailable-card">
      <span>확인한 사실이 아직 없어요</span>
      <p>상황 기록을 저장한 뒤 다시 점검해 주세요.</p>
    </section>
  `;
}

function renderPersonaAssessment() {
  if (!dom.personaAssessment) return;
  const safeguards = directSafeguardsForView();
  const stateLabel = { present: '있음', partial: '일부 있음', missing: '없음' };
  dom.personaAssessment.innerHTML = `
    <ul class="direct-safeguard-grid" aria-label="대응 안전장치 6가지">
      ${safeguards.map((item) => `
        <li data-state="${item.state}">
          <i aria-hidden="true">${item.state === 'present' ? '✓' : item.state === 'partial' ? '△' : '—'}</i>
          <div><strong>${escapeHtml(item.label)}</strong>${item.evidence ? `<small>${escapeHtml(sanitizeProductLanguage(item.evidence))}</small>` : ''}</div>
          <b>${stateLabel[item.state]}</b>
        </li>
      `).join('')}
    </ul>
    <p class="direct-safeguard-note">사람을 분류하지 않고, 선생님이 적은 대응 기준에 이 여섯 장치가 있는지만 확인했어요.</p>
  `;
}

function renderSimulationHud() {
  if (!dom.simulationHud) return;
  const metrics = riskMetricRows();
  const availableMetrics = metrics.filter((item) => item.available);
  const overallRisk = simulationState.hasOverallRiskData ? criticalRiskScore() : null;
  const highestRisk = [...availableMetrics].sort((a, b) => b.value - a.value)[0];
  const biggestGap = simulationState.biggestGap && typeof simulationState.biggestGap === 'object'
    ? simulationState.biggestGap
    : simulationState.vulnerabilities?.length
      ? { label: '먼저 보완할 기준', reason: simulationState.vulnerabilities[0], counterfactual_delta: null }
      : null;
  const gapDelta = numberOrNull(biggestGap?.counterfactual_delta ?? biggestGap?.counterfactualDelta);
  const recommendations = directRecommendationsForView();

  dom.simulationHud.innerHTML = `
    <div class="compact-risk-summary" data-tone="${overallRisk === null ? 'neutral' : metricTone(overallRisk)}">
      <div class="compact-overall-score">
        <span>전체 위험도</span>
        <strong>${overallRisk === null ? '—' : overallRisk}${overallRisk === null ? '' : '<small>/100</small>'}</strong>
        <b>${overallRisk === null ? '확인 필요' : metricStatusLabel(overallRisk)}</b>
      </div>
      <div>
        <span>상황과 대응 기준을 함께 계산한 결과</span>
        <h4>${highestRisk ? `${escapeHtml(highestRisk.label)}이 가장 높아요.` : '위험 점수를 확인하지 못했어요.'}</h4>
        <p>${highestRisk ? `${escapeHtml(highestRisk.value)}점 · ${escapeHtml(sanitizeProductLanguage(highestRisk.help))}` : '상황 기록과 대응 기준을 다시 확인해 주세요.'}</p>
      </div>
    </div>
    <section aria-label="학교 대응 위험 6가지 점수">
      <ul class="compact-risk-grid">
        ${metrics.map((item) => `
          <li data-tone="${item.available ? metricTone(item.value) : 'neutral'}" data-available="${item.available}">
            <div><span>${escapeHtml(item.label)}</span><strong>${item.available ? escapeHtml(item.value) : '—'}</strong></div>
            <i${item.available ? ` role="progressbar" aria-label="${escapeHtml(item.label)}" aria-describedby="risk-reason-${escapeHtml(item.key)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(item.value)}" aria-valuetext="${metricStatusLabel(item.value)} ${escapeHtml(item.value)}점" style="--value: ${escapeHtml(item.value)}%"` : ' aria-hidden="true"'}></i>
            <small id="risk-reason-${escapeHtml(item.key)}"><b>왜 이 점수인가요?</b>${escapeHtml(sanitizeProductLanguage(item.help))}</small>
          </li>
        `).join('')}
      </ul>
    </section>
    <section class="direct-gap-card" data-tone="${gapDelta !== null && gapDelta >= 10 ? 'warning' : 'neutral'}">
      <header><span>04 · 가장 큰 누락 기준</span>${gapDelta === null ? '' : `<b>보완 시 전체 위험 약 ${Math.abs(gapDelta)}점 감소</b>`}</header>
      <h4>${escapeHtml(sanitizeProductLanguage(biggestGap?.label || '큰 누락 기준을 찾지 못했어요.'))}</h4>
      <p>${escapeHtml(sanitizeProductLanguage(biggestGap?.reason || '현재 대응 기준의 주요 안전장치를 계속 유지해 주세요.'))}</p>
    </section>
    <section class="direct-recommendations">
      <header><span>05 · 검증된 권장 조항</span><small>학교에서 검토할 초안 ${recommendations.length}개</small></header>
      ${recommendations.length ? `<ol>${recommendations.map((item) => `
        <li><span>${String(recommendations.indexOf(item) + 1).padStart(2, '0')}</span><div><p>${escapeHtml(sanitizeProductLanguage(item.text))}</p>${item.rationale ? `<small>${escapeHtml(sanitizeProductLanguage(item.rationale))}</small>` : ''}</div>${item.delta === null ? '' : `<b>−${Math.abs(item.delta)}점 예상</b>`}</li>
      `).join('')}</ol>` : '<p class="direct-empty-copy">현재 기준에서 추가로 권할 조항이 없습니다.</p>'}
      <p class="direct-policy-disclaimer">권장 문장은 서버가 누락 기준과 연결해 고른 검토용 초안이며, 승인된 학교 규정이나 법률 자문은 아닙니다.</p>
    </section>
  `;
}

function renderCalculationBasis() {
  if (!dom.calculationBasis) return;
  const graph = asObject(simulationState.evidenceGraph);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const nodeById = Object.fromEntries(nodes.map((node) => [String(node?.id || ''), node]));
  const facts = directFactsForView();
  const safeguards = directSafeguardsForView();
  const metrics = riskMetricRows().filter((item) => item.available).sort((a, b) => b.value - a.value);
  const recommendations = directRecommendationsForView();
  const biggestGap = simulationState.biggestGap && typeof simulationState.biggestGap === 'object'
    ? simulationState.biggestGap
    : null;
  const graphEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const graphRiskKeyByViewKey = {
    factCheckNeed: 'unverified_response_risk',
    manipulationRisk: 'pressure_judgment_risk',
    overConcessionRisk: 'premature_promise_risk',
    underResponseRisk: 'legitimate_issue_miss_risk',
    handoffNeed: 'solo_handling_risk',
    policyViolationRisk: 'school_procedure_risk',
  };
  const graphPaths = metrics.slice(0, 3).map((metric, index) => {
    const graphRiskKey = graphRiskKeyByViewKey[metric.key] || metric.key;
    const riskNode = nodes.find((node) =>
      node?.type === 'risk' && (
        String(node?.legacy_key || '') === metric.key ||
        String(node?.key || '') === graphRiskKey
      )
    );
    const supportingEdge = riskNode
      ? graphEdges.find((edge) => String(edge?.target) === String(riskNode.id) && /^fact:/.test(String(edge?.source)))
      : null;
    const safeguardEdge = riskNode
      ? graphEdges.find((edge) =>
          String(edge?.target) === String(riskNode.id) &&
          /^safeguard:/.test(String(edge?.source)) &&
          edge?.relation === 'missing_increases'
        )
      : null;
    const factNode = supportingEdge ? nodeById[String(supportingEdge.source)] : null;
    const safeguardNode = safeguardEdge ? nodeById[String(safeguardEdge.source)] : null;
    const fallbackFact = facts[index % Math.max(1, facts.length)];
    const missingSafeguard = safeguardNode
      ? safeguards.find((item) => item.key === safeguardNode.key)
      : safeguards.find((item) => item.state !== 'present') || safeguards[0];
    const linkedRecommendation = recommendations.find((item) =>
      Array.isArray(item.linkedRisks) && item.linkedRisks.includes(graphRiskKey)
    ) || recommendations[index] || recommendations[0];
    return {
      fact: compactText(firstMeaningfulValue(factNode?.label, fallbackFact?.text, '입력한 상황 기록'), 110),
      safeguard: missingSafeguard ? `${missingSafeguard.label} · ${missingSafeguard.state === 'missing' ? '없음' : missingSafeguard.state === 'partial' ? '일부 있음' : '있음'}` : '안전장치 확인',
      risk: `${metric.label} ${metric.value}점`,
      recommendation: compactText(linkedRecommendation?.text || '현재 대응 기준을 유지해 주세요.', 120),
    };
  });
  const calculationLog = asObject(simulationState.calculationLog);
  const isDirectLog = /calculation-log-v2/i.test(String(calculationLog.schema_version ?? calculationLog.schemaVersion ?? ''));
  const validation = asObject(firstMeaningfulValue(calculationLog.validation, graph.validation));

  dom.calculationBasis.innerHTML = `
    <div class="direct-graph-paths" role="list" aria-label="판단 근거 연결">
      ${graphPaths.length ? graphPaths.map((path) => `
        <article role="listitem">
          <div><span>확인한 사실</span><strong>${escapeHtml(sanitizeProductLanguage(path.fact))}</strong></div>
          <i aria-hidden="true">→</i>
          <div><span>대응 기준</span><strong>${escapeHtml(path.safeguard)}</strong></div>
          <i aria-hidden="true">→</i>
          <div><span>위험</span><strong>${escapeHtml(path.risk)}</strong></div>
          <i aria-hidden="true">→</i>
          <div><span>권장 조항</span><strong>${escapeHtml(sanitizeProductLanguage(path.recommendation))}</strong></div>
        </article>
      `).join('') : '<p class="direct-empty-copy">연결 근거를 확인하지 못했어요.</p>'}
    </div>
    <p class="basis-disclaimer">이 그래프는 공개 가능한 입력 단서와 점수 연결만 보여주며, AI의 내부 사고 과정은 표시하지 않습니다.</p>
    ${hasAdminResearchAccess() ? `
      <details class="direct-research-ledger" open>
        <summary><span>관리자 연구 데이터</span><small>${isDirectLog ? '직접 위험 계산 v2' : '부분 기록'}</small></summary>
        <div class="direct-research-summary">
          <span>사실 <b>${facts.length}</b></span>
          <span>안전장치 <b>${safeguards.length}/6</b></span>
          <span>위험 <b>${metrics.length}/6</b></span>
          <span>노드 <b>${nodes.length}</b></span>
          <span>연결 <b>${graphEdges.length}</b></span>
        </div>
        <div class="direct-research-tables">
          <section><h5>안전장치 상태</h5><table><tbody>${safeguards.map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${item.state}</td></tr>`).join('')}</tbody></table></section>
          <section><h5>위험 점수</h5><table><tbody>${metrics.map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${item.value}</td></tr>`).join('')}</tbody></table></section>
        </div>
        <p>${biggestGap ? `가장 큰 누락 · ${escapeHtml(sanitizeProductLanguage(biggestGap.label || biggestGap.reason || '—'))}` : '큰 누락 기준 없음'} · 그래프 참조 ${validation.valid_edge_references === false ? '확인 필요' : '정상'}</p>
      </details>
    ` : '<p class="admin-access-note"><span>간단히 보기</span>공식·특징값·그래프 원시는 연구 계정에서만 보여요.</p>'}
  `;
}

function renderAnalysisPanels() {
  renderRecordSource();
  renderPolicyAssessment();
  renderPersonaAssessment();
  renderSimulationHud();
  renderCalculationBasis();
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
      <span>${formatDate(conversation.saved_at || conversation.created_at)} · 점검 완료</span>
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
    empty.textContent = '위험 점수나 보완할 기준이 어려우면 편하게 물어보세요.';
    dom.messageList.append(empty);
  }

  for (const message of visibleMessages) {
    const item = document.createElement('article');
    item.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
    const role = message.role === 'user' ? '내 질문' : 'AI 추가 설명';
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
      <span class="role">AI가 추가로 확인하고 있어요</span>
      <div class="loading-copy">
        <span>기록 확인 → 위험도 살펴보기 → 쉬운 설명 정리</span>
        <i></i><i></i><i></i>
      </div>
    `;
    dom.messageList.append(loading);
  }

  if (!isSending && analysisRequestCount() >= MAX_ANALYSIS_CYCLES) {
    const limitNote = document.createElement('p');
    limitNote.className = 'chat-limit-note';
    limitNote.textContent = '이 기록에서 사용할 수 있는 추가 질문을 모두 사용했습니다.';
    dom.messageList.append(limitNote);
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
    ? '답변을 정리하고 있어요'
    : maxCycles
      ? '추가 질문을 모두 사용했어요'
      : noCredits
        ? hasAdminResearchAccess() ? '이번 달 분석 요청 한도 도달' : 'AI 이용 포인트 없음'
        : '질문 보내기';

  if (dom.runSimulation) {
    dom.runSimulation.disabled = isSending || !session?.user || noCredits;
    dom.runSimulation.textContent = isSending
      ? '기록을 살펴보고 있어요...'
      : noCredits
        ? '이번 달 AI 이용량을 확인해 주세요'
        : '내 기록 점검하기';
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
  const detailCost = finalReportRequestCost();
  const canRequestDetail =
    session?.user && activeConversation?.id && remainingUsage() >= detailCost && !isRequestingReport && !reportCreated;
  const hasVerifiedPolicy = Boolean(String(simulationState.verifiedPolicyText || '').trim());
  panel.innerHTML = `
    <span class="section-kicker">정리가 끝났어요</span>
    <h2>이 기록의 대응 위험 예측</h2>
    <div class="result-tags">
      ${hasVerifiedPolicy ? `<span>현재 위험도 ${criticalRiskScore()}/100</span>` : '<span>학교 대응 기준 확인 필요</span>'}
      ${hasVerifiedPolicy && simulationState.hasAlternativeRiskData ? `<span>보완하면 예상 위험 ${simulationState.alternativePolicyRisks.overallRisk}/100</span>` : ''}
      ${hasVerifiedPolicy ? `<span>혼자 대응하다 커질 위험 ${simulationState.handoffNeed}/100</span>` : ''}
    </div>
    <p>확인한 사실, 안전장치 6가지와 보완할 기준을 한 번에 정리했어요.</p>
    <div class="result-actions">
      <button class="primary-button" type="button" data-new-simulation>새 기록</button>
      <button class="ghost-button" type="button" data-final-report ${canRequestDetail ? '' : 'disabled'}>
        ${reportCreated ? '자세한 분석을 만들었어요' : isRequestingReport ? '자세한 분석 만드는 중' : hasAdminResearchAccess() ? '자세한 분석 보기 · 1회 호출' : `자세한 분석 보기 · ${detailCost}포인트`}
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
  if (/case analysis|roosycozy_case_analysis|empty required explanation|returned invalid JSON/i.test(message)) {
    return 'AI가 분석 내용을 완성하지 못했습니다. 입력한 내용은 유지되어 있으니 다시 분석해 주세요.';
  }
  if (/timeout|지연|aborted|network/i.test(message)) return '분석이 지연되고 있습니다. 잠시 뒤 다시 시도해 주세요.';
  if (/Failed to send a request|FunctionsHttpError|Edge Function|fetch/i.test(message)) {
    return '점검 결과를 받아오지 못했어요. 잠시 뒤 다시 시도해 주세요.';
  }
  return message || '내용을 정리하는 중 문제가 생겼습니다.';
}


async function invokeReportChat(payload) {
  const result = await withTimeout(
    supabase.functions.invoke('report-chat', { body: payload }),
    105000,
    '기록 점검이 조금 늦어지고 있어요. 잠시 뒤 다시 시도해 주세요.'
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
    invalidateResearchAccess({ clearData: true });
    applyUsageState({ tier: 'unauth', used: 0, limit: 0 });
    return;
  }

  const expectedUserId = session.user.id;

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_my_report_usage'),
      12000,
      '이번 달 AI 사용량을 확인하는 데 시간이 걸리고 있습니다.'
    );
    if (!error && data) {
      if (session?.user?.id !== expectedUserId) return;
      setResearchAccessVerification(data?.tier ?? data?.membership_tier, expectedUserId);
      applyUsageState(data, { minimumUsed });
      lastUsageRefreshAt = Date.now();
      renderAuth();
      renderCalculationBasis();
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
      if (session?.user?.id !== expectedUserId) return;
      const tier = normalizeTier(data?.tier);
      setResearchAccessVerification(tier, expectedUserId);
      applyUsageState({
        tier,
        used: preserveOnError ? Math.max(usageState.used, numberOrNull(minimumUsed) ?? 0) : 0,
        limit: tierInfo(tier).limit,
      });
      lastUsageRefreshAt = Date.now();
      renderAuth();
      renderCalculationBasis();
      return;
    }
  } catch {
    // Preserve the last known quota if Supabase is temporarily slow.
  }

  invalidateResearchAccess();
  if (!preserveOnError) {
    applyUsageState({ tier: 'general', used: 0, limit: tierConfig.general.limit });
  }
  renderAuth();
  renderCalculationBasis();
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

function stripEmbeddedCalculationLogs(message) {
  const metadata = asObject(message?.metadata);
  const cleanedMetadata = { ...metadata };
  delete cleanedMetadata.calculation_log;
  delete cleanedMetadata.calculationLog;

  for (const stateKey of ['simulation_state', 'simulationState', 'game_state', 'gameState', 'analysis_state', 'analysisState']) {
    const state = cleanedMetadata[stateKey];
    if (!state || typeof state !== 'object' || Array.isArray(state)) continue;
    const cleanedState = { ...state };
    delete cleanedState.calculation_log;
    delete cleanedState.calculationLog;
    delete cleanedState.previous_calculation_log;
    delete cleanedState.previousCalculationLog;
    cleanedMetadata[stateKey] = cleanedState;
  }

  return { ...message, metadata: cleanedMetadata };
}

async function hydrateAdminCalculationLogs(sourceMessages) {
  const safeMessages = sourceMessages.map(stripEmbeddedCalculationLogs);
  if (!hasAdminResearchAccess() || !session?.user || !supabase) return safeMessages;

  const expectedUserId = session.user.id;
  const expectedConversationId = activeConversation?.id;
  if (!expectedConversationId) return safeMessages;

  const assistantIds = safeMessages
    .filter((message) => message.role === 'assistant' && message.id)
    .map((message) => message.id)
    .slice(0, 100);
  if (!assistantIds.length) return safeMessages;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('report_admin_calculation_logs')
        .select('message_id, conversation_id, run_id, detail, created_at')
        .eq('user_id', expectedUserId)
        .eq('conversation_id', expectedConversationId)
        .in('message_id', assistantIds),
      12000,
      '관리자 연구 데이터를 불러오는 중 응답이 지연되고 있습니다.'
    );
    if (error) return safeMessages;

    if (
      session?.user?.id !== expectedUserId ||
      activeConversation?.id !== expectedConversationId ||
      !hasAdminResearchAccess()
    ) return safeMessages;

    const detailByMessageId = new Map((data ?? [])
      .filter((row) => {
        if (!row?.message_id || row.conversation_id !== expectedConversationId) return false;
        if (!row.detail || typeof row.detail !== 'object' || Array.isArray(row.detail)) return false;
        const detailRun = asObject(asObject(row.detail).run);
        const detailRunId = String(detailRun.run_id ?? detailRun.runId ?? '').trim();
        return Boolean(detailRunId && detailRunId === String(row.run_id ?? '').trim());
      })
      .map((row) => [row.message_id, row.detail]));

    return safeMessages.map((message) => {
      const detail = detailByMessageId.get(message.id);
      if (!detail) return message;
      return {
        ...message,
        metadata: { ...message.metadata, calculation_log: detail },
      };
    });
  } catch {
    return safeMessages;
  }
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

  const expectedConversationId = activeConversation.id;
  const expectedUserId = session.user.id;
  const hadConfirmedAnalysis = hasAnalysisResult();
  const preservedMessages = hadConfirmedAnalysis ? messages.map(stripEmbeddedCalculationLogs) : null;
  if (!hadConfirmedAnalysis) analysisPhase = 'loading';
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('report_messages')
        .select('id, role, content, metadata, created_at')
        .eq('conversation_id', expectedConversationId)
        .eq('user_id', expectedUserId)
        .order('created_at', { ascending: true })
        .limit(100),
      12000,
      'AI가 정리한 내용을 불러오는 데 시간이 걸리고 있습니다.'
    );
    if (error) throw error;
    if (activeConversation?.id !== expectedConversationId || session?.user?.id !== expectedUserId) return;
    const loadedMessages = await hydrateAdminCalculationLogs(data ?? []);
    if (activeConversation?.id !== expectedConversationId || session?.user?.id !== expectedUserId) return;
    const loadedIsStale = preservedMessages && analysisRequestCount(loadedMessages) < analysisRequestCount(preservedMessages);
    const loadedDroppedTrace = preservedMessages && hasDecisionTraceResult(preservedMessages) && !hasDecisionTraceResult(loadedMessages);
    messages = loadedIsStale || loadedDroppedTrace ? preservedMessages : loadedMessages;
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
  resetSimulationState();
  simulationState.recordDate = selectedCalendarDate;
  simulationState.recordTitle = activeConversation?.title || '';
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
    '[현재 적용 중인 학교 대응 기준]',
    simulationState.policyDocument || '입력하지 않음',
    '',
    '[요청]',
    extraText || (hasAdminResearchAccess()
      ? '학부모 유형이나 QRE를 추정하지 말고 상황 기록과 대응 기준에서 바로 위험을 계산해줘. 확인한 사실, 안전장치 6가지, 위험 6가지, 가장 큰 누락 기준, 검증된 권장 조항 1~3개, 판단 근거 그래프와 재현 가능한 calculation_log를 반환해줘.'
      : '학부모 유형이나 QRE를 추정하지 말고 상황 기록과 대응 기준에서 바로 위험을 계산해줘. 확인한 사실, 안전장치 6가지, 위험 6가지, 가장 큰 누락 기준, 권장 조항 1~3개와 판단 연결 근거를 쉬운 한국어로 정리해줘.'),
  ].join('\n');
  return compactText(request, MAX_POLICY_ANALYSIS_CHARS);
}

async function runPolicySimulation() {
  if (!session?.user) {
    pendingNewSimulation = false;
    setAuthModal(true);
    showToast('로그인하면 기록의 위험도와 코칭을 확인할 수 있어요.', 'error');
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
    showToast('로그인하면 기록의 위험도와 코칭을 확인할 수 있어요.', 'error');
    return;
  }

  if (!supabase) {
    showToast('서비스에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
    return;
  }

  syncSimulationStateFromInputs();

  if (!simulationState.incidentConditions) {
    showToast('무슨 일이 있었는지 먼저 적어 주세요.', 'error');
    dom.incidentConditions?.focus();
    return;
  }

  const requestState = buildApiCompatibleState();
  if (remainingUsage() <= 0) {
    showToast(hasAdminResearchAccess()
      ? '이번 달 관리자 분석 요청 1,000회를 모두 사용했습니다.'
      : '이번 달 AI 이용 포인트를 모두 사용했습니다.', 'error');
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
      clientGuidance: [
        '분석 경로는 evidence_extraction → safeguard_detection → direct_risk_prediction → recommendation 순서로 고정한다.',
        '학부모 유형, 페르소나, QRE, λ, 행동 확률을 새로 추정하거나 반환하지 않는다.',
        '구조화된 결과에 facts, safeguards 6개, risks 6개, largest_policy_gap 1개, recommended_clauses 1~3개, judgment_graph를 포함한다.',
        '위험 6개에는 각 항목의 짧고 검증 가능한 reason과 공개 label을 포함한다.',
        hasAdminResearchAccess() ? ADMIN_CALCULATION_LOG_GUIDANCE : '',
        '내부 사고 과정이나 장문의 추론은 노출하지 않고 입력 특징값·고정 공식·산술 결과처럼 검증 가능한 계산 정보만 반환한다.',
      ].filter(Boolean).join('\n'),
    });
    if (data?.error) throw new Error(data.error);
    committedUsage = commitUsageAfterRequest(data, usageBefore, 1);
    reconcileUsageSoon(committedUsage.used);

    const assistantMessage = sanitizeProductLanguage(
      data?.assistantMessage ??
      data?.assistant_message ??
      data?.message ??
      data?.reply ??
      '위험도와 코칭을 정리했어요.'
    );

    const rawConfirmedState = data?.simulation_state ?? data?.simulationState ?? data?.game_state ?? data?.[compatStateKey];
    if (!rawConfirmedState || typeof rawConfirmedState !== 'object') {
      throw new Error('정리된 결과를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    }
    const responseHasResearchDetail = data?.meta?.research_detail === true &&
      normalizeTier(data?.meta?.access_tier) === 'admin' &&
      hasAdminResearchAccess();
    const receivedCalculationLog = responseHasResearchDetail
      ? firstMeaningfulValue(
          data?.calculation_log,
          data?.calculationLog,
          data?.analysis_result?.calculation_log,
          data?.analysis_result?.calculationLog,
          data?.analysis_state?.calculation_log,
          data?.analysis_state?.calculationLog
        )
      : null;
    const confirmedState = composeSimulationPayload(
      rawConfirmedState,
      data?.analysis_state,
      data?.analysis_result,
      data?.calculation_basis,
      data?.decision_trace ?? data?.decisionTrace,
      receivedCalculationLog
    );
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
          simulation_state: rawConfirmedState,
          game_state: rawConfirmedState,
          analysis_state: data?.analysis_state ?? null,
          analysis_result: data?.analysis_result ?? null,
          calculation_basis: data?.calculation_basis ?? null,
          decision_trace: data?.decision_trace ?? data?.decisionTrace ?? null,
          calculation_log: receivedCalculationLog ?? null,
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
    showToast('위험도와 코칭을 정리했어요.', 'ready');
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
      window.setTimeout(() => {
        dom.analysisResultTitle?.focus({ preventScroll: true });
        dom.analysisContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }
}

async function requestFinalReport() {
  if (isRequestingReport || !session?.user || !activeConversation?.id) return;
  const requestCost = finalReportRequestCost();
  if (remainingUsage() < requestCost) {
    showToast(hasAdminResearchAccess()
      ? '이번 달 관리자 AI 호출 한도를 모두 사용했습니다.'
      : `자세한 분석에는 AI 이용 포인트 ${requestCost}이 필요합니다.`, 'error');
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
      message: '확인한 사실, 대응 안전장치 6가지, 학교 대응 위험 6가지, 가장 큰 누락 기준, 권장 조항과 판단 근거 그래프를 더 자세히 설명해줘.',
      [compatStateKey]: buildApiCompatibleState(),
      clientGuidance: [
        '자세한 분석은 확인한 사실 → 안전장치 6가지 → 위험 6가지 → 가장 큰 누락 → 권장 조항 → 판단 근거 그래프의 순서로 작성한다.',
        '학부모 유형, 페르소나, QRE, λ, 행동 확률을 만들거나 언급하지 않는다.',
        '본문 설명은 간결하게 유지하되 calculation_log에는 실제 입력 특징·가중치·기여도·반사실 계산을 생략하지 않는다.',
        '학부모를 평가하거나 공격하지 않고 교육활동 침해 여부를 단정하지 않는다.',
        '이전 제품의 놀이형 훈련 어휘를 쓰지 않는다.',
        '법률 판단, 책임 인정, 행정 처분 결론은 단정하지 않는다.',
        hasAdminResearchAccess() ? ADMIN_CALCULATION_LOG_GUIDANCE : '',
      ].filter(Boolean).join('\n'),
    });
    if (data?.error) throw new Error(data.error);
    committedUsage = commitUsageAfterRequest(data, usageBefore, requestCost);
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
    if (error?.usage) committedUsage = commitUsageAfterRequest(error, usageBefore, error?.cost ?? requestCost);
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
  invalidateResearchAccess({ clearData: true });
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
    const previousUserId = session?.user?.id ?? '';
    const nextUserId = nextSession?.user?.id ?? '';
    session = nextSession;
    if (previousUserId && nextUserId && previousUserId !== nextUserId) {
      invalidateResearchAccess({ clearData: true });
      conversations = [];
      activeConversation = null;
      messages = [];
      resetSimulationState();
      usageState = { tier: 'unauth', used: 0, limit: 0, period: '' };
      workspaceView = 'calendar';
    }
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

function setupHeroMotion() {
  const stage = dom.heroMotion;
  if (!stage) return;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pointerFrame = 0;
  let pointerPosition = null;

  const reset = () => {
    pointerPosition = null;
    stage.style.setProperty('--hero-card-x', '0px');
    stage.style.setProperty('--hero-card-y', '0px');
    stage.style.setProperty('--hero-tilt-x', '0deg');
    stage.style.setProperty('--hero-tilt-y', '0deg');
    stage.style.setProperty('--hero-geo-x', '0px');
    stage.style.setProperty('--hero-geo-y', '0px');
  };

  const applyPointerPosition = () => {
    pointerFrame = 0;
    if (!pointerPosition || reducedMotion.matches || !finePointer.matches) return reset();
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(-1, Math.min(1, ((pointerPosition.x - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((pointerPosition.y - rect.top) / rect.height - .5) * 2));
    stage.style.setProperty('--hero-card-x', `${(x * 3).toFixed(2)}px`);
    stage.style.setProperty('--hero-card-y', `${(y * 3).toFixed(2)}px`);
    stage.style.setProperty('--hero-tilt-x', `${(-y * .9).toFixed(2)}deg`);
    stage.style.setProperty('--hero-tilt-y', `${(x * 1.1).toFixed(2)}deg`);
    stage.style.setProperty('--hero-geo-x', `${(-x * 7).toFixed(2)}px`);
    stage.style.setProperty('--hero-geo-y', `${(-y * 7).toFixed(2)}px`);
  };

  stage.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || !finePointer.matches) return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointerPosition);
  }, { passive: true });
  stage.addEventListener('pointerleave', reset, { passive: true });
  reducedMotion.addEventListener?.('change', reset);
  finePointer.addEventListener?.('change', reset);
}

setupHeroMotion();

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
  if (event.isComposing) return;
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
