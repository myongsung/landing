import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';
import {
  GRAPH_SCHEMA_VERSION,
  buildGraphQueryPackage,
  buildKnowledgeGraphGuidanceV2,
  createSourceClaimPatchFromText,
  defaultAssessment,
  ensurePatchConnectivityCandidates,
  ensureSourceClaimPatchPaths,
  filterSourceRefsByText,
  mergeSourceRefsForEdge,
  normalizeGraphKind as normalizeGraphKindV2,
  normalizeGraphSnapshotV2,
  relationCandidateToEdge,
  runDeterministicGraphCommand,
  sanitizeGraphEdgeV2,
  sanitizeGraphNodeV2,
  sanitizeRelationCandidate,
  sourceRefQuoteExistsInText,
  suggestRelationCandidateBetweenNodes,
} from './graph-v2.js';

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
1. 이 서비스는 AI가 최종 판단을 대신하는 도구가 아니라, 사용자가 입력한 자료와 관계 그래프를 확인 가능한 형태로 분해하고 재구성하는 전문 보조도구다.
2. 보고서는 "상황 시각화보드", "사건 노드 기록", "인물 노드 기록"처럼 화면 요소를 나열하지 않는다.
3. 사용자가 입력한 노드, 관계선, 클러스터, PDF 원자료는 모두 정밀 분석의 재료로만 사용한다.
4. 보고서는 단순 요약이 아니라 관계 역학, 시간 관련성, 논리적 강점, 논리적 약점, 공략점, 보강 필요 자료를 입체적으로 보여주는 문서여야 한다.
5. 사실, 주장, 추정, 해석, 리스크, 확인 필요를 섞지 않는다. 확인되지 않은 내용은 반드시 "확인 필요" 또는 "자료상 한계"로 남긴다.
6. 사용자가 질문하면 먼저 직접 답하고, 그 다음 보고서에 반영할 분석 포인트를 구분한다.
7. 관련 주체는 직접 행위자, 관여 가능 주체, 방조·방관으로 보일 수 있는 주체, 관리·감독 위치의 주체, 의사결정 주체, 기관/플랫폼, 역할 불명으로 분리한다.
8. 관계는 "누가 누구와 연결되어 있다"가 아니라, 그 연결이 사건의 설명력·취약점·보강 지점에 어떤 의미를 갖는지 분석한다.
9. 시간은 단순 경위가 아니라 선후관계, 반응 속도, 반복성, 공백 구간, 모순 가능성, 증거 확보 우선순위로 분석한다.
10. "무엇이 강한가", "무엇이 약한가", "어디를 공략해야 하나", "무엇을 더 확보해야 하나"에는 근거와 한계를 함께 답한다.
11. 시나리오는 예언처럼 단정하지 말고 조건부로 쓴다: 자료가 보강될 경우, 반박이 들어올 경우, 시간 공백이 남을 경우, 관계 근거가 확인될 경우.
12. 보고서 기본 골격은 다음 흐름을 우선한다: 분석 개요, 시간 관련성, 관계 역학, 논리적 강점, 논리적 약점, 공략점 및 보강 전략, 시나리오별 전개, 확인 필요 질문, 제출 전 정리 문안.
13. 노드 메모는 "확인된 내용", "메모 기반 추정", "분석상 의미", "취약점", "보강 질문"으로 재구성한다.
14. 관계선 메모는 "연결 근거", "관계의 설명력", "반박 가능 지점", "보강할 자료"로 재구성한다.
15. 클러스터 메모는 하나의 장면 또는 쟁점 묶음으로 다루고, 내부 주체·시간·증거가 어떻게 맞물리는지 분석한다.
16. 법률·행정·형사책임 판단을 단정하지 않는다. 전문 판단이 필요한 대목은 "전문가 검토 필요" 또는 "사용자 최종 확인 필요"로 표시한다.
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
  commandList: document.querySelector('[data-command-list]'),
  commandAddButtons: document.querySelectorAll('[data-command-add]'),
  situationAddButtons: document.querySelectorAll('[data-situation-add]'),
  commandBackdrop: document.querySelector('[data-command-backdrop]'),
  commandModal: document.querySelector('[data-command-modal]'),
  commandCloseButtons: document.querySelectorAll('[data-command-close]'),
  commandInput: document.querySelector('[data-command-input]'),
  commandRun: document.querySelector('[data-command-run]'),
  situationBackdrop: document.querySelector('[data-situation-backdrop]'),
  situationModal: document.querySelector('[data-situation-modal]'),
  situationCloseButtons: document.querySelectorAll('[data-situation-close]'),
  situationInput: document.querySelector('[data-situation-input]'),
  situationRun: document.querySelector('[data-situation-run]'),
  commandResultBackdrop: document.querySelector('[data-command-result-backdrop]'),
  commandResultModal: document.querySelector('[data-command-result-modal]'),
  commandResultCloseButtons: document.querySelectorAll('[data-command-result-close]'),
  commandResultTitle: document.querySelector('[data-command-result-title]'),
  commandResultMeta: document.querySelector('[data-command-result-meta]'),
  commandResultOutput: document.querySelector('[data-command-result-output]'),
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
  graphTimeAxis: document.querySelector('[data-graph-time-axis]'),
  graphEmpty: document.querySelector('[data-graph-empty]'),
  graphCreateMenu: document.querySelector('[data-graph-create-menu]'),
  graphCreateKindButtons: document.querySelectorAll('[data-graph-create-kind]'),
  graphNodeMenu: document.querySelector('[data-graph-node-menu]'),
  graphNodeMenuTitle: document.querySelector('[data-graph-node-menu-title]'),
  graphNodeDelete: document.querySelector('[data-graph-node-delete]'),
  graphMarquee: document.querySelector('[data-graph-marquee]'),
  graphClear: document.querySelector('[data-graph-clear]'),
  graphLinkMode: document.querySelector('[data-graph-link-mode]'),
  graphCommandPresetButtons: document.querySelectorAll('[data-graph-command-preset]'),
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
  graphMemoTimeFields: document.querySelector('[data-graph-memo-time-fields]'),
  graphMemoDateLabel: document.querySelector('[data-graph-memo-date-label]'),
  graphMemoTimeLabel: document.querySelector('[data-graph-memo-time-label]'),
  graphMemoDate: document.querySelector('[data-graph-memo-date]'),
  graphMemoTime: document.querySelector('[data-graph-memo-time]'),
  graphMemoNote: document.querySelector('[data-graph-memo-note]'),
  graphMentionMenu: document.querySelector('[data-graph-mention-menu]'),
  graphMemoLayerButtons: document.querySelectorAll('[data-graph-memo-layer]'),
  graphMemoSave: document.querySelector('[data-graph-memo-save]'),
  graphMemoSubmit: document.querySelector('[data-graph-memo-submit]'),
  graphRelationBackdrop: document.querySelector('[data-graph-relation-backdrop]'),
  graphRelationModal: document.querySelector('[data-graph-relation-modal]'),
  graphRelationClose: document.querySelector('[data-graph-relation-close]'),
  graphRelationLabel: document.querySelector('[data-graph-relation-label]'),
  graphRelationType: document.querySelector('[data-graph-relation-type]'),
  graphRelationRole: document.querySelector('[data-graph-relation-role]'),
  graphRelationVerification: document.querySelector('[data-graph-relation-verification]'),
  graphRelationLegalSufficiency: document.querySelector('[data-graph-relation-legal-sufficiency]'),
  graphRelationExtractionConfidence: document.querySelector('[data-graph-relation-extraction-confidence]'),
  graphRelationSourceReliability: document.querySelector('[data-graph-relation-source-reliability]'),
  graphRelationSourceQuote: document.querySelector('[data-graph-relation-source-quote]'),
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
let commandBlocks = [];
let activeCommandResultBlockId = '';
let latestReportMeta = null;
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
  schemaVersion: GRAPH_SCHEMA_VERSION,
  nodes: [],
  links: [],
  relationCandidates: [],
  clusters: [],
  activeLegalTemplateId: 'none',
  analysisResults: {},
  selectedNodeId: null,
  selectedLinkId: null,
  pendingLinkNodeId: null,
  linkMode: true,
  nextNodeNumber: 1,
  nextEventNumber: 1,
  nextEvidenceNumber: 1,
  nextClusterNumber: 1,
};
let graphDragState = null;
let graphClusterDragState = null;
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
let graphMemoClusterId = null;
let graphMemoLayer = 'uncertain';
let graphMentionState = {
  open: false,
  at: -1,
  query: '',
  trigger: '@',
  activeIndex: 0,
  items: [],
};
let graphRelationId = null;
let graphRelationStrength = 'weak';
let graphConfirmResolver = null;
let graphRemoteSaveTimer = null;
let lastGraphRemoteSnapshotKey = '';
let graphPersistenceHydrating = false;
let graphLastPress = {
  id: '',
  at: 0,
};
let graphLastClusterPress = {
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
  evidence: '근거(증거)',
  claim: '주장',
  premise: '기반명제',
  source_span: '근거(증거)',
  inference: '기반명제',
  legal_element: '기반명제',
  hypothesis: '주장',
  unknown: '미분류',
};

const graphStrengthLabels = {
  confirmed: '확인됨',
  likely: '개연성',
  weak: '확인 필요',
};

const graphSnapshotKind = 'knowledge_graph_snapshot';
const graphSnapshotVersion = GRAPH_SCHEMA_VERSION;
const commandBlockKind = 'command_block';
const commandBlockVersion = 1;

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

function friendlyServiceError(error) {
  const message = String(error?.message ?? error ?? '').trim();

  if (/AI response was not valid structured JSON/i.test(message)) {
    return '명령 결과 생성은 되었지만 백엔드가 응답을 구조화하지 못했습니다. report-chat Edge Function의 callOpenAI()에 일반 텍스트 fallback 패치를 적용해 주세요.';
  }

  if (/AI 그래프 판별|그래프.*지연|graph/i.test(message) && /timeout|timed out|지연/i.test(message)) {
    return 'AI 그래프 구성이 지연되고 있습니다. 잠시 뒤 다시 시도하거나 상황을 두세 덩어리로 나누어 입력해 주세요.';
  }

  if (/timeout|timed out|지연/i.test(message)) {
    return '응답이 지연되고 있습니다. 명령을 조금 더 짧게 나누어 실행하거나 잠시 뒤 다시 시도해 주세요.';
  }

  if (/model|does not exist|not found|unsupported|unrecognized/i.test(message)) {
    return 'AI 모델 또는 report-chat Edge Function 배포 상태를 확인해야 합니다. 최신 report-chat.ts로 재배포하고, Supabase Secrets는 OPENAI_API_KEY와 선택값 OPENAI_MODEL만 남겨 주세요.';
  }

  if (/authentication|unauthorized|forbidden|invalid api key/i.test(message)) {
    return 'AI API 키 또는 Edge Function 인증 설정을 확인해야 합니다.';
  }

  if (/rate limit|too many|429/i.test(message)) {
    return 'AI 요청 한도가 잠시 높아졌습니다. 잠시 뒤 다시 시도해 주세요.';
  }

  return message || '요청 처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요.';
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

function compactText(value, maxLength = 12000) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, maxLength);
}

function blurActiveElementInside(container) {
  const activeElement = document.activeElement;
  if (container && activeElement instanceof HTMLElement && container.contains(activeElement)) {
    activeElement.blur();
  }
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
    meta:
      payload.meta ??
      payload.metadata ??
      null,
  };
}

function reportMetaArray(value, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAnalysisMapForUi(value) {
  const payload = unwrapPayload(value);
  if (!payload || typeof payload !== 'object') return null;

  return {
    centralCase: String(payload.central_case ?? payload.centralCase ?? '').trim(),
    primaryHypothesis: String(payload.primary_hypothesis ?? payload.primaryHypothesis ?? '').trim(),
    actors: Array.isArray(payload.actors) ? payload.actors.slice(0, 6) : [],
    events: Array.isArray(payload.events) ? payload.events.slice(0, 6) : [],
    relationships: Array.isArray(payload.relationships) ? payload.relationships.slice(0, 6) : [],
    criticalClues: Array.isArray(payload.critical_clues ?? payload.criticalClues)
      ? (payload.critical_clues ?? payload.criticalClues).slice(0, 5)
      : [],
    logicGaps: Array.isArray(payload.logic_gaps ?? payload.logicGaps)
      ? (payload.logic_gaps ?? payload.logicGaps).slice(0, 5)
      : [],
    scenarioMatrix: Array.isArray(payload.scenario_matrix ?? payload.scenarioMatrix)
      ? (payload.scenario_matrix ?? payload.scenarioMatrix).slice(0, 4)
      : [],
    evidencePlan: Array.isArray(payload.evidence_plan ?? payload.evidencePlan)
      ? (payload.evidence_plan ?? payload.evidencePlan).slice(0, 5)
      : [],
  };
}

function isDefaultAnalysisMap(analysisMap) {
  if (!analysisMap) return true;

  const hasCollections = [
    analysisMap.actors,
    analysisMap.events,
    analysisMap.relationships,
    analysisMap.criticalClues,
    analysisMap.logicGaps,
    analysisMap.scenarioMatrix,
    analysisMap.evidencePlan,
  ].some((items) => Array.isArray(items) && items.length > 0);

  const centralCase = String(analysisMap.centralCase || '').trim();
  const primaryHypothesis = String(analysisMap.primaryHypothesis || '').trim();
  const hasMeaningfulText = [centralCase, primaryHypothesis].some((text) => text && text !== '확인 필요');

  return !hasCollections && !hasMeaningfulText;
}

function normalizeReportMeta(value) {
  const payload = unwrapPayload(value);
  if (!payload || typeof payload !== 'object') return null;

  const analysisMap = normalizeAnalysisMapForUi(payload.analysisMap ?? payload.analysis_map);
  const updateReport = Boolean(payload.updateReport ?? payload.update_report);
  const reportChanged = Boolean(payload.reportChanged ?? payload.report_changed);

  if (!updateReport && !reportChanged && isDefaultAnalysisMap(analysisMap)) {
    return null;
  }

  const meta = {
    analysisMap: isDefaultAnalysisMap(analysisMap) ? null : analysisMap,
    analyticalFocus: String(payload.analyticalFocus ?? payload.analytical_focus ?? '').trim(),
    nextQuestion: String(payload.nextQuestion ?? payload.next_question ?? '').trim(),
    model: String(payload.model ?? '').trim(),
    strengths: reportMetaArray(payload.strengths, 6),
    weaknesses: reportMetaArray(payload.weaknesses, 6),
    leveragePoints: reportMetaArray(payload.leveragePoints ?? payload.leverage_points, 6),
  };

  return meta.analysisMap || meta.analyticalFocus || meta.nextQuestion || meta.strengths.length || meta.weaknesses.length || meta.leveragePoints.length
    ? meta
    : null;
}

function latestReportMetaFromMessages(rows = []) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const message = rows[index];
    if (message?.role !== 'assistant') continue;

    const meta = normalizeReportMeta(message.metadata);
    if (meta) return meta;
  }

  return null;
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
  if (dom.generateReport) dom.generateReport.disabled = desktopBlocked || !chatEnabled || busy;
  dom.commandAddButtons.forEach((button) => {
    button.disabled = desktopBlocked || !chatEnabled || busy;
  });
  dom.situationAddButtons.forEach((button) => {
    button.disabled = desktopBlocked || !chatEnabled || busy;
  });
  if (dom.historyToggle) {
    dom.historyToggle.disabled = !session?.user;
    dom.historyToggle.textContent = conversations.length ? `사안 파일 ${conversations.length}` : '사안 파일';
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

  dom.input.placeholder = '@인물 #사건 $증거를 섞어 쓰면 AI가 사건 평면을 구성합니다';
  if (dom.composerNote) dom.composerNote.textContent = 'AI가 입력 내용을 분석한 뒤 인물·사건·증거 노드와 관계선을 한 번에 반영합니다.';
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

function formatDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '시간 미상';
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    syncEvidenceNodeWithFile(id);
  } catch (error) {
    updateEvidenceFile(id, {
      status: 'failed',
      text: '',
      pageCount: 0,
      extraction: 'failed',
      statusLabel: '본문 추출 실패',
      error: error instanceof Error ? error.message : 'PDF 텍스트 추출 실패',
    });
    syncEvidenceNodeWithFile(id);
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
    .map((item) => {
      const linkedNode = graphState.nodes.find((node) => node.kind === 'evidence' && node.sourceEvidenceId === item.id);

      return `
      <article class="case-evidence-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${formatFileSize(item.size)} · ${escapeHtml(item.statusLabel || '본문 읽는 중')}</small>
        </div>
        <div class="case-evidence-actions">
          <button type="button" data-evidence-node="${escapeHtml(item.id)}">${linkedNode ? '노드 보기' : '노드화'}</button>
          <button type="button" data-evidence-remove="${escapeHtml(item.id)}">삭제</button>
        </div>
      </article>
    `;
    })
    .join('');

  if (dom.evidenceStatus) {
    const extractingCount = evidenceFiles.filter((item) => item.status === 'extracting').length;
    const readyCount = evidenceFiles.filter((item) => item.status === 'ready').length;
    const failedCount = evidenceFiles.filter((item) => item.status === 'failed' || item.status === 'empty').length;

    if (extractingCount) {
      dom.evidenceStatus.textContent = `${extractingCount}개 PDF 본문을 읽는 중입니다. 추출이 끝나면 정밀 분석 보고서에 반영할 수 있습니다.`;
    } else if (readyCount) {
      dom.evidenceStatus.textContent = `${readyCount}개 PDF 본문을 읽었습니다. 증거 반영을 누르면 2회 차감 후 관계·시간·강점·약점 분석에 반영됩니다.`;
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
  setServiceStatus('PDF 증거를 목록에서 제거했습니다. 이미 만든 증거 노드는 사건 평면에 유지됩니다.', 'ready');
}

function evidenceNodeTitle(item) {
  const raw = String(item?.name || 'PDF 증거').replace(/\.pdf$/i, '').trim();
  return (raw || 'PDF 증거').slice(0, 34);
}

function evidenceNodeNote(item) {
  const text = normalizePdfText(item?.text || '').slice(0, 900);
  return [
    '증거 종류: PDF 원자료',
    `파일명: ${item?.name || '확인 필요'}`,
    `파일 크기: ${formatFileSize(item?.size || 0)}`,
    `페이지: ${item?.pageCount || '확인 필요'}`,
    `추출 상태: ${item?.statusLabel || item?.status || '확인 필요'}`,
    item?.addedAt ? `추가 시점: ${item.addedAt}` : '',
    text ? `본문 발췌: ${text}` : '본문 발췌: 텍스트 추출 전이거나 직접 확인 필요',
  ].filter(Boolean).join('\n');
}

function evidenceNodeAnchorPoint() {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  if (!rect) return { x: 180, y: 180 };
  const existing = graphState.nodes.filter((node) => node.kind === 'evidence').length;
  return graphScreenToWorld({
    x: Math.min(rect.width - 120, Math.max(120, rect.width * 0.58 + existing * 28)),
    y: Math.min(rect.height - 120, Math.max(120, rect.height * 0.38 + existing * 24)),
  });
}

function createEvidenceNodeFromFile(id) {
  const item = evidenceFiles.find((entry) => entry.id === id);
  if (!item) return null;

  const existing = graphState.nodes.find((node) => node.kind === 'evidence' && node.sourceEvidenceId === id);
  if (existing) {
    graphState = {
      ...graphState,
      selectedNodeId: existing.id,
      selectedLinkId: null,
      pendingLinkNodeId: graphState.linkMode ? existing.id : graphState.pendingLinkNodeId,
    };
    renderAll();
    openGraphMemo(existing.id);
    setServiceStatus('이미 연결된 증거 노드를 열었습니다.', 'ready');
    return existing;
  }

  const point = evidenceNodeAnchorPoint();
  const selectedNode = graphNodeById(graphState.selectedNodeId);
  const node = createGraphNode(point.x, point.y, 'evidence', {
    label: evidenceNodeTitle(item),
    role: 'PDF 원자료',
    layer: item.status === 'ready' ? 'support' : 'uncertain',
    note: evidenceNodeNote(item),
    sourceEvidenceId: item.id,
    sourceFileName: item.name,
  });

  if (selectedNode && selectedNode.id !== node.id) {
    upsertGraphLink({
      sourceId: selectedNode.id,
      targetId: node.id,
      label: '증거 연결',
      basis: `${selectedNode.label} 노드와 PDF 증거 ${item.name} 연결`,
      strength: item.status === 'ready' ? 'likely' : 'weak',
    });
  }

  graphState = {
    ...graphState,
    selectedNodeId: node.id,
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? node.id : graphState.pendingLinkNodeId,
  };
  renderAll();
  scheduleGraphRemotePersistence('graph_evidence_node_create');
  setServiceStatus(selectedNode ? '증거 노드를 만들고 선택 노드와 연결했습니다.' : '증거 노드를 사건 평면에 추가했습니다.', 'ready');
  return node;
}

function syncEvidenceNodeWithFile(id) {
  const item = evidenceFiles.find((entry) => entry.id === id);
  if (!item) return false;

  let changed = false;
  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => {
      if (node.kind !== 'evidence' || node.sourceEvidenceId !== id) return node;

      const shouldRefreshNote = !String(node.note || '').trim() || /본문 발췌:\s*텍스트 추출 전|추출 대기|본문 읽는 중|텍스트 추출 실패/.test(node.note);
      changed = true;
      return {
        ...node,
        label: node.label || evidenceNodeTitle(item),
        role: node.role || 'PDF 원자료',
        layer: item.status === 'ready' ? 'support' : node.layer || 'uncertain',
        note: shouldRefreshNote ? evidenceNodeNote(item) : node.note,
        sourceFileName: item.name,
        memoUpdatedAt: node.memoUpdatedAt || new Date().toISOString(),
      };
    }),
  };

  if (changed) {
    renderKnowledgeGraph();
    renderEvidenceFiles();
    scheduleGraphRemotePersistence('graph_evidence_node_sync');
  }

  return changed;
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
- 위 PDF 본문에서 확인되는 날짜, 당사자, 금액, 발언, 조항, 요청, 회신, 제출처, 서명 여부를 시간 관련성·관계 역학·논리적 강점·논리적 약점 분석에 반영한다.
- 각 PDF 증거마다 자료 일관성, 원본·형식, 작성 주체, 작성 시점, 행위 맥락 연결을 분리해 평가한다.
- PDF에서 확인되는 행위자, 관리·감독 위치의 주체, 의사결정 주체, 기관/플랫폼 개입 지점, AI가 추론한 연결 지점을 정밀 분석 보고서에 반영한다.
- PDF 본문이 특정 보고서 섹션을 새로 요구하면 고정 양식에 억지로 맞추지 말고, "동적 분석 모듈"로 추가한다.
- AI가 PDF 본문에서 도출한 추론은 "분석 근거와 자료상 한계"에 남기고, 사용자가 최종 확인해야 할 부분은 "확인 필요 질문"에 분리한다.
- PDF 본문만으로 단정할 수 없는 부분은 "확인 필요"로 표시한다.
- PDF에서 직접 확인된 내용과 사용자가 사건 메모로 입력한 주장을 구분한다.
`.trim();
}

function reportInlineHtml(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<span class="report-emphasis">$1</span>')
    .replace(/\b((?:node|link|candidate)-[A-Za-z0-9_.:-]+)\b/g, (match) => {
      const kind = match.startsWith('node-') ? 'node' : 'link';
      return `<button type="button" class="graph-inline-ref" data-graph-ref-kind="${kind}" data-graph-ref-id="${match}">${match}</button>`;
    });
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

function reportMetaSummaryHtml(meta) {
  if (!meta) return '';

  const analysisMap = meta.analysisMap;
  const centralCase = analysisMap?.centralCase || '';
  const primaryHypothesis = analysisMap?.primaryHypothesis || '';
  const strengths = meta.strengths || [];
  const weaknesses = meta.weaknesses || [];
  const leveragePoints = meta.leveragePoints || [];
  const criticalClues = analysisMap?.criticalClues || [];
  const logicGaps = analysisMap?.logicGaps || [];
  const scenarioCount = analysisMap?.scenarioMatrix?.length || 0;

  const statItems = [
    ['주체', analysisMap?.actors?.length || 0],
    ['사건', analysisMap?.events?.length || 0],
    ['관계', analysisMap?.relationships?.length || 0],
    ['시나리오', scenarioCount],
  ];

  const insightList = (title, items, className) => {
    if (!items.length) return '';
    return `
      <article class="report-insight-list ${className}">
        <h3>${escapeHtml(title)}</h3>
        <ul>
          ${items.slice(0, 3).map((item) => `<li>${reportInlineHtml(item)}</li>`).join('')}
        </ul>
      </article>
    `;
  };

  const clueItems = criticalClues
    .map((item) => item?.clue || item?.why_it_matters || item?.whyItMatters || '')
    .filter(Boolean);
  const gapItems = logicGaps
    .map((item) => item?.gap || item?.risk || '')
    .filter(Boolean);

  return `
    <section class="report-intelligence-panel" aria-label="AI 분석 요약">
      <div class="report-intelligence-head">
        <span>AI 분석 맵</span>
        <strong>${escapeHtml(meta.analyticalFocus || centralCase || '관계역학 정밀 분석')}</strong>
      </div>
      <div class="report-intelligence-grid">
        <article class="report-intelligence-main">
          <span>중심 사안</span>
          <p>${reportInlineHtml(centralCase || '아직 중심 사안이 충분히 특정되지 않았습니다.')}</p>
          ${primaryHypothesis ? `<small>${reportInlineHtml(primaryHypothesis)}</small>` : ''}
        </article>
        <div class="report-intelligence-stats">
          ${statItems.map(([label, value]) => `
            <span>
              <b>${escapeHtml(String(value))}</b>
              <i>${escapeHtml(label)}</i>
            </span>
          `).join('')}
        </div>
      </div>
      <div class="report-insight-grid">
        ${insightList('강점', strengths, 'is-strong')}
        ${insightList('약점', weaknesses.length ? weaknesses : gapItems, 'is-weak')}
        ${insightList('공략점', leveragePoints.length ? leveragePoints : clueItems, 'is-action')}
      </div>
      ${meta.nextQuestion ? `<p class="report-next-question"><span>다음 질문</span>${reportInlineHtml(meta.nextQuestion)}</p>` : ''}
    </section>
  `;
}

function markdownToHtml(markdown, options = {}) {
  const source = String(markdown || '').trim();
  const metaHtml = reportMetaSummaryHtml(options.meta);

  if (!source) {
    return `
      <header class="report-cover">
        <span>RoosyCozy 정밀 분석 보고서</span>
        <h2>사안 분석 대기</h2>
        <p>관계, 시간, 증거의 연결 구조를 분석 가능한 문서로 재구성합니다.</p>
      </header>
      <div class="report-meta">
        <span>관계 역학</span>
        <span>시간 관련성</span>
        <span>논리 강점</span>
        <span>논리 약점</span>
      </div>
      <section class="report-section report-placeholder">
        <h2>작성 예정 분석</h2>
        <ul>
          <li>사건의 시간 흐름과 반응 구간</li>
          <li>관련 주체 사이의 역학과 이해관계</li>
          <li>현재 자료로 강하게 설명되는 부분</li>
          <li>반박 가능성이 남는 약점과 보강 포인트</li>
        </ul>
      </section>
      ${metaHtml}
    `;
  }

  const lines = source.split('\n');
  let title = '정밀 분석 보고서';
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

  function addSubheading(text) {
    flushParagraph();
    flushList();
    flushTable();
    ensureSection().blocks.push({
      type: 'subheading',
      text,
    });
  }

  function addDivider() {
    flushParagraph();
    flushList();
    flushTable();
    ensureSection().blocks.push({
      type: 'divider',
    });
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
      addSubheading(line.slice(4).trim());
      return;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      addDivider();
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

    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      flushTable();
      list.push(line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, ''));
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

          if (block.type === 'subheading') {
            return `<h3>${escapeHtml(block.text)}</h3>`;
          }

          if (block.type === 'divider') {
            return '<hr class="report-divider">';
          }

          if (block.type === 'table') {
            const [headRow, ...bodyRows] = block.rows;
            const header = headRow
              .map((cell) => `<th>${reportInlineHtml(cell)}</th>`)
              .join('');
            const rows = bodyRows
              .map((row) => `<tr>${row.map((cell) => `<td>${reportInlineHtml(cell)}</td>`).join('')}</tr>`)
              .join('');
            const cards = bodyRows
              .map((row) => `
                <article class="report-row-card">
                  ${headRow.map((headCell, cellIndex) => `
                    <div>
                      <span>${reportInlineHtml(headCell)}</span>
                      <p>${reportInlineHtml(row[cellIndex] ?? '')}</p>
                    </div>
                  `).join('')}
                </article>
              `)
              .join('');

            return `
              <div class="report-table-wrap">
                <table class="report-table">
                  <thead><tr>${header}</tr></thead>
                  <tbody>${rows || `<tr>${headRow.map(() => '<td></td>').join('')}</tr>`}</tbody>
                </table>
              </div>
              ${cards ? `<div class="report-table-cards">${cards}</div>` : ''}
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
      <span>RoosyCozy 정밀 분석 보고서</span>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <div class="report-meta">
      <span>관계 역학</span>
      <span>시간 관련성</span>
      <span>강점·약점</span>
      <span>공략점</span>
    </div>
  ${metaHtml}
  ${body || '<section class="report-section"><p>정밀 분석 보고서를 구성하고 있습니다.</p></section>'}
  `;
}

function reportSectionKind(title = '') {
  const text = String(title);

  if (/정밀|분석|브리프|관계 역학|역학/.test(text)) return 'is-summary';
  if (/관계 기록|관계선|연결|관계/.test(text)) return 'is-evidence';
  if (/요약|개요|핵심/.test(text)) return 'is-summary';
  if (/당사자|역할|인물|가해|피해|방관|목격|이해관계|분쟁구도|관계자|관련 주체|행위자|감독|관리|의사결정/.test(text)) return 'is-people';
  if (/시간|경위|일시|순서|타임라인|선후|반응|공백/.test(text)) return 'is-timeline';
  if (/장면|상황|묘사|발언|행동|주장|대립/.test(text)) return 'is-scene';
  if (/증거|자료|기록|문서|로그/.test(text)) return 'is-evidence';
  if (/부족|확인|질문|불확실|쟁점|논점|리스크|취약|약점|한계|반박|정리근거|AI|사용자|검토/.test(text)) return 'is-gap';
  if (/대응|조치|체크|다음|시뮬레이션|전개|경로|실행|자료추적|로그|최종 확인|공략|보강|전략|강점/.test(text)) return 'is-action';

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
  return ['report_command', 'mixed_question_with_facts'].includes(intent);
}

function chatRequestPolicy(intent, shouldUpdateReport) {
  return {
    intent,
    shouldUpdateReport,
    answerFirst: intent === 'direct_question' || intent === 'mixed_question_with_facts',
    reportPolicy: shouldUpdateReport
      ? 'update_report_after_answering_if_needed'
      : 'answer_question_without_rewriting_report_unless_new_facts_are_present',
    requiredReportSections: shouldUpdateReport
      ? [
          '분석 개요',
          '사건 시간축과 관련성',
          '관계 역학 분석',
          '논리적 강점',
          '논리적 약점',
          '공략점 및 보강 전략',
          '시나리오별 전개 가능성',
          '확인 필요 질문',
          '제출 전 정리 문안',
        ]
      : [],
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
    commandBlocks = [];
    resetKnowledgeGraph();
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
      <span>${escapeHtml(productLabel(conversation.product))} · 전체 그래프 + 명령 세트 · ${new Date(conversation.updated_at).toLocaleDateString('ko-KR')}</span>
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

function graphClusterById(id) {
  return (graphState.clusters || []).find((cluster) => cluster.id === id) ?? null;
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

function centerGraphOnPoint(point) {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  if (!rect || !point) return;
  graphViewport = {
    ...graphViewport,
    x: rect.width / 2 - point.x * graphViewport.scale,
    y: rect.height / 2 - point.y * graphViewport.scale,
  };
}

function focusGraphEntity(kind, id) {
  const refKind = String(kind || '').trim();
  const refId = String(id || '').trim();
  if (!refId) return false;

  if (refKind === 'node' || refId.startsWith('node-')) {
    const node = graphNodeById(refId);
    if (!node) return false;
    graphState = {
      ...graphState,
      selectedNodeId: node.id,
      selectedLinkId: null,
    };
    centerGraphOnPoint(node);
    renderAll();
    return true;
  }

  const link = graphLinkById(refId);
  if (!link) return false;
  const source = graphNodeById(link.source);
  const target = graphNodeById(link.target);
  if (source && target) {
    centerGraphOnPoint({
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    });
  }
  graphState = {
    ...graphState,
    selectedNodeId: null,
    selectedLinkId: link.id,
  };
  renderAll();
  return true;
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
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [],
    links: [],
    relationCandidates: [],
    clusters: [],
    activeLegalTemplateId: 'none',
    analysisResults: {},
    selectedNodeId: null,
    selectedLinkId: null,
    pendingLinkNodeId: null,
    linkMode: graphState.linkMode,
    nextNodeNumber: 1,
    nextEventNumber: 1,
    nextEvidenceNumber: 1,
    nextClusterNumber: 1,
  };
  graphDragState = null;
  graphClusterDragState = null;
  graphCanvasDragState = null;
  graphCreatePoint = null;
  graphNodeMenuId = null;
  graphMemoClusterId = null;
  graphViewport = {
    x: 0,
    y: 0,
    scale: 1,
  };
  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphMarquee(null);
}

function graphDefaultState() {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [],
    links: [],
    relationCandidates: [],
    clusters: [],
    activeLegalTemplateId: 'none',
    analysisResults: {},
    selectedNodeId: null,
    selectedLinkId: null,
    pendingLinkNodeId: null,
    linkMode: true,
    nextNodeNumber: 1,
    nextEventNumber: 1,
    nextEvidenceNumber: 1,
    nextClusterNumber: 1,
  };
}

function graphStorageKey(conversationId = activeConversation?.id) {
  if (!conversationId || String(conversationId).startsWith('local-')) return '';
  const userId = session?.user?.id || 'anonymous';
  return `roosycozy:knowledge-graph:${userId}:${conversationId}`;
}

function safeGraphNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeGraphKind(value, fallback = 'unknown') {
  const kind = normalizeGraphKindV2(value);
  return kind === 'unknown' ? fallback : kind;
}

function sanitizeGraphNode(node) {
  const base = sanitizeGraphNodeV2(node || {});
  const kind = normalizeGraphKind(base.kind);
  const importance = normalizeGraphLayer(base.importance || base.layer);
  const label = humanizeGraphPatchLabel(kind, base.label, {
    index: internalGraphLabelIndex(base.label),
    note: base.note || base.description || '',
    sourceRefs: base.sourceRefs || [],
    claimText: base.claimText || '',
  });

  return {
    ...base,
    id: String(base.id || '').slice(0, 120),
    kind,
    label: String(label || base.label || '').slice(0, 120),
    role: String(base.role || '').slice(0, 120),
    importance,
    layer: importance,
    note: String(base.note || '').slice(0, 2400),
    eventDate: String(base.eventDate || '').slice(0, 10),
    eventTime: String(base.eventTime || '').slice(0, 5),
    sourceEvidenceId: String(base.sourceEvidenceId || '').slice(0, 120),
    sourceFileName: String(base.sourceFileName || '').slice(0, 180),
    analysisStatus: String(base.analysisStatus || 'draft').slice(0, 40),
    memoUpdatedAt: String(base.memoUpdatedAt || ''),
    clusterId: String(base.clusterId || ''),
    x: safeGraphNumber(base.x),
    y: safeGraphNumber(base.y),
  };
}

function sanitizeGraphLink(link) {
  const edge = sanitizeGraphEdgeV2({
    ...link,
    type: link?.type || link?.relationType || 'LEGACY_RELATED_TO',
    assessment: link?.assessment || {
      ...defaultAssessment({}),
      supportStrength: normalizeGraphStrength(link?.strength) === 'confirmed'
        ? 'strong'
        : normalizeGraphStrength(link?.strength) === 'likely'
          ? 'moderate'
          : 'weak',
    },
  });
  return {
    ...edge,
    id: String(edge.id || '').slice(0, 120),
    label: String(edge.label || edge.type || '관계').slice(0, 120),
    basis: String(edge.basis || '').slice(0, 1400),
    strength: normalizeGraphStrength(link?.strength || edge.assessment?.supportStrength),
    analysisStatus: String(edge.analysisStatus || 'draft').slice(0, 40),
  };
}

function sanitizeGraphCluster(cluster) {
  return {
    id: String(cluster?.id || '').slice(0, 120),
    label: String(cluster?.label || '사안 묶음').slice(0, 80),
    focus: String(cluster?.focus || cluster?.role || '관계 묶음').slice(0, 80),
    layer: normalizeGraphLayer(cluster?.layer),
    note: String(cluster?.note || '').slice(0, 1200),
    analysisStatus: String(cluster?.analysisStatus || 'draft').slice(0, 40),
    memoUpdatedAt: String(cluster?.memoUpdatedAt || ''),
    nodeIds: Array.isArray(cluster?.nodeIds)
      ? cluster.nodeIds.map((id) => String(id).slice(0, 120)).filter(Boolean).slice(0, 80)
      : [],
    x: safeGraphNumber(cluster?.x),
    y: safeGraphNumber(cluster?.y),
    width: Math.max(120, safeGraphNumber(cluster?.width, 360)),
    height: Math.max(100, safeGraphNumber(cluster?.height, 240)),
    createdAt: String(cluster?.createdAt || ''),
  };
}

function graphSnapshotForStorage() {
  const state = graphDefaultState();
  const nodes = graphState.nodes.map(sanitizeGraphNode).filter((node) => node.id);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = graphState.links
    .map(sanitizeGraphLink)
    .filter((link) => link.id && nodeIds.has(link.source) && nodeIds.has(link.target));
  const relationCandidates = (graphState.relationCandidates || [])
    .map(sanitizeRelationCandidate)
    .filter((candidate) => candidate.id && nodeIds.has(candidate.source) && nodeIds.has(candidate.target));
  const clusters = (graphState.clusters || [])
    .map(sanitizeGraphCluster)
    .map((cluster) => ({
      ...cluster,
      nodeIds: cluster.nodeIds.filter((id) => nodeIds.has(id)),
    }))
    .filter((cluster) => cluster.id && cluster.nodeIds.length >= 2);

  return {
    version: graphSnapshotVersion,
    kind: graphSnapshotKind,
    savedAt: new Date().toISOString(),
    conversationId: activeConversation?.id || '',
    state: {
      ...state,
      nodes,
      links,
      relationCandidates,
      clusters,
      activeLegalTemplateId: graphState.activeLegalTemplateId || 'none',
      analysisResults: graphState.analysisResults || {},
      selectedNodeId: nodeIds.has(graphState.selectedNodeId) ? graphState.selectedNodeId : null,
      selectedLinkId: links.some((link) => link.id === graphState.selectedLinkId) ? graphState.selectedLinkId : null,
      pendingLinkNodeId: nodeIds.has(graphState.pendingLinkNodeId) ? graphState.pendingLinkNodeId : null,
      linkMode: Boolean(graphState.linkMode),
      nextNodeNumber: Math.max(1, safeGraphNumber(graphState.nextNodeNumber, 1)),
      nextEventNumber: Math.max(1, safeGraphNumber(graphState.nextEventNumber, 1)),
      nextEvidenceNumber: Math.max(1, safeGraphNumber(graphState.nextEvidenceNumber, 1)),
      nextClusterNumber: Math.max(1, safeGraphNumber(graphState.nextClusterNumber, 1)),
    },
    viewport: {
      x: safeGraphNumber(graphViewport.x),
      y: safeGraphNumber(graphViewport.y),
      scale: clampGraphScale(graphViewport.scale),
    },
    commandBlocks: commandBlocks
      .map(sanitizeCommandBlock)
      .filter(Boolean)
      .slice(0, 80),
  };
}

function graphSnapshotSortValue(snapshot) {
  const time = Date.parse(snapshot?.savedAt || snapshot?.created_at || '');
  return Number.isFinite(time) ? time : 0;
}

function normalizeGraphSnapshot(value) {
  const snapshot = normalizeGraphSnapshotV2(unwrapPayload(value));
  if (!snapshot || typeof snapshot !== 'object') return null;
  const sourceState = snapshot.state && typeof snapshot.state === 'object' ? snapshot.state : snapshot;
  const nodes = Array.isArray(sourceState.nodes) ? sourceState.nodes.map(sanitizeGraphNode).filter((node) => node.id) : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = Array.isArray(sourceState.links)
    ? sourceState.links.map(sanitizeGraphLink).filter((link) => link.id && nodeIds.has(link.source) && nodeIds.has(link.target))
    : [];
  const relationCandidates = Array.isArray(sourceState.relationCandidates)
    ? sourceState.relationCandidates
        .map(sanitizeRelationCandidate)
        .filter((candidate) => candidate.id && nodeIds.has(candidate.source) && nodeIds.has(candidate.target))
    : [];
  const clusters = Array.isArray(sourceState.clusters)
    ? sourceState.clusters
        .map(sanitizeGraphCluster)
        .map((cluster) => ({ ...cluster, nodeIds: cluster.nodeIds.filter((id) => nodeIds.has(id)) }))
        .filter((cluster) => cluster.id && cluster.nodeIds.length >= 2)
    : [];
  const rawCommandBlocks = Array.isArray(snapshot.commandBlocks)
    ? snapshot.commandBlocks
    : Array.isArray(sourceState.commandBlocks)
      ? sourceState.commandBlocks
      : Array.isArray(snapshot.command_blocks)
        ? snapshot.command_blocks
        : null;
  const bundledCommandBlocks = Array.isArray(rawCommandBlocks)
    ? rawCommandBlocks.map(sanitizeCommandBlock).filter(Boolean).slice(0, 80)
    : [];

  return {
    version: GRAPH_SCHEMA_VERSION,
    kind: graphSnapshotKind,
    savedAt: String(snapshot.savedAt || snapshot.created_at || ''),
    commandBlocks: bundledCommandBlocks,
    hasBundledCommandBlocks: Array.isArray(rawCommandBlocks),
    state: {
      ...graphDefaultState(),
      nodes,
      links,
      relationCandidates,
      clusters,
      activeLegalTemplateId: sourceState.activeLegalTemplateId || 'none',
      analysisResults: sourceState.analysisResults || {},
      selectedNodeId: nodeIds.has(sourceState.selectedNodeId) ? sourceState.selectedNodeId : null,
      selectedLinkId: links.some((link) => link.id === sourceState.selectedLinkId) ? sourceState.selectedLinkId : null,
      pendingLinkNodeId: nodeIds.has(sourceState.pendingLinkNodeId) ? sourceState.pendingLinkNodeId : null,
      linkMode: sourceState.linkMode !== undefined ? Boolean(sourceState.linkMode) : true,
      nextNodeNumber: Math.max(1, safeGraphNumber(sourceState.nextNodeNumber, nodes.filter((node) => node.kind === 'person').length + 1)),
      nextEventNumber: Math.max(1, safeGraphNumber(sourceState.nextEventNumber, nodes.filter((node) => node.kind === 'event').length + 1)),
      nextEvidenceNumber: Math.max(1, safeGraphNumber(sourceState.nextEvidenceNumber, nodes.filter((node) => node.kind === 'evidence').length + 1)),
      nextClusterNumber: Math.max(1, safeGraphNumber(sourceState.nextClusterNumber, clusters.length + 1)),
    },
    viewport: {
      x: safeGraphNumber(snapshot.viewport?.x),
      y: safeGraphNumber(snapshot.viewport?.y),
      scale: clampGraphScale(snapshot.viewport?.scale ?? 1),
    },
  };
}

function applyGraphSnapshot(snapshot) {
  const normalized = normalizeGraphSnapshot(snapshot);
  if (!normalized) return false;

  graphPersistenceHydrating = true;
  graphState = {
    ...normalized.state,
    linkMode: normalized.state.linkMode,
  };
  graphViewport = normalized.viewport;
  graphDragState = null;
  graphClusterDragState = null;
  graphCanvasDragState = null;
  graphCreatePoint = null;
  graphNodeMenuId = null;
  graphMemoClusterId = null;
  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphMarquee(null);
  graphPersistenceHydrating = false;
  return true;
}

function persistGraphStateLocal() {
  const key = graphStorageKey();
  if (!key || !window.localStorage) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(graphSnapshotForStorage()));
  } catch {
    // Local persistence is a convenience layer; remote snapshots still run on save.
  }
}

function loadGraphStateLocal(conversationId = activeConversation?.id) {
  const key = graphStorageKey(conversationId);
  if (!key || !window.localStorage) return null;

  try {
    return normalizeGraphSnapshot(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function removeGraphStateLocal(conversationId) {
  const key = graphStorageKey(conversationId);
  if (!key || !window.localStorage) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore local cleanup failures.
  }
}

function isGraphSnapshotMessage(message) {
  const metadata = unwrapPayload(message?.metadata ?? {});
  return metadata?.kind === graphSnapshotKind || metadata?.graph_snapshot?.kind === graphSnapshotKind;
}

function isWorkspaceInternalMessage(message) {
  const metadata = unwrapPayload(message?.metadata ?? {});
  return [
    graphSnapshotKind,
    commandBlockKind,
    'graph_extraction_result',
    'graph_command_result',
  ].includes(String(metadata?.kind || ''));
}

function latestGraphSnapshotFromMessages(messageRows = []) {
  return messageRows
    .map((message) => {
      const metadata = unwrapPayload(message?.metadata ?? {});
      const snapshot = normalizeGraphSnapshot(metadata.graph_snapshot ?? metadata.snapshot ?? null);
      return snapshot ? { ...snapshot, created_at: message.created_at } : null;
    })
    .filter(Boolean)
    .sort((a, b) => graphSnapshotSortValue(b) - graphSnapshotSortValue(a))[0] ?? null;
}

function commandBlockId() {
  return window.crypto?.randomUUID?.() || `command-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeCommandBlock(block) {
  const payload = unwrapPayload(block);
  if (!payload || typeof payload !== 'object') return null;

  const command = String(payload.command || '').trim().slice(0, 5000);
  const output = String(payload.output || payload.content || '').trim().slice(0, 24000);
  if (!command && !output) return null;

  return {
    version: Number(payload.version) || commandBlockVersion,
    kind: commandBlockKind,
    id: String(payload.id || commandBlockId()).slice(0, 120),
    command,
    output,
    status: String(payload.status || 'ready').slice(0, 40),
    createdAt: String(payload.createdAt || payload.created_at || new Date().toISOString()),
    executedAt: String(payload.executedAt || payload.executed_at || payload.createdAt || payload.created_at || new Date().toISOString()),
    sourceBlockId: String(payload.sourceBlockId || payload.source_block_id || ''),
    remoteMessageId: String(payload.remoteMessageId || payload.remote_message_id || payload.messageId || payload.message_id || ''),
    graphSummary: String(payload.graphSummary || payload.graph_summary || '').slice(0, 500),
    usageUnits: Math.max(0, Math.min(10, Number(payload.usageUnits ?? payload.usage_units ?? 0) || 0)),
  };
}

function isCommandBlockMessage(message) {
  const metadata = unwrapPayload(message?.metadata ?? {});
  return metadata?.kind === commandBlockKind || metadata?.command_block?.kind === commandBlockKind;
}

function commandBlocksFromMessages(messageRows = []) {
  return messageRows
    .map((message) => {
      const metadata = unwrapPayload(message?.metadata ?? {});
      const block = sanitizeCommandBlock(metadata.command_block ?? metadata.block ?? null);
      return block
        ? {
            ...block,
            output: block.output || String(message.content || '').trim(),
            createdAt: block.createdAt || message.created_at,
            remoteMessageId: block.remoteMessageId || String(message.id || ''),
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

function graphCommandSummary() {
  const personCount = graphState.nodes.filter((node) => node.kind === 'person').length;
  const eventCount = graphState.nodes.filter((node) => node.kind === 'event').length;
  const evidenceCount = graphState.nodes.filter((node) => node.kind === 'evidence').length;
  const linkCount = graphState.links.length;
  const clusterCount = (graphState.clusters || []).length;
  return `인물 ${personCount} · 사건 ${eventCount} · 증거 ${evidenceCount} · 관계 ${linkCount} · 클러스터 ${clusterCount}`;
}

function graphRecordTitle(sourceText = '') {
  const sourceTitle = normalizeEntityName(
    String(sourceText || '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || ''
  );
  const event = graphState.nodes.find((node) => node.kind === 'event' && node.label);
  const evidenceCount = graphState.nodes.filter((node) => node.kind === 'evidence').length;
  const personCount = graphState.nodes.filter((node) => node.kind === 'person').length;
  const eventCount = graphState.nodes.filter((node) => node.kind === 'event').length;
  const base = event?.label || sourceTitle || '새 사안 파일';
  const suffix = [personCount ? `인물 ${personCount}` : '', eventCount ? `사건 ${eventCount}` : '', evidenceCount ? `증거 ${evidenceCount}` : '']
    .filter(Boolean)
    .join(' · ');
  return suffix ? `${base} · ${suffix}`.slice(0, 80) : base.slice(0, 80);
}

function isGenericRecordTitle(title = '') {
  const text = String(title || '').trim();
  if (!text) return true;
  if (/^(수사지식그래프|새 사안|새 사안 파일|명령 블록)$/.test(text)) return true;
  return graphState.nodes.some((node) => normalizeGraphReferenceName(node.label) === normalizeGraphReferenceName(text));
}

async function ensureRemoteConversationForWorkspace(seedTitle = '') {
  if (!supabase || !session?.user) return false;
  if (activeConversation && !activeConversation.isLocal) return true;

  const now = new Date().toISOString();
  const title = String(
    seedTitle
    || activeConversation?.title
    || graphRecordTitle()
    || '새 사안 파일'
  ).trim().slice(0, 80) || '새 사안 파일';

  const { data, error } = await supabase
    .from('report_conversations')
    .insert({
      user_id: session.user.id,
      product: currentProductKind(),
      title,
      status: 'draft',
      report_markdown: '',
      created_at: now,
      updated_at: now,
    })
    .select(conversationDetailSelect)
    .single();

  if (error) {
    return false;
  }

  activeConversation = data;
  conversations = [
    data,
    ...conversations.filter((conversation) => conversation.id !== data.id),
  ].slice(0, 20);
  renderConversations();
  syncInteractionState();
  return true;
}

async function persistGraphStateRemote({ reason = 'auto' } = {}) {
  if (!supabase || !session?.user) return false;

  const ready = await ensureRemoteConversationForWorkspace(graphRecordTitle());
  if (!ready || !activeConversation || activeConversation.isLocal) return false;

  const snapshot = graphSnapshotForStorage();
  const snapshotKey = JSON.stringify({
    nodes: snapshot.state.nodes,
    links: snapshot.state.links,
    relationCandidates: snapshot.state.relationCandidates,
    clusters: snapshot.state.clusters,
    activeLegalTemplateId: snapshot.state.activeLegalTemplateId,
    analysisResults: snapshot.state.analysisResults,
    commandBlocks: snapshot.commandBlocks,
    viewport: snapshot.viewport,
  });

  if (snapshotKey === lastGraphRemoteSnapshotKey && reason !== 'case_save') return true;
  lastGraphRemoteSnapshotKey = snapshotKey;

  const { data: snapshotMessage, error } = await supabase
    .from('report_messages')
    .insert({
      conversation_id: activeConversation.id,
      user_id: session.user.id,
      role: 'assistant',
      content: '',
      metadata: {
        kind: graphSnapshotKind,
        reason,
        graph_snapshot: snapshot,
      },
    })
    .select('id')
    .single();

  if (error) {
    lastGraphRemoteSnapshotKey = '';
    return false;
  }

  if (snapshotMessage?.id) {
    await supabase
      .from('report_messages')
      .delete()
      .eq('conversation_id', activeConversation.id)
      .eq('user_id', session.user.id)
      .eq('metadata->>kind', graphSnapshotKind)
      .neq('id', snapshotMessage.id)
      .then(() => {})
      .catch(() => {});

    await supabase
      .from('report_messages')
      .delete()
      .eq('conversation_id', activeConversation.id)
      .eq('user_id', session.user.id)
      .eq('metadata->>kind', commandBlockKind)
      .then(() => {})
      .catch(() => {});
  }

  const now = new Date().toISOString();
  const nextTitle = isGenericRecordTitle(activeConversation.title)
    ? graphRecordTitle(activeConversation.title)
    : activeConversation.title;
  supabase
    .from('report_conversations')
    .update({ updated_at: now, title: nextTitle })
    .eq('id', activeConversation.id)
    .eq('user_id', session.user.id)
    .then(({ data }) => {
      if (nextTitle && activeConversation?.id) {
        activeConversation = { ...activeConversation, title: nextTitle, updated_at: now };
        conversations = conversations.map((conversation) => (
          conversation.id === activeConversation.id
            ? { ...conversation, title: nextTitle, updated_at: now }
            : conversation
        ));
        renderConversations();
      }
    })
    .catch(() => {});

  return true;
}

function scheduleGraphRemotePersistence(reason = 'auto') {
  if (graphPersistenceHydrating) return;
  persistGraphStateLocal();

  window.clearTimeout(graphRemoteSaveTimer);
  graphRemoteSaveTimer = window.setTimeout(() => {
    persistGraphStateRemote({ reason }).catch(() => {});
  }, reason === 'case_save' ? 200 : 900);
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
  const kind = normalizeGraphKind(value);
  return graphKindLabels[kind] || graphKindLabels.unknown;
}

function normalizeGraphLayer(value) {
  const text = String(value || '').trim();
  if (/핵심|중심|주요|core/i.test(text)) return 'core';
  if (/주변|참고|보조|support/i.test(text)) return 'support';
  return 'uncertain';
}

function normalizeGraphStrength(value) {
  const text = String(value || '').trim();
  if (/강|strong|확인|confirmed|문서|녹취|원자료|캡처|증거/i.test(text)) return 'confirmed';
  if (/중간|moderate|개연|likely|추정|정황|가능/i.test(text)) return 'likely';
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
  return `${node.label || graphKindLabel(node?.kind)}${node.role ? ` · ${node.role}` : ''}`;
}

function graphEventDateTimeLabel(node) {
  if (!node || !['event', 'evidence'].includes(node.kind)) return '';
  const date = String(node.eventDate || '').trim();
  const time = String(node.eventTime || '').trim();
  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return '';
}

function graphLinkById(id) {
  const link = graphState.links.find((item) => item.id === id);
  if (link) return { ...link, isCandidate: false };
  const candidate = (graphState.relationCandidates || []).find((item) => item.id === id);
  if (!candidate) return null;
  return {
    ...candidate,
    isCandidate: true,
    type: candidate.suggestedType || 'LEGACY_RELATED_TO',
    role: candidate.suggestedRole || '',
    label: candidate.suggestedType || '후보 관계',
    basis: candidate.basis || '',
    strength: candidate.confidence === 'high' ? 'likely' : 'weak',
    verificationStatus: 'unverified',
    assessment: defaultAssessment({ extractionConfidence: candidate.confidence || 'unknown' }),
  };
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
  const menuHeight = 154;
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

function nearestGraphNodeToPoint(point, excludeId = '') {
  return graphState.nodes
    .filter((node) => node.id !== excludeId)
    .map((node) => ({
      node,
      distance: Math.hypot(safeGraphNumber(node.x) - safeGraphNumber(point.x), safeGraphNumber(node.y) - safeGraphNumber(point.y)),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.node || null;
}

function connectGraphNodeToContextCandidate(node, contextNode, reason = 'manual_node_create') {
  if (!node || !contextNode || node.id === contextNode.id) return null;

  const candidate = suggestRelationCandidateBetweenNodes(contextNode, node, {
    reason,
    basis: '새 노드가 사건 평면에서 고립되지 않도록 기존 노드와 후보 관계로 연결했습니다. 후보를 더블클릭해 근거와 유형을 확정할 수 있습니다.',
    sourceText: [contextNode.note, node.note].filter(Boolean).join('\n'),
    createdBy: 'rule',
  });

  return candidate ? upsertGraphRelationCandidate(candidate) : null;
}

function createGraphNode(x, y, kind = 'person', options = {}) {
  const nodeKind = normalizeGraphKind(kind, kind === 'person' ? 'person' : 'unknown');
  const isEvent = nodeKind === 'event';
  const isEvidence = nodeKind === 'evidence';
  const isSourceSpan = nodeKind === 'source_span';
  const isClaim = nodeKind === 'claim';
  const isPremise = nodeKind === 'premise';
  const isInference = nodeKind === 'inference';
  const isLegalElement = nodeKind === 'legal_element';
  const isHypothesis = nodeKind === 'hypothesis';
  const sequence = isEvent
    ? graphState.nextEventNumber
    : isEvidence
      ? graphState.nextEvidenceNumber
      : graphState.nextNodeNumber;
  const id = `${nodeKind}-${Date.now()}-${sequence}`;
  const label = options.label || (
    isEvent ? `주요 사건 ${sequence}`
      : isEvidence ? `근거 ${sequence}`
        : isClaim ? `주장 ${sequence}`
          : isPremise ? `기반명제 ${sequence}`
            : isSourceSpan ? `근거 ${sequence}`
            : isInference ? `기반명제 ${sequence}`
              : isLegalElement ? `기반명제 ${sequence}`
                : isHypothesis ? `주장 ${sequence}`
                  : `인물 ${sequence}`
  );
  const point = findAvailableGraphPoint(clampGraphWorldPoint({ x, y }), {
    minXGap: 178,
    minYGap: 116,
  });
  const contextNode = options.skipAutoConnect
    ? null
    : graphNodeById(options.connectToNodeId || graphState.selectedNodeId)
      || nearestGraphNodeToPoint(point);
  const importance = normalizeGraphLayer(options.importance || options.layer || (isEvent ? 'core' : isEvidence || isSourceSpan || isClaim || isPremise || isInference || isLegalElement || isHypothesis ? 'support' : 'uncertain'));
  const node = {
    id,
    kind: nodeKind,
    label,
    role: options.role || (isEvent ? '주요사건' : isEvidence || isSourceSpan ? '근거 자료' : isClaim || isHypothesis ? '주장' : isPremise || isInference || isLegalElement ? '기반명제' : '역할 미정'),
    importance,
    layer: importance,
    epistemicStatus: options.epistemicStatus || (isClaim || isSourceSpan || isPremise ? 'asserted' : 'unknown'),
    polarity: options.polarity || 'neutral',
    note: String(options.note || '').slice(0, 2200),
    sourceRefs: Array.isArray(options.sourceRefs) ? options.sourceRefs : [],
    timeStart: String(options.timeStart || options.eventDate || '').slice(0, 40),
    timeEnd: String(options.timeEnd || '').slice(0, 40),
    timePrecision: String(options.timePrecision || '').slice(0, 40),
    place: String(options.place || '').slice(0, 180),
    createdBy: options.createdBy || 'user',
    eventDate: String(options.eventDate || '').slice(0, 10),
    eventTime: String(options.eventTime || '').slice(0, 5),
    sourceEvidenceId: String(options.sourceEvidenceId || '').slice(0, 120),
    sourceFileName: String(options.sourceFileName || '').slice(0, 180),
    claimText: String(options.claimText || '').slice(0, 1800),
    subjectId: String(options.subjectId || '').slice(0, 120),
    predicate: String(options.predicate || '').slice(0, 120),
    objectId: String(options.objectId || '').slice(0, 120),
    value: String(options.value || '').slice(0, 300),
    templateId: String(options.templateId || '').slice(0, 120),
    elementKey: String(options.elementKey || '').slice(0, 120),
    required: Boolean(options.required),
    description: String(options.description || '').slice(0, 900),
    expectedEvidenceTypes: Array.isArray(options.expectedEvidenceTypes) ? options.expectedEvidenceTypes.slice(0, 12) : [],
    hypothesisStatus: options.hypothesisStatus || 'active',
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
    nextNodeNumber: isEvent || isEvidence ? graphState.nextNodeNumber : graphState.nextNodeNumber + 1,
    nextEventNumber: isEvent ? graphState.nextEventNumber + 1 : graphState.nextEventNumber,
    nextEvidenceNumber: isEvidence ? graphState.nextEvidenceNumber + 1 : graphState.nextEvidenceNumber,
  };

  connectGraphNodeToContextCandidate(node, contextNode);

  setGraphCreateMenuOpen(false);
  renderAll();
  scheduleGraphRemotePersistence('graph_node_create');
  return node;
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
  scheduleGraphRemotePersistence('graph_node_delete');
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
    focus: '관계 묶음',
    layer: 'support',
    nodeIds: selectedNodes.map((node) => node.id),
    note: `포섭 노드: ${selectedNames}`,
    analysisStatus: 'draft',
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
  scheduleGraphRemotePersistence('graph_cluster_create');
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
  if (!isOpen) {
    graphMemoNodeId = null;
    graphMemoClusterId = null;
    setGraphMentionOpen(false);
  }
}

function graphReferencePrefix(kind = 'person') {
  const normalized = normalizeGraphKind(kind);
  if (normalized === 'event') return '#';
  if (normalized === 'evidence') return '$';
  if (normalized === 'source_span') return '%';
  if (normalized === 'claim') return '!';
  if (normalized === 'legal_element') return '§';
  if (normalized === 'hypothesis') return '?';
  return '@';
}

function graphReferenceKindFromTrigger(trigger = '@') {
  if (trigger === '#') return 'event';
  if (trigger === '$') return 'evidence';
  if (trigger === '%') return 'source_span';
  if (trigger === '!') return 'claim';
  if (trigger === '§') return 'legal_element';
  if (trigger === '?') return 'hypothesis';
  return 'person';
}

function graphMentionCandidates(query = '', trigger = '@') {
  const currentId = graphMemoNodeId || '';
  const normalizedQuery = normalizeEntityName(query).toLowerCase();
  const targetKind = graphReferenceKindFromTrigger(trigger);

  return graphState.nodes
    .filter((node) => normalizeGraphKind(node.kind) === targetKind && node.id !== currentId)
    .filter((node) => {
      if (!normalizedQuery) return true;
      return [node.label, node.role, graphKindLabel(node.kind), graphLayerLabel(node.layer)]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(normalizedQuery));
    })
    .slice(0, 8);
}

function setGraphMentionOpen(isOpen, nextState = {}) {
  graphMentionState = {
    ...graphMentionState,
    ...nextState,
    open: Boolean(isOpen),
  };

  if (!dom.graphMentionMenu) return;

  if (!isOpen || !graphMentionState.items.length) {
    dom.graphMentionMenu.hidden = true;
    dom.graphMentionMenu.innerHTML = '';
    return;
  }

  dom.graphMentionMenu.hidden = false;
  const trigger = graphMentionState.trigger || '@';
  const title = trigger === '#'
    ? '# 사건 연결'
    : trigger === '$'
      ? '$ 증거 연결'
      : '@ 인물 연결';
  dom.graphMentionMenu.innerHTML = `
    <span>${escapeHtml(title)}</span>
    ${graphMentionState.items.map((node, index) => `
      <button type="button" class="${index === graphMentionState.activeIndex ? 'is-active' : ''}" data-graph-mention-id="${escapeHtml(node.id)}">
        <strong>${escapeHtml(node.label)}</strong>
        <small>${escapeHtml([graphKindLabel(node.kind), node.role, graphLayerLabel(node.layer)].filter(Boolean).join(' · '))}</small>
      </button>
    `).join('')}
  `;
}

function updateGraphMentionMenu() {
  const input = dom.graphMemoNote;
  if (!input || graphMemoClusterId) {
    setGraphMentionOpen(false);
    return;
  }

  const caret = input.selectionStart ?? 0;
  const beforeCaret = input.value.slice(0, caret);
  const match = beforeCaret.match(/(^|[\s([{'",，、:：])([@#$])([^\s@#$()[\]{}'",，、:：]*)$/);

  if (!match) {
    setGraphMentionOpen(false);
    return;
  }

  const trigger = match[2];
  const query = match[3] || '';
  const at = beforeCaret.length - query.length - 1;
  if (/[\n\r]/.test(query) || query.length > 26) {
    setGraphMentionOpen(false);
    return;
  }

  const items = graphMentionCandidates(query, trigger);
  setGraphMentionOpen(items.length > 0, {
    at,
    query,
    trigger,
    activeIndex: Math.min(graphMentionState.activeIndex, Math.max(0, items.length - 1)),
    items,
  });
}

function insertGraphMention(nodeId) {
  const input = dom.graphMemoNote;
  const node = graphNodeById(nodeId);
  if (!input || !node || graphMentionState.at < 0) return;

  const caret = input.selectionStart ?? input.value.length;
  const before = input.value.slice(0, graphMentionState.at);
  const after = input.value.slice(caret);
  const mention = `${graphReferencePrefix(node.kind)}${node.label}`;
  const spacer = after.startsWith(' ') || after.startsWith('\n') || !after ? ' ' : '';
  const nextValue = `${before}${mention}${spacer}${after}`;
  const nextCaret = before.length + mention.length + spacer.length;

  input.value = nextValue;
  input.focus();
  input.setSelectionRange(nextCaret, nextCaret);
  setGraphMentionOpen(false);
}

function mentionedGraphReferenceIds(note, currentNodeId = '') {
  const textValue = String(note || '');
  return graphState.nodes
    .filter((node) => node.id !== currentNodeId)
    .filter((node) => textValue.includes(`${graphReferencePrefix(node.kind)}${node.label}`))
    .map((node) => node.id);
}

function autoMapMentionRelations(node, mentionIds = [], note = '') {
  if (!node || !mentionIds.length) return [];

  const createdOrUpdated = [];
  mentionIds.forEach((targetId) => {
    const target = graphNodeById(targetId);
    if (!target) return;

    const link = upsertGraphLink({
      sourceId: node.id,
      targetId,
      label: graphRelationLabelForKinds(node.kind, target.kind),
      basis: [
        `${graphReferencePrefix(target.kind)}${target.label} 참조로 자동 연결`,
        node.label ? `기준 노드: ${node.label}` : '',
        note ? `메모: ${note.slice(0, 160)}` : '',
      ].filter(Boolean).join(' · '),
      strength: 'weak',
    });

    if (link) createdOrUpdated.push(link);
  });

  return createdOrUpdated;
}

function openGraphMemo(nodeId) {
  const node = graphNodeById(nodeId);
  if (!node) return;

  setGraphMentionOpen(false);
  const isEvent = node.kind === 'event';
  const isEvidence = node.kind === 'evidence';
  const isSourceSpan = node.kind === 'source_span';
  const isClaim = node.kind === 'claim';
  const isInference = node.kind === 'inference';
  const isLegalElement = node.kind === 'legal_element';
  const isHypothesis = node.kind === 'hypothesis';
  graphMemoNodeId = node.id;
  graphMemoClusterId = null;
  if (dom.graphMemoKicker) dom.graphMemoKicker.textContent = `${graphKindLabel(node.kind)} 노드 편집`;
  const isPremise = node.kind === 'premise' || isInference || isLegalElement;
  if (dom.graphMemoTitle) dom.graphMemoTitle.textContent = isEvent ? '주요 사건 정리' : isEvidence || isSourceSpan ? '근거 정리' : isClaim || isHypothesis ? '주장 정리' : isPremise ? '기반명제 정리' : '인물 정리';
  if (dom.graphMemoNameLabel) dom.graphMemoNameLabel.textContent = isEvent ? '사건명' : isEvidence || isSourceSpan ? '근거명' : isClaim || isHypothesis ? '주장 제목' : isPremise ? '기반명제 제목' : '인물명';
  if (dom.graphMemoRoleLabel) dom.graphMemoRoleLabel.textContent = isEvent ? '사건 유형' : isEvidence || isSourceSpan ? '근거 유형·출처' : isClaim || isHypothesis ? '주장 유형' : isPremise ? '기반명제 역할' : '역할·관계';
  if (dom.graphMemoDateLabel) dom.graphMemoDateLabel.textContent = isEvent ? '사건 일자' : '작성·확보 일자';
  if (dom.graphMemoTimeLabel) dom.graphMemoTimeLabel.textContent = isEvent ? '사건 시간' : '작성·확보 시간';
  if (dom.graphMemoNoteLabel) dom.graphMemoNoteLabel.textContent = isEvent ? '사건 메모' : isEvidence || isSourceSpan ? '근거 메모' : isClaim || isHypothesis ? '주장 메모' : isPremise ? '기반명제 메모' : '인물 메모';
  if (dom.graphMemoHint) {
    dom.graphMemoHint.innerHTML = isEvent
      ? '주요사건은 <b>일자와 시간</b>을 입력하면 시간순 그래프에 반영됩니다. 메모에서 <b>@인물</b>, <b>#사건</b>, <b>$근거</b>를 입력하면 저장 시 관계선으로 자동 연결됩니다.'
      : isEvidence || isSourceSpan
        ? '근거에는 <b>자료명:</b>, <b>작성·확보 시점:</b>, <b>보관 경로:</b>, <b>어떤 주장을 뒷받침하는지</b>를 적어주세요.'
        : isClaim || isHypothesis
          ? '주장에는 <b>누가 무엇을 주장하는지</b>, <b>어떤 사건에서 나온 주장인지</b>, <b>근거가 무엇인지</b>를 적어주세요.'
          : isPremise
            ? '기반명제에는 주장을 이해하기 위해 먼저 참이어야 하는 전제 사실을 적어주세요.'
            : '인물에는 <b>행위:</b>, <b>진술:</b>, <b>관련 사건:</b>, <b>이해관계:</b>를 적어주세요.';
  }
  if (dom.graphMemoLabel) dom.graphMemoLabel.value = node.label || '';
  if (dom.graphMemoRole) dom.graphMemoRole.value = node.role || '';
  if (dom.graphMemoTimeFields) dom.graphMemoTimeFields.hidden = !(isEvent || isEvidence || isSourceSpan);
  if (dom.graphMemoDate) {
    dom.graphMemoDate.value = (isEvent || isEvidence || isSourceSpan) ? node.eventDate || node.timeStart?.slice(0, 10) || '' : '';
    dom.graphMemoDate.required = isEvent;
  }
  if (dom.graphMemoTime) {
    dom.graphMemoTime.value = (isEvent || isEvidence || isSourceSpan) ? node.eventTime || '' : '';
    dom.graphMemoTime.required = isEvent;
  }
  if (dom.graphMemoNote) dom.graphMemoNote.value = node.note || '';
  if (dom.graphMemoLabel) dom.graphMemoLabel.placeholder = isEvent ? '예: 6월 3일 면담, 자료 제출 요구' : isEvidence || isSourceSpan ? '예: CCTV 파일, 진술서, PDF 자료' : isClaim || isHypothesis ? '예: 원금 보장 발언 주장' : isPremise ? '예: 송금이 이루어졌다는 전제 사실' : '예: 인물 1, 기관명, 담당자';
  if (dom.graphMemoRole) dom.graphMemoRole.placeholder = isEvent ? '예: 발언, 제출, 충돌, 요청, 회의' : isEvidence || isSourceSpan ? '예: PDF 자료, CCTV, 녹취록, 캡처' : isClaim || isHypothesis ? '예: 당사자 주장, 반박 주장, 문서 기반 주장' : isPremise ? '예: 전제 사실, 배경 사실, 연결 사실' : '예: 직접 행위자, 목격자, 관리자';
  if (dom.graphMemoNote) {
    dom.graphMemoNote.placeholder = isEvent
      ? '장소, 참여자, 행위 순서, 남은 증거를 적어주세요. 예: @인물1이 #교실사건에서 $CCTV에 남은 행위를 함'
      : isEvidence
        ? '원본성, 작성자, 작성·확보 시점, 보관 경로, 입증하려는 사실을 적어주세요. 예: $CCTV는 #교실사건과 @인물1의 동선을 확인하는 자료'
        : '행위, 진술, 증거, 관계 근거를 적어주세요. 예: @인물1은 #교실사건 직후 $담임메모에 언급됨';
  }
  if (dom.graphMemoSave) dom.graphMemoSave.textContent = '그래프에 저장';
  setGraphMemoLayer(node.layer || 'uncertain');
  setGraphMemoOpen(true);
  requestAnimationFrame(() => {
    if (isEvent && !node.eventDate) {
      dom.graphMemoDate?.focus();
      return;
    }
    if (isEvent && !node.eventTime) {
      dom.graphMemoTime?.focus();
      return;
    }
    dom.graphMemoNote?.focus();
  });
}

function openGraphClusterMemo(clusterId) {
  const cluster = graphClusterById(clusterId);
  if (!cluster) return;

  setGraphMentionOpen(false);
  graphMemoNodeId = null;
  graphMemoClusterId = cluster.id;
  const clusterNodes = cluster.nodeIds.map(graphNodeById).filter(Boolean);
  if (dom.graphMemoKicker) dom.graphMemoKicker.textContent = '클러스터 편집';
  if (dom.graphMemoTitle) dom.graphMemoTitle.textContent = '사안 묶음 분석';
  if (dom.graphMemoNameLabel) dom.graphMemoNameLabel.textContent = '클러스터명';
  if (dom.graphMemoRoleLabel) dom.graphMemoRoleLabel.textContent = '분석 초점';
  if (dom.graphMemoNoteLabel) dom.graphMemoNoteLabel.textContent = '클러스터 분석 메모';
  if (dom.graphMemoHint) {
    dom.graphMemoHint.innerHTML = '클러스터는 <b>사용자가 직접 묶은 분석 단위</b>입니다. 명령 블록과 그래프 저장 시 포함 노드와 관계선이 함께 보존됩니다.';
  }
  if (dom.graphMemoLabel) dom.graphMemoLabel.value = cluster.label || '';
  if (dom.graphMemoRole) dom.graphMemoRole.value = cluster.focus || '관계 묶음';
  if (dom.graphMemoTimeFields) dom.graphMemoTimeFields.hidden = true;
  if (dom.graphMemoDate) {
    dom.graphMemoDate.value = '';
    dom.graphMemoDate.required = false;
  }
  if (dom.graphMemoTime) {
    dom.graphMemoTime.value = '';
    dom.graphMemoTime.required = false;
  }
  if (dom.graphMemoNote) dom.graphMemoNote.value = cluster.note || `포함 노드: ${clusterNodes.map((node) => node.label).join(', ')}`;
  if (dom.graphMemoLabel) dom.graphMemoLabel.placeholder = '예: 1차 대면 상황, 증거 공백 구간, 관계 충돌 묶음';
  if (dom.graphMemoRole) dom.graphMemoRole.placeholder = '예: 핵심 장면, 증거 대조, 진술 충돌, 시간대 묶음';
  if (dom.graphMemoNote) {
    dom.graphMemoNote.placeholder = '이 묶음이 어떤 시점·장소·관계·증거 공백을 설명하는지 적어주세요. 예: 포함 노드들이 같은 면담 장면에 속함 / 관계 근거는 문자 캡처 확인 필요';
  }
  if (dom.graphMemoSave) dom.graphMemoSave.textContent = '클러스터 저장';
  setGraphMemoLayer(cluster.layer || 'support');
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
  if (dom.graphRelationType) dom.graphRelationType.value = link.type || 'LEGACY_RELATED_TO';
  if (dom.graphRelationRole) dom.graphRelationRole.value = link.role || '';
  if (dom.graphRelationVerification) dom.graphRelationVerification.value = link.verificationStatus || 'unverified';
  if (dom.graphRelationLegalSufficiency) {
    dom.graphRelationLegalSufficiency.value = link.assessment?.legalSufficiency || 'not_applicable';
  }
  if (dom.graphRelationExtractionConfidence) {
    dom.graphRelationExtractionConfidence.value = link.assessment?.extractionConfidence || 'unknown';
  }
  if (dom.graphRelationSourceReliability) {
    dom.graphRelationSourceReliability.value = link.assessment?.sourceReliability || 'unknown';
  }
  if (dom.graphRelationSourceQuote) {
    const firstQuote = (link.sourceRefs || []).map((ref) => ref?.quote).find(Boolean) || '';
    dom.graphRelationSourceQuote.value = firstQuote;
  }
  if (dom.graphRelationBasis) dom.graphRelationBasis.value = link.basis || '';
  setGraphRelationStrength(link.strength || 'weak');
  renderKnowledgeGraph();
  setGraphRelationOpen(true);
  requestAnimationFrame(() => dom.graphRelationLabel?.focus());
}

function graphRelationSourceRefsFromForm(link) {
  const quote = String(dom.graphRelationSourceQuote?.value || '').trim().slice(0, 1400);
  const existingRefs = Array.isArray(link?.sourceRefs) ? link.sourceRefs : [];
  if (!quote) return existingRefs;

  const baseRef = existingRefs[0] || {};
  return [
    {
      sourceNodeId: baseRef.sourceNodeId || null,
      evidenceNodeId: baseRef.evidenceNodeId || null,
      fileName: baseRef.fileName || '',
      pageNumber: baseRef.pageNumber ?? null,
      paragraphIndex: baseRef.paragraphIndex ?? null,
      startOffset: baseRef.startOffset ?? null,
      endOffset: baseRef.endOffset ?? null,
      quote,
    },
    ...existingRefs.slice(1),
  ];
}

function saveGraphRelation({ status = 'draft' } = {}) {
  const link = graphLinkById(graphRelationId);
  if (!link) return null;

  if (link.isCandidate) {
    const sourceCandidate = (graphState.relationCandidates || []).find((item) => item.id === link.id);
    if (!sourceCandidate) return null;
    const candidateSourceRefs = graphRelationSourceRefsFromForm(link);
    const requestedVerificationStatus = String(dom.graphRelationVerification?.value || 'asserted');
    const safeVerificationStatus = candidateSourceRefs.some((ref) => String(ref?.quote || '').trim())
      ? requestedVerificationStatus
      : 'unverified';
    const acceptedEdge = relationCandidateToEdge(sourceCandidate, {
      id: `link-${Date.now()}-${graphState.links.length + 1}`,
      type: String(dom.graphRelationType?.value || link.type || 'LEGACY_RELATED_TO'),
      role: String(dom.graphRelationRole?.value || '').trim().slice(0, 80),
      label: normalizeEntityName(dom.graphRelationLabel?.value) || String(dom.graphRelationType?.value || link.type || '관계'),
      basis: String(dom.graphRelationBasis?.value || '').trim().slice(0, 1400),
      verificationStatus: safeVerificationStatus,
      assessment: {
        ...defaultAssessment(link.assessment || {}),
        extractionConfidence: String(dom.graphRelationExtractionConfidence?.value || 'unknown'),
        sourceReliability: String(dom.graphRelationSourceReliability?.value || 'unknown'),
        supportStrength: graphRelationStrength === 'confirmed' ? 'strong' : graphRelationStrength === 'likely' ? 'moderate' : 'weak',
        legalSufficiency: String(dom.graphRelationLegalSufficiency?.value || 'not_applicable'),
      },
      sourceRefs: candidateSourceRefs,
      createdBy: 'user',
    });
    graphState = {
      ...graphState,
      links: [...graphState.links, { ...acceptedEdge, strength: graphRelationStrength, analysisStatus: status }],
      relationCandidates: (graphState.relationCandidates || []).map((candidate) => (
        candidate.id === link.id
          ? { ...candidate, status: 'accepted', reviewedAt: new Date().toISOString() }
          : candidate
      )),
      selectedLinkId: acceptedEdge.id,
      selectedNodeId: null,
    };
    graphRelationId = acceptedEdge.id;
    renderAll();
    scheduleGraphRemotePersistence('graph_relation_candidate_accept');
    return acceptedEdge;
  }

  const nextSourceRefs = graphRelationSourceRefsFromForm(link);
  const nextRequestedVerificationStatus = String(dom.graphRelationVerification?.value || link.verificationStatus || 'unverified');
  const nextSafeVerificationStatus = nextSourceRefs.some((ref) => String(ref?.quote || '').trim())
    ? nextRequestedVerificationStatus
    : 'unverified';
  const nextLink = {
    ...link,
    label: normalizeEntityName(dom.graphRelationLabel?.value) || '관계',
    type: String(dom.graphRelationType?.value || link.type || 'LEGACY_RELATED_TO'),
    role: String(dom.graphRelationRole?.value || '').trim().slice(0, 80),
    verificationStatus: nextSafeVerificationStatus,
    assessment: {
      ...defaultAssessment(link.assessment || {}),
      extractionConfidence: String(dom.graphRelationExtractionConfidence?.value || link.assessment?.extractionConfidence || 'unknown'),
      sourceReliability: String(dom.graphRelationSourceReliability?.value || link.assessment?.sourceReliability || 'unknown'),
      supportStrength: graphRelationStrength === 'confirmed' ? 'strong' : graphRelationStrength === 'likely' ? 'moderate' : 'weak',
      legalSufficiency: String(dom.graphRelationLegalSufficiency?.value || link.assessment?.legalSufficiency || 'not_applicable'),
    },
    sourceRefs: nextSourceRefs,
    basis: String(dom.graphRelationBasis?.value || '').trim().slice(0, 1400),
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
  scheduleGraphRemotePersistence('graph_relation_save');
  return nextLink;
}

function deleteGraphRelation() {
  const link = graphLinkById(graphRelationId);
  if (!link) return false;

  if (link.isCandidate) {
    graphState = {
      ...graphState,
      relationCandidates: (graphState.relationCandidates || []).map((candidate) => (
        candidate.id === link.id
          ? { ...candidate, status: 'rejected', reviewedAt: new Date().toISOString() }
          : candidate
      )),
      selectedLinkId: null,
    };
    renderAll();
    scheduleGraphRemotePersistence('graph_relation_candidate_reject');
    return true;
  }

  graphState = {
    ...graphState,
    links: graphState.links.filter((item) => item.id !== link.id),
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? link.source : graphState.pendingLinkNodeId,
  };
  renderAll();
  scheduleGraphRemotePersistence('graph_relation_delete');
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

function normalizeGraphReferenceName(value) {
  const base = normalizeEntityName(
    String(value || '')
      .replace(/^[#@$]+/, '')
      .replace(/^\[/, '')
      .replace(/\]$/, '')
  );
  if (base.length < 3) return base;

  let next = base;
  for (let index = 0; index < 3; index += 1) {
    const stripped = next.replace(/(?:에게서|으로부터|에게|에서|으로|로|에는|에게는|와는|과는|은|는|이|가|을|를|와|과|의|도|만)$/u, '');
    if (stripped === next || stripped.length < 2) break;
    next = stripped;
  }

  return next;
}

function graphNodeByKindAndLabel(kind, label) {
  const nodeKind = normalizeGraphKind(kind);
  const normalizedLabel = normalizeGraphReferenceName(label).toLowerCase();
  if (!normalizedLabel) return null;

  return graphState.nodes.find((node) => (
    normalizeGraphKind(node.kind) === nodeKind
    && normalizeGraphReferenceName(node.label).toLowerCase() === normalizedLabel
  )) ?? null;
}

function graphNodeByLabelAnyKind(label) {
  const normalizedLabel = normalizeGraphReferenceName(label).toLowerCase();
  if (!normalizedLabel) return null;

  return graphState.nodes.find((node) => (
    normalizeGraphReferenceName(node.label).toLowerCase() === normalizedLabel
  )) ?? null;
}

function isEvidenceLikeLabel(label) {
  return /cctv|녹취|녹음|녹취록|캡처|문자|카톡|메일|진술서|메모|pdf|보고서|사진|영상|파일|출석부|상담록|회의록|압수물|통화기록|증거|자료|문서|게시글|게시물|댓글|블로그|카페글|sns|포렌식|계좌|송금내역|입금내역|영수증/i.test(String(label || ''));
}

function isEventLikeLabel(label) {
  return /사건|사안|상황|회의|통화|제출|조사|상담|방문|폭행|협박|민원|신고|진술|기록|발생|대화|면담|충돌|송금|입금|게시|삭제|전송|촬영|접촉|연락|보고|요청|거절/.test(String(label || ''));
}

function isPersonLikeLabel(label) {
  const text = normalizeGraphReferenceName(label);
  if (!text || isEvidenceLikeLabel(text) || isEventLikeLabel(text)) return false;
  if (/교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장|수사관|경찰|검사|피의자|피해자|참고인|진술자/.test(text)) return true;
  return /^[가-힣]{2,5}$/.test(text) || /^[A-Z][A-Za-z]{1,20}$/.test(text);
}

function normalizeExtractedGraphKind(label, declaredKind = 'unknown') {
  const normalizedLabel = normalizeGraphReferenceName(label);
  const declared = normalizeGraphKind(declaredKind);
  if (declared === 'source_span') return 'evidence';
  if (['inference', 'legal_element'].includes(declared)) return 'premise';
  if (declared === 'hypothesis') return 'claim';

  if (isEvidenceLikeLabel(normalizedLabel)) return 'evidence';
  if (isEventLikeLabel(normalizedLabel) && declared !== 'evidence') return 'event';
  if (declared === 'person' && /게시|글|댓글|자료|문서|파일|기록|상황|사건|메모|계좌|내역/.test(normalizedLabel)) {
    return inferGraphKindFromLabel(normalizedLabel, 'unknown');
  }
  if (declared === 'unknown' && isPersonLikeLabel(normalizedLabel)) return 'person';

  return declared;
}

function inferGraphKindFromLabel(label, fallbackKind = 'unknown') {
  const normalizedLabel = normalizeGraphReferenceName(label);
  const existing = graphNodeByLabelAnyKind(normalizedLabel);
  if (existing) return normalizeGraphKind(existing.kind);

  const text = normalizedLabel.toLowerCase();
  if (/[#$]/.test(String(label || '').charAt(0))) {
    return graphReferenceKindFromTrigger(String(label || '').charAt(0));
  }

  if (isEvidenceLikeLabel(text)) {
    return 'evidence';
  }

  if (isEventLikeLabel(normalizedLabel)) {
    return 'event';
  }

  if (isPersonLikeLabel(normalizedLabel)) return 'person';

  return normalizeGraphKind(fallbackKind);
}

function graphRelationLabelForKinds(leftKind, rightKind) {
  const kinds = [normalizeGraphKind(leftKind), normalizeGraphKind(rightKind)].sort().join(':');
  if (kinds === 'event:person') return '사건 관련';
  if (kinds === 'event:evidence') return '증거 연결';
  if (kinds === 'evidence:person') return '증거 관련';
  if (kinds === 'event:event') return '시간·맥락';
  if (kinds === 'evidence:evidence') return '증거 맥락';
  return '관계';
}

function sentenceChunks(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?。！？])\s+|\n+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function contextSnippetForGraphNode(label, kind, context = '', fallback = '') {
  const normalizedLabel = normalizeGraphReferenceName(label);
  const chunks = sentenceChunks(context);
  const mentioned = normalizedLabel
    ? chunks.filter((chunk) => (
        chunk.includes(normalizedLabel)
        || chunk.includes(`${graphReferencePrefix(kind)}${normalizedLabel}`)
      ))
    : [];
  const snippet = mentioned.slice(0, 2).join('\n');
  return compactText(snippet || fallback || '').slice(0, 700);
}

function graphTextLabelFromContent(value, fallback = '') {
  const text = compactText(value)
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

function isInternalGraphLabel(label) {
  return /^(?:person|event|evidence|claim|premise|source[_\s-]?span|span|inference|legal[_\s-]?element|hypothesis|candidate|node|edge|link)[_\s:-]*\d*$/i.test(String(label || '').trim());
}

function internalGraphLabelIndex(label) {
  const match = String(label || '').trim().match(/(\d+)\s*$/);
  const number = Number(match?.[1]);
  return Number.isFinite(number) && number > 0 ? number - 1 : 0;
}

function humanizeGraphPatchLabel(kind, label, options = {}) {
  const normalizedKind = normalizeGraphKind(kind);
  const text = normalizeGraphReferenceName(label);
  const index = Number.isFinite(Number(options.index)) ? Number(options.index) : internalGraphLabelIndex(text);
  const claimText = compactText(options.claimText || '');
  const quote = compactText(options.sourceRefs?.[0]?.quote || '');
  const note = compactText(options.note || '');
  const fallbackByKind = {
    person: `인물 ${index + 1}`,
    event: `주요 사건 ${index + 1}`,
    evidence: `근거 ${index + 1}`,
    source_span: `근거 ${index + 1}`,
    claim: `주장 ${index + 1}`,
    premise: `기반명제 ${index + 1}`,
    inference: `기반명제 ${index + 1}`,
    legal_element: `기반명제 ${index + 1}`,
    hypothesis: `주장 ${index + 1}`,
    unknown: `미분류 ${index + 1}`,
  };
  const fallback = fallbackByKind[normalizedKind] || `${graphKindLabel(normalizedKind)} ${index + 1}`;
  const isInternal = isInternalGraphLabel(text);

  if (normalizedKind === 'source_span') {
    if (!text || isInternal || /source[_\s-]?span|원문\s*구간/i.test(text)) {
      return fallback;
    }
  }

  if (normalizedKind === 'claim') {
    if (!text || isInternal || /^명제\s*\d*$/i.test(text)) {
      return graphTextLabelFromContent(claimText || quote || note, fallback);
    }
  }

  if (normalizedKind === 'premise') {
    if (!text || isInternal || /^기반명제\s*\d*$/i.test(text)) {
      return graphTextLabelFromContent(claimText || note || quote, fallback);
    }
  }

  if (['person', 'event', 'evidence', 'inference', 'legal_element', 'hypothesis', 'unknown'].includes(normalizedKind) && (!text || isInternal)) {
    if (['event', 'evidence', 'hypothesis', 'inference', 'legal_element'].includes(normalizedKind)) {
      return graphTextLabelFromContent(note || quote, fallback);
    }
    return fallback;
  }

  return text || fallback;
}

function fallbackSourceRefFromText(quote, sourceText, overrides = {}) {
  const normalizedQuote = compactText(quote);
  if (!normalizedQuote || !sourceText.includes(normalizedQuote)) return null;
  const startOffset = sourceText.indexOf(normalizedQuote);
  return {
    sourceNodeId: overrides.sourceNodeId || '',
    evidenceNodeId: overrides.evidenceNodeId || '',
    fileName: overrides.fileName || '',
    pageNumber: null,
    paragraphIndex: null,
    startOffset,
    endOffset: startOffset + normalizedQuote.length,
    quote: normalizedQuote,
  };
}

function parseGraphReferences(text) {
  const refs = [];
  const pattern = /([@#$])\[([^\]]{1,80})\]|([@#$])([가-힣A-Za-z0-9_.·ㆍ-]{1,50})/g;
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    const trigger = match[1] || match[3] || '@';
    const rawName = match[2] || match[4] || '';
    const label = normalizeGraphReferenceName(rawName);
    if (!label) continue;
    refs.push({
      trigger,
      kind: graphReferenceKindFromTrigger(trigger),
      label,
      raw: match[0],
      index: match.index,
    });
  }

  return refs.filter((ref, index, list) => (
    list.findIndex((item) => item.kind === ref.kind && item.label === ref.label) === index
  ));
}

function parseFallbackGraphList(text, keys) {
  const values = [];
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:${keyPattern})\\s*[:：]\\s*(.+)`, 'gi');
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    splitGraphValues(match[1]).forEach((item) => {
      if (!values.includes(item)) values.push(item);
    });
  }

  return values.slice(0, 12);
}

function uniqueGraphLabels(values, maxItems = 12) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const label = normalizeGraphReferenceName(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    result.push(label);
  });

  return result.slice(0, maxItems);
}

function inferPlainPersonReferences(text) {
  const blocked = new Set(['사건', '상황', '증거', '자료', '문서', '교실', '학교', '시간', '장소', '기록', '관계', '메모']);
  const values = [];
  const pattern = /([가-힣A-Za-z0-9]{2,12}(?:교사|학생|학부모|담당자|피해자|가해자|목격자|관리자|담임|부장|교감|교장)|[가-힣]{2,5})(?:\s*)(?:이|가|은|는|을|를|에게|와|과|로부터|쪽이)/g;
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    const label = normalizeGraphReferenceName(match[1]);
    if (!label || blocked.has(label)) continue;
    values.push(label);
  }

  return uniqueGraphLabels(values, 8);
}

function inferPlainEvidenceReferences(text) {
  const values = [];
  const pattern = /([가-힣A-Za-z0-9_.-]{0,12}(?:CCTV|녹취|녹음|캡처|문자|카톡|메일|진술서|메모|PDF|보고서|사진|영상|파일|출석부|상담록|회의록))/gi;
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    values.push(match[1]);
  }

  return uniqueGraphLabels(values, 8);
}

function parseSituationTitle(text) {
  const firstLine = String(text || '').split('\n').map((line) => line.trim()).find(Boolean) || '';
  const keyed = firstLine.match(/(?:사건명|사안명|상황명|제목)\s*[:：]\s*(.+)/i)?.[1] || '';
  const clean = normalizeEntityName(keyed || firstLine.replace(/[@#$]\[?[^\s\]]+\]?/g, '').trim());
  return clean || `상황 기록 ${graphState.nextEventNumber || 1}`;
}

function parseSituationDateTime(text) {
  const source = String(text || '');
  const now = new Date();
  let year = now.getFullYear();
  let month = '';
  let day = '';

  const iso = source.match(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})\s*일?/);
  const korean = source.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);

  if (iso) {
    year = Number(iso[1]);
    month = iso[2];
    day = iso[3];
  } else if (korean) {
    year = korean[1] ? Number(korean[1]) : year;
    month = korean[2];
    day = korean[3];
  }

  const timeMatch = source.match(/(오전|오후)?\s*(\d{1,2})\s*(?:시|:)\s*(?:(\d{1,2})\s*분?)?/);
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

  const eventDate = month && day
    ? `${String(year).padStart(4, '0')}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
    : '';

  return { eventDate, eventTime };
}

function situationGraphAnchorPoint() {
  const rect = dom.graphCanvas?.getBoundingClientRect();
  if (!rect) return { x: 240, y: 180 };
  return graphScreenToWorld({
    x: Math.max(160, rect.width * 0.42),
    y: Math.max(130, rect.height * 0.34),
  });
}

function situationGraphPoint(kind, index = 0) {
  const anchor = situationGraphAnchorPoint();
  const normalized = normalizeGraphKind(kind);
  const columnOffset = normalized === 'person' ? -270 : normalized === 'evidence' ? 310 : 0;
  const row = index % 6;
  const column = Math.floor(index / 6);
  return {
    x: anchor.x + columnOffset + column * 150 + (row % 2) * 24,
    y: anchor.y + row * 112,
  };
}

function graphPointsOverlap(left, right, minXGap = 174, minYGap = 112) {
  if (!left || !right) return false;
  return Math.abs(safeGraphNumber(left.x) - safeGraphNumber(right.x)) < minXGap
    && Math.abs(safeGraphNumber(left.y) - safeGraphNumber(right.y)) < minYGap;
}

function findAvailableGraphPoint(preferredPoint, options = {}) {
  const preferred = clampGraphWorldPoint(preferredPoint);
  const excludeIds = new Set(options.excludeIds || []);
  const reserved = Array.isArray(options.reservedPoints) ? options.reservedPoints : [];
  const occupied = [
    ...graphState.nodes
      .filter((node) => !excludeIds.has(node.id))
      .map((node) => ({ id: node.id, x: node.x, y: node.y })),
    ...reserved,
  ];
  const minXGap = options.minXGap || 174;
  const minYGap = options.minYGap || 112;
  const isFree = (point) => !occupied.some((other) => graphPointsOverlap(point, other, minXGap, minYGap));

  if (isFree(preferred)) return preferred;

  const offsets = [{ x: 0, y: 0 }];
  const xStep = minXGap + 34;
  const yStep = minYGap + 28;
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      offsets.push({ x: dx * xStep, y: -ring * yStep });
      offsets.push({ x: dx * xStep, y: ring * yStep });
    }
    for (let dy = -ring + 1; dy <= ring - 1; dy += 1) {
      offsets.push({ x: -ring * xStep, y: dy * yStep });
      offsets.push({ x: ring * xStep, y: dy * yStep });
    }
  }

  for (const offset of offsets) {
    const candidate = clampGraphWorldPoint({
      x: preferred.x + offset.x,
      y: preferred.y + offset.y,
    });
    if (isFree(candidate)) return candidate;
  }

  return preferred;
}

function graphNodeLayoutKind(node = {}) {
  const kind = normalizeGraphKind(node.kind);
  if (kind === 'evidence' && /manual_source|사용자 입력 원문|원자료/i.test(`${node.role || ''} ${node.label || ''}`)) {
    return 'raw';
  }
  if (kind === 'source_span') return 'source';
  if (kind === 'claim') return 'claim';
  if (kind === 'premise') return 'premise';
  if (kind === 'person') return 'person';
  if (kind === 'event') return 'event';
  if (kind === 'evidence') return 'evidence';
  if (['inference', 'legal_element', 'hypothesis'].includes(kind)) return 'analysis';
  return 'other';
}

function autoLayoutGraphNodes(nodeIds = []) {
  const ids = [...new Set([...nodeIds].filter(Boolean))];
  if (!ids.length) return;

  const anchor = situationGraphAnchorPoint();
  const groups = {
    raw: [],
    source: [],
    claim: [],
    premise: [],
    person: [],
    event: [],
    evidence: [],
    analysis: [],
    other: [],
  };

  ids.map(graphNodeById).filter(Boolean).forEach((node) => {
    groups[graphNodeLayoutKind(node)]?.push(node);
  });

  const laneConfig = {
    raw: { x: 560, y: -260, step: 132 },
    source: { x: 560, y: -260, step: 132 },
    event: { x: -80, y: 0, step: 132 },
    person: { x: -380, y: -160, step: 118 },
    claim: { x: 250, y: -30, step: 122 },
    evidence: { x: 560, y: -120, step: 122 },
    premise: { x: 560, y: 170, step: 122 },
    analysis: { x: 560, y: 170, step: 122 },
    other: { x: 520, y: 260, step: 122 },
  };
  const initialPositions = new Map();

  Object.entries(groups).forEach(([groupName, nodes]) => {
    const config = laneConfig[groupName] || laneConfig.other;
    const startY = anchor.y + config.y - ((nodes.length - 1) * config.step) / 2;
    nodes.forEach((node, index) => {
      initialPositions.set(node.id, clampGraphWorldPoint({
        x: anchor.x + config.x + (index % 2) * 18,
        y: startY + index * config.step,
      }));
    });
  });

  const nextPositions = new Map();
  const movingIds = new Set(ids);
  const reservedPoints = [];
  const orderedIds = Object.values(groups).flat().map((node) => node.id);
  orderedIds.forEach((id) => {
    const preferred = initialPositions.get(id);
    if (!preferred) return;
    const point = findAvailableGraphPoint(preferred, {
      excludeIds: movingIds,
      reservedPoints,
      minXGap: 178,
      minYGap: 116,
    });
    nextPositions.set(id, point);
    reservedPoints.push({ id, x: point.x, y: point.y });
  });

  graphState = {
    ...graphState,
    nodes: graphState.nodes.map((node) => {
      const point = nextPositions.get(node.id);
      return point ? { ...node, x: point.x, y: point.y } : node;
    }),
  };
}

function findOrCreateSituationNode(ref, context = '', index = 0) {
  const label = normalizeGraphReferenceName(ref?.label);
  const kind = normalizeGraphKind(ref?.kind);
  if (!label) return null;

  const existing = graphNodeByKindAndLabel(kind, label);
  if (existing) {
    const contextText = contextSnippetForGraphNode(label, kind, context);
    if (contextText && !String(existing.note || '').includes(contextText.slice(0, 80))) {
      graphState = {
        ...graphState,
        nodes: graphState.nodes.map((node) => (
          node.id === existing.id
            ? {
                ...node,
                note: [node.note, contextText].filter(Boolean).join('\n\n').slice(0, 2200),
                memoUpdatedAt: new Date().toISOString(),
              }
            : node
        )),
      };
    }
    return graphNodeById(existing.id);
  }

  const dateTime = parseSituationDateTime(context);
  const point = situationGraphPoint(kind, index);
  return createGraphNode(point.x, point.y, kind, {
    label,
    role: kind === 'event' ? '상황 사건' : kind === 'evidence' ? '증거 자료' : '관련 인물',
    layer: kind === 'event' ? 'core' : kind === 'evidence' ? 'support' : 'uncertain',
    note: contextSnippetForGraphNode(label, kind, context),
    eventDate: kind === 'event' || kind === 'evidence' ? dateTime.eventDate : '',
    eventTime: kind === 'event' ? dateTime.eventTime : '',
  });
}

function buildSituationRelations(nodes, context = '') {
  const uniqueNodes = nodes.filter(Boolean).filter((node, index, list) => (
    list.findIndex((item) => item.id === node.id) === index
  ));
  const candidates = [];

  for (let i = 0; i < uniqueNodes.length; i += 1) {
    for (let j = i + 1; j < uniqueNodes.length; j += 1) {
      const source = uniqueNodes[i];
      const target = uniqueNodes[j];
      const candidate = upsertGraphRelationCandidate({
        source: source.id,
        target: target.id,
        suggestedType: 'LEGACY_RELATED_TO',
        reason: 'same_input',
        basis: String(context || '').trim().slice(0, 500) || '같은 상황 기록에서 함께 참조됨. 직접 근거 승인 전에는 후보 관계입니다.',
        confidence: [source.kind, target.kind].includes('evidence') ? 'low' : 'unknown',
        status: 'pending',
        createdBy: 'rule',
      });
      if (candidate) candidates.push(candidate);
    }
  }

  return candidates;
}

function applySituationTextToGraph(rawText) {
  const text = compactText(rawText);
  if (!text) {
    return { ok: false, reason: '그래프로 변환할 상황 기록이 없습니다.' };
  }

  const before = {
    nodes: graphState.nodes.length,
    links: graphState.links.length,
    candidates: (graphState.relationCandidates || []).length,
  };
  const patch = createSourceClaimPatchFromText(text, { evidenceLabel: '입력된 사안 근거' });
  const result = applyGraphExtractionPatch(patch, text);
  if (!result?.ok) return result;

  const after = {
    nodes: graphState.nodes.length,
    links: graphState.links.length,
    candidates: (graphState.relationCandidates || []).length,
  };

  const lastNode = graphState.nodes[graphState.nodes.length - 1];
  graphState = {
    ...graphState,
    selectedNodeId: lastNode?.id || graphState.selectedNodeId,
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? (lastNode?.id || graphState.pendingLinkNodeId) : graphState.pendingLinkNodeId,
  };

  renderAll();
  scheduleGraphRemotePersistence('situation_text_to_graph');

  return {
    ok: true,
    createdNodes: Math.max(0, after.nodes - before.nodes),
    touchedNodes: result.touchedNodes || 0,
    createdLinks: Math.max(0, after.links - before.links),
    touchedLinks: result.touchedLinks || 0,
    createdCandidates: Math.max(0, after.candidates - before.candidates),
    output: situationTransformOutput(text, {
      createdNodes: Math.max(0, after.nodes - before.nodes),
      touchedNodes: result.touchedNodes || 0,
      createdLinks: Math.max(0, after.links - before.links),
      touchedLinks: result.touchedLinks || 0,
      nodes: graphState.nodes.slice(-Math.max(1, result.touchedNodes || 1)),
    }),
  };
}

function normalizeGraphExtractionPatch(value, sourceText = '') {
  const payload = unwrapPayload(value);
  const candidates = [
    payload?.graphPatch,
    payload?.graph_patch,
    payload?.patch,
    payload?.result?.graphPatch,
    payload?.result?.graph_patch,
    payload?.meta?.graphPatch,
    payload?.meta?.graph_patch,
  ];

  let patch = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    patch = unwrapPayload(candidate);
    if (patch && typeof patch === 'object') break;
  }

  if (!patch || typeof patch !== 'object') return null;

  const nodes = Array.isArray(patch.nodes)
    ? limitExtractedGraphNodes(patch.nodes.map((node, index) => {
        const rawLabel = normalizeGraphReferenceName(node?.label || node?.name || node?.title);
        const kind = normalizeExtractedGraphKind(rawLabel, node?.kind || node?.type || node?.nodeType);
        const claimText = compactText(node?.claimText || '').slice(0, 1800);
        let sourceRefs = filterSourceRefsByText(
          Array.isArray(node?.sourceRefs || node?.source_refs) ? (node.sourceRefs || node.source_refs) : [],
          sourceText
        );
        const directNote = compactText(node?.note || node?.memo || node?.description || node?.summary || claimText || sourceRefs[0]?.quote || '');
        const fallbackRef = fallbackSourceRefFromText(
          kind === 'source_span' ? directNote || sourceText.slice(0, 1200) : claimText || directNote,
          sourceText
        );
        if (!sourceRefs.length && fallbackRef) sourceRefs = [fallbackRef];
        const label = humanizeGraphPatchLabel(kind, rawLabel, {
          index,
          claimText,
          sourceRefs,
          note: directNote,
        });
        return {
          id: String(node?.id || node?.clientId || node?.key || '').slice(0, 120),
          clientId: String(node?.clientId || node?.id || node?.key || '').slice(0, 120),
          kind,
          label,
          role: normalizeEntityName(node?.role || node?.category || node?.subtitle || ''),
          importance: normalizeGraphLayer(node?.importance || node?.layer || node?.status),
          layer: normalizeGraphLayer(node?.importance || node?.layer || node?.status),
          epistemicStatus: node?.epistemicStatus || 'unknown',
          polarity: node?.polarity || 'neutral',
          note: contextSnippetForGraphNode(label, kind, sourceText, directNote).slice(0, 900),
          sourceRefs,
          timeStart: String(node?.timeStart || node?.eventDate || node?.date || '').slice(0, 40),
          timeEnd: String(node?.timeEnd || '').slice(0, 40),
          timePrecision: String(node?.timePrecision || '').slice(0, 40),
          place: String(node?.place || '').slice(0, 180),
          createdBy: node?.createdBy || 'ai',
          eventDate: String(node?.eventDate || node?.date || '').slice(0, 10),
          eventTime: String(node?.eventTime || node?.time || '').slice(0, 5),
          claimText,
          subjectId: String(node?.subjectId || '').slice(0, 120),
          predicate: String(node?.predicate || '').slice(0, 120),
          objectId: String(node?.objectId || '').slice(0, 120),
          value: String(node?.value || '').slice(0, 300),
          templateId: String(node?.templateId || '').slice(0, 120),
          elementKey: String(node?.elementKey || '').slice(0, 120),
          required: Boolean(node?.required),
          description: compactText(node?.description || '').slice(0, 900),
          expectedEvidenceTypes: Array.isArray(node?.expectedEvidenceTypes) ? node.expectedEvidenceTypes : [],
          hypothesisStatus: node?.hypothesisStatus || 'active',
        };
      }).filter((node) => node.label))
    : [];
  const allowedPatchRefs = graphPatchAllowedRefs(nodes);

  const links = Array.isArray(patch.links || patch.relationships)
    ? (patch.links || patch.relationships).map((link) => ({
        source: link?.source || link?.from || link?.sourceLabel || link?.source_name || '',
        target: link?.target || link?.to || link?.targetLabel || link?.target_name || '',
        sourceKind: normalizeGraphKind(link?.sourceKind || link?.source_type || link?.fromKind),
        targetKind: normalizeGraphKind(link?.targetKind || link?.target_type || link?.toKind),
        type: String(link?.type || link?.relationType || '').trim() || graphEdgeTypeFromLabel(link?.label || link?.relation || link?.nature || ''),
        role: String(link?.role || '').slice(0, 80),
        directed: link?.directed !== false,
        label: normalizeEntityName(link?.label || link?.relation || link?.nature || link?.type || '관계') || '관계',
        basis: compactText(link?.basis || link?.evidence || link?.reason || link?.description || '').slice(0, 1200),
        sourceRefs: filterSourceRefsByText(
          Array.isArray(link?.sourceRefs || link?.source_refs) ? (link.sourceRefs || link.source_refs) : [],
          sourceText
        ),
        verificationStatus: link?.verificationStatus || link?.status || 'unverified',
        assessment: link?.assessment || {},
        createdBy: link?.createdBy || 'ai',
        strength: normalizeGraphStrength(link?.strength || link?.confidence || link?.status),
      })).filter((link) => (
        link.source
        && link.target
        && graphPatchEndpointAllowed(link.source, allowedPatchRefs)
        && graphPatchEndpointAllowed(link.target, allowedPatchRefs)
      ))
    : [];

  const relationCandidates = Array.isArray(patch.relation_candidates || patch.relationCandidates)
    ? (patch.relation_candidates || patch.relationCandidates).map((candidate) => ({
        id: String(candidate?.id || '').slice(0, 140),
        source: candidate?.source || '',
        target: candidate?.target || '',
        suggestedType: String(candidate?.suggestedType || candidate?.suggested_type || candidate?.type || 'LEGACY_RELATED_TO').trim(),
        suggestedRole: String(candidate?.suggestedRole || candidate?.suggested_role || candidate?.role || '').slice(0, 80),
        reason: String(candidate?.reason || 'ai_candidate').slice(0, 240),
        basis: compactText(candidate?.basis || candidate?.description || '').slice(0, 1200),
        sourceRefs: filterSourceRefsByText(
          Array.isArray(candidate?.sourceRefs || candidate?.source_refs) ? (candidate.sourceRefs || candidate.source_refs) : [],
          sourceText
        ),
        confidence: candidate?.confidence || 'unknown',
        status: candidate?.status || 'pending',
        createdBy: candidate?.createdBy || 'ai',
        createdAt: candidate?.createdAt || new Date().toISOString(),
        reviewedAt: candidate?.reviewedAt || '',
      })).filter((candidate) => (
        candidate.source
        && candidate.target
        && graphPatchEndpointAllowed(candidate.source, allowedPatchRefs)
        && graphPatchEndpointAllowed(candidate.target, allowedPatchRefs)
      ))
    : [];

  const clusters = Array.isArray(patch.clusters)
    ? patch.clusters.map((cluster) => ({
        label: normalizeEntityName(cluster?.label || cluster?.name || '사안 묶음'),
        focus: normalizeEntityName(cluster?.focus || cluster?.theme || cluster?.role || '관계 묶음'),
        layer: normalizeGraphLayer(cluster?.layer || cluster?.status || 'support'),
        note: compactText(cluster?.note || cluster?.memo || cluster?.description || '').slice(0, 1200),
        nodeLabels: Array.isArray(cluster?.nodeLabels || cluster?.nodes)
          ? (cluster.nodeLabels || cluster.nodes).map((item) => (
              typeof item === 'string' ? item : item?.label || item?.name || item?.id || ''
            )).map(normalizeGraphReferenceName).filter(Boolean).slice(0, 20)
          : [],
      })).filter((cluster) => cluster.nodeLabels.length >= 2)
    : [];

  const normalizedPatch = {
    summary: String(patch.summary || payload?.assistantMessage || payload?.assistant_message || '').trim(),
    nodes,
    links,
    relationCandidates,
    clusters,
    warnings: Array.isArray(patch.warnings) ? patch.warnings.map(String) : [],
  };

  const withSourcePaths = nodes.some((node) => node.kind === 'source_span')
    ? ensureSourceClaimPatchPaths(normalizedPatch, sourceText)
    : normalizedPatch;

  return ensurePatchConnectivityCandidates(withSourcePaths, sourceText);
}

function graphPatchNodeKey(kind, label) {
  return `${normalizeGraphKind(kind)}:${normalizeGraphReferenceName(label).toLowerCase()}`;
}

function upsertGraphPatchNode(nodePatch, index = 0, context = '') {
  const rawLabel = normalizeGraphReferenceName(nodePatch?.label);
  const kind = normalizeExtractedGraphKind(rawLabel, nodePatch?.kind);
  const label = humanizeGraphPatchLabel(kind, rawLabel, {
    index,
    claimText: nodePatch?.claimText,
    sourceRefs: nodePatch?.sourceRefs,
    note: nodePatch?.note || nodePatch?.description || '',
  });
  if (!label) return null;

  const mergeable = !['claim', 'source_span', 'inference'].includes(kind);
  const existing = mergeable ? graphNodeByKindAndLabel(kind, label) : null;
  const dateTime = parseSituationDateTime([nodePatch?.note, context].filter(Boolean).join('\n'));
  const nextRole = normalizeEntityName(nodePatch?.role) || (
    kind === 'event' ? '상황 사건'
      : kind === 'evidence' ? '근거 자료'
        : kind === 'claim' ? '주장'
          : kind === 'premise' ? '기반명제'
          : kind === 'source_span' ? '근거 자료'
            : kind === 'inference' ? '기반명제'
              : kind === 'legal_element' ? '기반명제'
                : kind === 'hypothesis' ? '주장'
                  : '관련 인물'
  );
  const directNote = compactText(
    nodePatch?.note
    || nodePatch?.claimText
    || nodePatch?.description
    || nodePatch?.sourceRefs?.[0]?.quote
    || ''
  );
  const nextNote = contextSnippetForGraphNode(label, kind, context, directNote).slice(0, 900);
  const nextEventDate = nodePatch?.eventDate || (kind === 'event' || kind === 'evidence' ? dateTime.eventDate : '');
  const nextEventTime = nodePatch?.eventTime || (kind === 'event' ? dateTime.eventTime : '');

  if (existing) {
    const updated = {
      ...existing,
      role: nextRole || existing.role,
      layer: normalizeGraphLayer(nodePatch?.layer || existing.layer),
      note: uniqueGraphMemoText(existing.note, nextNote).slice(0, 2200),
      eventDate: nextEventDate || existing.eventDate || '',
      eventTime: nextEventTime || existing.eventTime || '',
      memoUpdatedAt: new Date().toISOString(),
    };

    graphState = {
      ...graphState,
      nodes: graphState.nodes.map((node) => (node.id === existing.id ? updated : node)),
      selectedNodeId: updated.id,
      selectedLinkId: null,
    };
    return updated;
  }

  const point = situationGraphPoint(kind, index);
  return createGraphNode(point.x, point.y, kind, {
    label,
    role: nextRole,
    layer: normalizeGraphLayer(nodePatch?.layer || (kind === 'event' ? 'core' : kind === 'evidence' ? 'support' : 'uncertain')),
    note: nextNote,
    importance: nodePatch?.importance || nodePatch?.layer,
    epistemicStatus: nodePatch?.epistemicStatus,
    polarity: nodePatch?.polarity,
    sourceRefs: nodePatch?.sourceRefs || [],
    timeStart: nodePatch?.timeStart || nextEventDate,
    timeEnd: nodePatch?.timeEnd || '',
    timePrecision: nodePatch?.timePrecision || '',
    place: nodePatch?.place || '',
    createdBy: nodePatch?.createdBy || 'ai',
    eventDate: nextEventDate,
    eventTime: nextEventTime,
    claimText: nodePatch?.claimText || '',
    subjectId: nodePatch?.subjectId || '',
    predicate: nodePatch?.predicate || '',
    objectId: nodePatch?.objectId || '',
    value: nodePatch?.value || '',
    templateId: nodePatch?.templateId || '',
    elementKey: nodePatch?.elementKey || '',
    required: Boolean(nodePatch?.required),
    description: nodePatch?.description || '',
    expectedEvidenceTypes: nodePatch?.expectedEvidenceTypes || [],
    hypothesisStatus: nodePatch?.hypothesisStatus || 'active',
    skipAutoConnect: true,
  });
}

function uniqueGraphMemoText(...parts) {
  const seen = new Set();
  return parts
    .flatMap((part) => String(part || '').split(/\n{2,}/))
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const key = part.slice(0, 140);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n\n');
}

function graphNodeFromMapByLabel(nodeMap, label, preferredKind = '') {
  const normalizedLabel = normalizeGraphReferenceName(label).toLowerCase();
  if (!normalizedLabel) return null;

  const values = [...new Set([...nodeMap.values()])].filter(Boolean);
  const preferred = preferredKind
    ? values.find((node) => (
        normalizeGraphKind(node.kind) === normalizeGraphKind(preferredKind)
        && normalizeGraphReferenceName(node.label).toLowerCase() === normalizedLabel
      ))
    : null;

  if (preferred) return preferred;
  return values.find((node) => normalizeGraphReferenceName(node.label).toLowerCase() === normalizedLabel) ?? null;
}

function resolveGraphPatchNode(endpoint, fallbackKind = 'person', nodeMap = new Map(), sourceText = '') {
  if (!endpoint) return null;

  if (typeof endpoint === 'object') {
    const label = normalizeGraphReferenceName(endpoint.label || endpoint.name || endpoint.id);
    const explicitKind = endpoint.kind || endpoint.type || fallbackKind;
    const kind = inferGraphKindFromLabel(label, explicitKind);
    const mapped = graphNodeFromMapByLabel(nodeMap, label, kind);
    if (mapped) return mapped;

    const existing = graphNodeByKindAndLabel(kind, label) || graphNodeByLabelAnyKind(label);
    if (existing) return existing;

    return upsertGraphPatchNode({ ...endpoint, kind, label }, nodeMap.size, sourceText);
  }

  const raw = String(endpoint || '').trim();
  const ref = parseGraphReferences(raw)[0];
  const label = normalizeGraphReferenceName(ref?.label || raw);
  if (!label) return null;
  const kind = ref?.kind || inferGraphKindFromLabel(label, fallbackKind);

  const mapped = nodeMap.get(graphPatchNodeKey(kind, label));
  if (mapped) return mapped;

  const mappedByLabel = graphNodeFromMapByLabel(nodeMap, label, kind);
  if (mappedByLabel) return mappedByLabel;

  const existing = graphNodeByKindAndLabel(kind, label) || graphNodeByLabelAnyKind(label);
  if (existing) return existing;

  return upsertGraphPatchNode({ kind, label, note: sourceText }, nodeMap.size, sourceText);
}

function graphContextChunks(text) {
  const chunks = sentenceChunks(text);
  return chunks.length ? chunks : [String(text || '').trim()].filter(Boolean);
}

function textMentionsGraphNode(text, node) {
  const label = normalizeGraphReferenceName(node?.label || '');
  const haystack = String(text || '');
  if (!haystack) return false;
  const claimText = compactText(node?.claimText || '');
  const note = compactText(node?.note || '');
  const quotes = Array.isArray(node?.sourceRefs)
    ? node.sourceRefs.map((ref) => compactText(ref?.quote || '')).filter(Boolean)
    : [];

  if (label && (haystack.includes(label) || haystack.includes(`${graphReferencePrefix(node.kind)}${label}`))) return true;
  if (claimText && (haystack.includes(claimText) || claimText.includes(haystack))) return true;
  if (node?.kind === 'source_span' && note && (note.includes(haystack) || haystack.includes(note))) return true;
  return quotes.some((quote) => haystack.includes(quote) || quote.includes(haystack));
}

function nodesShareTextChunk(left, right, chunks) {
  return chunks.some((chunk) => textMentionsGraphNode(chunk, left) && textMentionsGraphNode(chunk, right));
}

function addSemanticGraphLink(source, target, label, basis, strength, touchedLinkIds) {
  if (!source || !target || source.id === target.id) return null;
  const link = upsertGraphLink({
    sourceId: source.id,
    targetId: target.id,
    label,
    basis,
    strength,
  });
  if (link) touchedLinkIds?.add(link.id);
  return link;
}

function upsertGraphRelationCandidate(rawCandidate) {
  const candidate = sanitizeRelationCandidate({
    ...rawCandidate,
    id: rawCandidate?.id || `candidate-${Date.now()}-${(graphState.relationCandidates || []).length + 1}`,
  });
  if (!candidate.source || !candidate.target || candidate.source === candidate.target) return null;

  const existing = (graphState.relationCandidates || []).find((item) => (
    item.source === candidate.source
    && item.target === candidate.target
    && item.suggestedType === candidate.suggestedType
    && String(item.suggestedRole || '') === String(candidate.suggestedRole || '')
    && String(item.reason || '') === String(candidate.reason || '')
  ));

  if (existing) {
    const nextCandidate = {
      ...existing,
      ...candidate,
      id: existing.id,
      status: existing.status === 'rejected' ? 'rejected' : candidate.status,
      reviewedAt: existing.reviewedAt || candidate.reviewedAt,
    };
    graphState = {
      ...graphState,
      relationCandidates: (graphState.relationCandidates || []).map((item) => (
        item.id === existing.id ? nextCandidate : item
      )),
    };
    return nextCandidate;
  }

  graphState = {
    ...graphState,
    relationCandidates: [...(graphState.relationCandidates || []), candidate],
  };
  return candidate;
}

function limitExtractedGraphNodes(nodes = []) {
  const limits = {
    source_span: 0,
    claim: 8,
    premise: 8,
    person: 12,
    event: 8,
    evidence: 8,
    inference: 0,
    legal_element: 0,
    hypothesis: 0,
    unknown: 4,
  };
  const counts = {};

  return nodes.filter((node) => {
    const kind = normalizeGraphKind(node?.kind);
    counts[kind] = (counts[kind] || 0) + 1;
    return counts[kind] <= (limits[kind] || 6);
  });
}

function graphPatchEndpointKey(endpoint) {
  if (!endpoint) return '';
  if (typeof endpoint === 'object') {
    return String(endpoint.id || endpoint.clientId || endpoint.key || endpoint.label || endpoint.name || '').trim();
  }
  return String(endpoint || '').trim();
}

function graphPatchAllowedRefs(nodes = []) {
  const refs = new Set();
  nodes.forEach((node) => {
    [node.id, node.clientId, node.label].forEach((value) => {
      const text = String(value || '').trim();
      if (!text) return;
      refs.add(text);
      refs.add(normalizeGraphReferenceName(text).toLowerCase());
    });
  });
  return refs;
}

function graphPatchEndpointAllowed(endpoint, allowedRefs) {
  const key = graphPatchEndpointKey(endpoint);
  if (!key) return false;
  if (allowedRefs.has(key) || allowedRefs.has(normalizeGraphReferenceName(key).toLowerCase())) return true;
  return Boolean(graphNodeById(key) || graphNodeByLabelAnyKind(key));
}

function generateGraphPatchRelationCandidates(touchedNodes, sourceText, touchedLinkIds) {
  const nodes = touchedNodes.filter(Boolean).filter((node, index, list) => (
    list.findIndex((item) => item.id === node.id) === index
  ));
  if (nodes.length < 2) return 0;

  const people = nodes.filter((node) => node.kind === 'person');
  const events = nodes.filter((node) => node.kind === 'event');
  const evidence = nodes.filter((node) => node.kind === 'evidence');
  const claims = nodes.filter((node) => node.kind === 'claim');
  const sourceSpans = nodes.filter((node) => node.kind === 'source_span');
  const chunks = graphContextChunks(sourceText);
  let created = 0;

  const hasAcceptedLinkBetween = (source, target, type = '') => graphState.links.some((link) => (
    link.verificationStatus !== 'rejected'
    && (
      (link.source === source.id && link.target === target.id)
      || (link.source === target.id && link.target === source.id)
    )
    && (!type || link.type === type)
  ));

  const candidateBetween = (source, target, suggestedType, reason, basis, confidence = 'low', suggestedRole = '') => {
    if (!source || !target || source.id === target.id) return;
    if (hasAcceptedLinkBetween(source, target, suggestedType)) return;
    const candidate = upsertGraphRelationCandidate({
      source: source.id,
      target: target.id,
      suggestedType,
      suggestedRole,
      reason,
      basis,
      confidence,
      status: 'pending',
      createdBy: 'rule',
    });
    if (candidate) created += 1;
  };

  claims.slice(0, 8).forEach((claimNode) => {
    people.slice(0, 10).forEach((personNode) => {
      const sameSentence = nodesShareTextChunk(claimNode, personNode, chunks);
      if (!sameSentence) return;
      candidateBetween(
        claimNode,
        personNode,
        'LEGACY_RELATED_TO',
        'claim_mentions_actor',
        '주장과 인물이 같은 근거 맥락에 등장했습니다. 행위자·진술자·대상자 역할은 승인 전까지 후보로만 둡니다.',
        'medium',
        'actor_context'
      );
    });

    events.slice(0, 8).forEach((eventNode) => {
      const sameSentence = nodesShareTextChunk(claimNode, eventNode, chunks);
      if (!sameSentence) return;
      candidateBetween(
        claimNode,
        eventNode,
        'EXPLAINS',
        'claim_explains_event',
        '주장이 사건 장면을 설명할 가능성이 있어 후보 관계로 표시합니다.',
        'medium'
      );
    });

    evidence.slice(0, 8).forEach((evidenceNode) => {
      if (evidenceNode.role === 'manual_source') return;
      const sameSentence = nodesShareTextChunk(claimNode, evidenceNode, chunks);
      if (!sameSentence) return;
      candidateBetween(
        evidenceNode,
        claimNode,
        'SUPPORTS',
        'evidence_mentions_claim',
        '근거와 주장이 같은 맥락에 등장했습니다. 실제 지지 여부는 근거 확인 후 승인합니다.',
        'medium'
      );
    });
  });

  sourceSpans.slice(0, 3).forEach((spanNode) => {
    [...people, ...events, ...evidence].slice(0, 18).forEach((entityNode) => {
      if (entityNode.role === 'manual_source') return;
      if (!nodesShareTextChunk(spanNode, entityNode, chunks)) return;
      candidateBetween(
        spanNode,
        entityNode,
        'LEGACY_RELATED_TO',
        'source_context_entity',
        '근거와 대상 블록이 같은 발췌 맥락에 등장했습니다. 직접 의미 관계는 승인 전까지 후보로 유지합니다.',
        'medium'
      );
    });
  });

  const primaryEvents = events.length ? events : graphState.nodes.filter((node) => node.kind === 'event').slice(0, 2);

  primaryEvents.forEach((eventNode) => {
    people.slice(0, 8).forEach((personNode) => {
      const sameSentence = nodesShareTextChunk(personNode, eventNode, chunks);
      if (!sameSentence || hasAcceptedLinkBetween(personNode, eventNode, 'PARTICIPATES_AS')) return;
      const candidate = upsertGraphRelationCandidate({
        source: personNode.id,
        target: eventNode.id,
        suggestedType: 'PARTICIPATES_AS',
        suggestedRole: 'unknown',
        reason: 'same_sentence',
        basis: '같은 문장에 인물과 사건이 등장했지만 명시적 역할 근거는 아직 승인되지 않았습니다.',
        confidence: 'medium',
        status: 'pending',
        createdBy: 'rule',
      });
      if (candidate) created += 1;
    });

    evidence.slice(0, 8).forEach((evidenceNode) => {
      const sameSentence = nodesShareTextChunk(evidenceNode, eventNode, chunks);
      if (!sameSentence || hasAcceptedLinkBetween(evidenceNode, eventNode)) return;
      const candidate = upsertGraphRelationCandidate({
        source: evidenceNode.id,
        target: eventNode.id,
        suggestedType: 'LEGACY_RELATED_TO',
        reason: 'same_sentence',
        basis: '같은 문장에 증거와 사건이 등장했지만 정확한 sourceRef.quote가 없어 후보로만 보존합니다.',
        confidence: 'medium',
        status: 'pending',
        createdBy: 'rule',
      });
      if (candidate) created += 1;
    });
  });

  evidence.slice(0, 8).forEach((evidenceNode) => {
    people.slice(0, 8).forEach((personNode) => {
      const directMention = nodesShareTextChunk(evidenceNode, personNode, chunks);
      if (!directMention) return;
      const candidate = upsertGraphRelationCandidate({
        source: evidenceNode.id,
        target: personNode.id,
        suggestedType: 'LEGACY_RELATED_TO',
        reason: 'same_sentence',
        basis: '같은 문장에 증거와 인물이 등장했지만, 증거가 어떤 명제를 지지하는지 sourceRef로 확인해야 합니다.',
        confidence: 'low',
        status: 'pending',
        createdBy: 'rule',
      });
      if (candidate) created += 1;
    });
  });

  return created;
}

function ensureFiveBlockAcceptedConnections(touchedNodes, sourceText, touchedLinkIds) {
  const nodes = touchedNodes.filter(Boolean).filter((node, index, list) => (
    list.findIndex((item) => item.id === node.id) === index
  ));
  if (nodes.length < 2) return 0;

  const chunks = graphContextChunks(sourceText);
  const claims = nodes.filter((node) => node.kind === 'claim');
  const events = nodes.filter((node) => node.kind === 'event');
  const people = nodes.filter((node) => node.kind === 'person');
  const evidence = nodes.filter((node) => node.kind === 'evidence' && node.role !== 'manual_source');
  const premises = nodes.filter((node) => node.kind === 'premise');
  let created = 0;

  const hasDirectLink = (source, target, type = '') => graphState.links.some((link) => (
    link.verificationStatus !== 'rejected'
    && link.source === source.id
    && link.target === target.id
    && (!type || link.type === type)
  ));

  const linkWithContext = (source, target, type, label, role = '') => {
    if (!source || !target || source.id === target.id || hasDirectLink(source, target, type)) return null;
    const sourceRefs = mergeSourceRefsForEdge({}, source, target, sourceText)
      .filter((ref) => sourceRefQuoteExistsInText(ref, sourceText))
      .slice(0, 3);
    if (!sourceRefs.length) return null;
    const link = upsertGraphLink({
      sourceId: source.id,
      targetId: target.id,
      label,
      basis: `${graphKindLabel(source.kind)}와 ${graphKindLabel(target.kind)}가 같은 입력 근거 안에서 직접 연결됩니다.`,
      strength: 'likely',
      type,
      role,
      sourceRefs,
      verificationStatus: 'asserted',
      assessment: {
        extractionConfidence: 'medium',
        sourceReliability: 'unknown',
        supportStrength: 'moderate',
        legalSufficiency: 'not_applicable',
      },
      createdBy: 'rule',
    });
    if (link) {
      touchedLinkIds?.add?.(link.id);
      created += 1;
    }
    return link;
  };

  claims.forEach((claimNode) => {
    const relatedEvents = events.filter((eventNode) => nodesShareTextChunk(claimNode, eventNode, chunks)).slice(0, 1);
    const relatedPeople = people.filter((personNode) => nodesShareTextChunk(claimNode, personNode, chunks)).slice(0, 4);
    const relatedEvidence = evidence.filter((evidenceNode) => nodesShareTextChunk(claimNode, evidenceNode, chunks)).slice(0, 3);
    const relatedPremises = premises.filter((premiseNode) => nodesShareTextChunk(claimNode, premiseNode, chunks)).slice(0, 2);

    relatedEvents.forEach((eventNode) => {
      linkWithContext(eventNode, claimNode, 'EXPLAINS', '주요사건에서 나온 주장');
      relatedPeople.forEach((personNode) => {
        linkWithContext(eventNode, personNode, 'PARTICIPATES_AS', '주요사건 관련 인물', 'related_person');
      });
    });

    relatedPeople.forEach((personNode) => {
      linkWithContext(personNode, claimNode, 'ASSERTS', '인물과 연결된 주장', 'mentioned_actor');
    });

    relatedEvidence.forEach((evidenceNode) => {
      linkWithContext(evidenceNode, claimNode, 'SUPPORTS', '근거 자료가 주장을 뒷받침');
    });

    relatedPremises.forEach((premiseNode) => {
      linkWithContext(premiseNode, claimNode, 'SUPPORTS', '기반명제가 주장을 뒷받침');
    });
  });

  return created;
}

function applyGraphExtractionPatch(patch, sourceText = '') {
  const normalized = normalizeGraphExtractionPatch({ graphPatch: patch }, sourceText) || patch;
  const nodes = Array.isArray(normalized?.nodes) ? normalized.nodes : [];
  const links = Array.isArray(normalized?.links) ? normalized.links : [];
  const relationCandidates = Array.isArray(normalized?.relationCandidates) ? normalized.relationCandidates : [];
  const clusters = Array.isArray(normalized?.clusters) ? normalized.clusters : [];

  if (!nodes.length && !links.length && !relationCandidates.length && !clusters.length) {
    return { ok: false, reason: 'AI가 그래프 패치를 반환하지 않았습니다.' };
  }

  const before = {
    nodes: graphState.nodes.length,
    links: graphState.links.length,
    candidates: (graphState.relationCandidates || []).length,
    clusters: (graphState.clusters || []).length,
  };
  const nodeMap = new Map();
  const touchedNodeIds = new Set();

  nodes.forEach((nodePatch, index) => {
    const node = upsertGraphPatchNode(nodePatch, index, sourceText);
    if (!node) return;
    nodeMap.set(graphPatchNodeKey(node.kind, node.label), node);
    if (nodePatch.id) nodeMap.set(String(nodePatch.id), node);
    if (nodePatch.clientId) nodeMap.set(String(nodePatch.clientId), node);
    touchedNodeIds.add(node.id);
  });

  const touchedLinkIds = new Set();
  links.forEach((linkPatch) => {
    const source = resolveGraphPatchNode(linkPatch.source, linkPatch.sourceKind, nodeMap, sourceText);
    const target = resolveGraphPatchNode(linkPatch.target, linkPatch.targetKind, nodeMap, sourceText);
    if (!source || !target || source.id === target.id) return;
    touchedNodeIds.add(source.id);
    touchedNodeIds.add(target.id);

    const linkSourceRefs = mergeSourceRefsForEdge(linkPatch, source, target, sourceText);
    const hasQuotedSource = linkSourceRefs.some((ref) => sourceRefQuoteExistsInText(ref, sourceText));
    if (!hasQuotedSource) {
      const candidate = upsertGraphRelationCandidate({
        source: source.id,
        target: target.id,
        suggestedType: linkPatch.type || graphEdgeTypeFromLabel(linkPatch.label),
        suggestedRole: linkPatch.role || '',
        reason: 'missing_source_quote',
        basis: linkPatch.basis || 'AI가 관계를 제안했지만 정확한 근거 발췌가 없어 후보로 보존합니다.',
        sourceRefs: linkSourceRefs,
        confidence: linkPatch.assessment?.extractionConfidence || 'unknown',
        status: 'pending',
        createdBy: linkPatch.createdBy || 'ai',
      });
      if (candidate) touchedLinkIds.add(candidate.id);
      return;
    }

    const link = upsertGraphLink({
      sourceId: source.id,
      targetId: target.id,
      label: linkPatch.label || graphRelationLabelForKinds(source.kind, target.kind),
      basis: linkPatch.basis || 'AI 상황 판별에 따른 관계 후보',
      strength: linkPatch.strength || 'weak',
      type: linkPatch.type,
      role: linkPatch.role,
      sourceRefs: linkSourceRefs,
      verificationStatus: linkPatch.verificationStatus || 'asserted',
      assessment: linkPatch.assessment || {},
      createdBy: linkPatch.createdBy || 'ai',
    });
    if (link) touchedLinkIds.add(link.id);
  });

  relationCandidates.forEach((candidatePatch) => {
    const source = resolveGraphPatchNode(candidatePatch.source, '', nodeMap, sourceText);
    const target = resolveGraphPatchNode(candidatePatch.target, '', nodeMap, sourceText);
    if (!source || !target || source.id === target.id) return;
    const candidate = upsertGraphRelationCandidate({
      ...candidatePatch,
      source: source.id,
      target: target.id,
    });
    if (candidate) touchedLinkIds.add(candidate.id);
  });

  ensureFiveBlockAcceptedConnections(
    [...touchedNodeIds].map(graphNodeById).filter(Boolean),
    sourceText,
    touchedLinkIds
  );

  clusters.forEach((clusterPatch) => {
    const clusterNodes = (clusterPatch.nodeLabels || [])
      .map((label) => {
        const normalizedLabel = normalizeGraphReferenceName(label);
        return graphState.nodes.find((node) => normalizeGraphReferenceName(node.label) === normalizedLabel) || null;
      })
      .filter(Boolean);
    if (clusterNodes.length < 2) return;
    clusterNodes.forEach((node) => touchedNodeIds.add(node.id));
    const cluster = createGraphCluster(clusterNodes);
    if (!cluster) return;
    graphState = {
      ...graphState,
      clusters: (graphState.clusters || []).map((item) => (
        item.id === cluster.id
          ? {
              ...item,
              label: clusterPatch.label || item.label,
              focus: clusterPatch.focus || item.focus,
              layer: clusterPatch.layer || item.layer,
              note: clusterPatch.note || item.note,
            }
          : item
      )),
    };
  });

  const enrichedRelations = generateGraphPatchRelationCandidates(
    [...touchedNodeIds].map(graphNodeById).filter(Boolean),
    sourceText,
    touchedLinkIds
  );
  autoLayoutGraphNodes([...touchedNodeIds]);

  const after = {
    nodes: graphState.nodes.length,
    links: graphState.links.length,
    clusters: (graphState.clusters || []).length,
  };

  const selectedNode = graphState.nodes[graphState.nodes.length - 1];
  graphState = {
    ...graphState,
    selectedNodeId: selectedNode?.id || graphState.selectedNodeId,
    selectedLinkId: null,
    pendingLinkNodeId: graphState.linkMode ? (selectedNode?.id || graphState.pendingLinkNodeId) : graphState.pendingLinkNodeId,
  };

  renderAll();
  scheduleGraphRemotePersistence('ai_graph_extraction');

  return {
    ok: true,
    createdNodes: Math.max(0, after.nodes - before.nodes),
    touchedNodes: nodes.length,
    createdLinks: Math.max(0, after.links - before.links),
    touchedLinks: touchedLinkIds.size,
    createdCandidates: Math.max(0, (graphState.relationCandidates || []).length - (before.candidates || 0)),
    enrichedRelations,
    createdClusters: Math.max(0, after.clusters - before.clusters),
    summary: normalized.summary || '',
  };
}

function situationTransformOutput(text, result) {
  const people = result.nodes.filter((node) => node.kind === 'person');
  const events = result.nodes.filter((node) => node.kind === 'event');
  const evidence = result.nodes.filter((node) => node.kind === 'evidence');

  const line = (items) => items.length
    ? items.slice(0, 8).map((node) => `${graphReferencePrefix(node.kind)}${node.label}`).join(', ')
    : '없음';

  return [
    '# 상황 그래프 반영 결과',
    '',
    `- 새 노드: ${result.createdNodes}개`,
    `- 반영 노드: ${result.touchedNodes}개`,
    `- 새 관계선: ${result.createdLinks}개`,
    `- 반영 관계선: ${result.touchedLinks}개`,
    '',
    '## 참조 규칙',
    '- @ 인물 노드',
    '- # 사건 노드',
    '- $ 근거 노드',
    '',
    '## 이번 입력에서 반영된 대상',
    `- 인물: ${line(people)}`,
    `- 사건: ${line(events)}`,
    `- 근거: ${line(evidence)}`,
    '',
    '## 입력 내용',
    text.slice(0, 1800),
  ].join('\n');
}

function graphEdgeTypeFromLabel(label = '') {
  const text = String(label || '').toUpperCase();
  if (/SUPPORT|지지|뒷받침/.test(text)) return 'SUPPORTS';
  if (/ATTACK|공격|반박/.test(text)) return 'ATTACKS';
  if (/UNDERCUT|약화|탄핵/.test(text)) return 'UNDERCUTS';
  if (/SATISF|충족|검토항목|논증항목/.test(text)) return 'SATISFIES';
  if (/ASSERT|주장|명제화/.test(text)) return 'ASSERTS';
  if (/CONTAIN|포함|원문/.test(text)) return 'CONTAINS';
  if (/PARTICIPATE|참여|행위자|목격/.test(text)) return 'PARTICIPATES_AS';
  if (/PRECEDE|선행|이전/.test(text)) return 'PRECEDES';
  if (/CONTRADICT|모순|충돌/.test(text)) return 'CONTRADICTS';
  return 'LEGACY_RELATED_TO';
}

function upsertGraphLink({
  sourceId,
  targetId,
  label = '관계',
  basis = '',
  strength = 'weak',
  type = '',
  role = '',
  sourceRefs = [],
  verificationStatus = 'unverified',
  assessment = null,
  createdBy = 'user',
}) {
  if (!sourceId || !targetId || sourceId === targetId) return null;

  const edgeType = type || graphEdgeTypeFromLabel(label);
  const nextAssessment = {
    ...defaultAssessment(assessment || {}),
    supportStrength: assessment?.supportStrength || (
      normalizeGraphStrength(strength) === 'confirmed'
        ? 'strong'
        : normalizeGraphStrength(strength) === 'likely'
          ? 'moderate'
          : 'weak'
    ),
    legalSufficiency: assessment?.legalSufficiency || 'not_applicable',
  };
  const draft = sanitizeGraphLink({
    id: '',
    source: sourceId,
    target: targetId,
    type: edgeType,
    directed: true,
    role,
    label: normalizeEntityName(label) || edgeType,
    basis: String(basis || '').slice(0, 1400),
    sourceRefs,
    verificationStatus,
    assessment: nextAssessment,
    createdBy,
    strength,
  });

  const existing = graphState.links.find((link) => (
    link.source === draft.source
    && link.target === draft.target
    && (link.type || 'LEGACY_RELATED_TO') === draft.type
    && String(link.role || '') === String(draft.role || '')
  ));

  if (existing) {
    const nextLink = {
      ...existing,
      ...draft,
      id: existing.id,
      label: draft.label || existing.label || draft.type,
      basis: String(basis || existing.basis || '').slice(0, 1400),
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
    ...draft,
    id: `link-${Date.now()}-${graphState.links.length + 1}`,
  };

  graphState = {
    ...graphState,
    links: [...graphState.links, link],
    selectedLinkId: link.id,
  };

  return link;
}

function saveGraphMemo({ status = 'draft' } = {}) {
  const cluster = graphClusterById(graphMemoClusterId);
  if (cluster) {
    const note = String(dom.graphMemoNote?.value ?? '').trim().slice(0, 1600);
    const label = normalizeEntityName(dom.graphMemoLabel?.value) || cluster.label || '사안 묶음';
    const focus = normalizeEntityName(dom.graphMemoRole?.value) || cluster.focus || '관계 묶음';
    const layer = inferGraphLayerFromMemo(note, graphMemoLayer);
    const nextCluster = {
      ...cluster,
      label,
      focus,
      layer,
      note,
      analysisStatus: status,
      memoUpdatedAt: new Date().toISOString(),
    };

    graphState = {
      ...graphState,
      clusters: (graphState.clusters || []).map((item) => (item.id === cluster.id ? nextCluster : item)),
      selectedNodeId: null,
      selectedLinkId: null,
    };
    renderAll();
    scheduleGraphRemotePersistence('graph_cluster_memo_save');

    return {
      cluster: graphClusterById(cluster.id),
    };
  }

  const node = graphNodeById(graphMemoNodeId);
  if (!node) return null;

  const note = String(dom.graphMemoNote?.value ?? '').trim().slice(0, 1600);
  const label = normalizeEntityName(dom.graphMemoLabel?.value) || node.label;
  const role = normalizeEntityName(dom.graphMemoRole?.value) || (node.kind === 'evidence' ? '증거 자료' : '역할 미정');
  const layer = inferGraphLayerFromMemo(note, graphMemoLayer);
  const isEvent = node.kind === 'event';
  const isEvidence = node.kind === 'evidence';
  const eventDate = (isEvent || isEvidence) ? String(dom.graphMemoDate?.value || '').trim() : '';
  const eventTime = (isEvent || isEvidence) ? String(dom.graphMemoTime?.value || '').trim() : '';

  if (isEvent && (!eventDate || !eventTime)) {
    setServiceStatus('사건 노드는 일자와 시간을 모두 입력해야 저장할 수 있습니다.', 'error');
    requestAnimationFrame(() => {
      (!eventDate ? dom.graphMemoDate : dom.graphMemoTime)?.focus();
    });
    return null;
  }

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
            eventDate,
            eventTime,
            analysisStatus: status,
            memoUpdatedAt: new Date().toISOString(),
          }
        : item
    )),
    selectedNodeId: node.id,
    pendingLinkNodeId: graphState.linkMode ? node.id : graphState.pendingLinkNodeId,
  };

  const mentionIds = mentionedGraphReferenceIds(note, node.id);
  const mentionNames = mentionIds
    .map(graphNodeById)
    .filter(Boolean)
    .map((item) => item.label);
  const mappedLinks = autoMapMentionRelations(graphNodeById(node.id), mentionIds, note);
  const relatedNames = [
    ...parseRelatedEntityNames(note, label),
    ...mentionNames,
  ].filter((name, index, list) => name && list.indexOf(name) === index);
  const createdNames = [];
  renderAll();
  scheduleGraphRemotePersistence('graph_memo_save');

  return {
    node: graphNodeById(node.id),
    relatedNames,
    createdNames,
    mappedLinks,
  };
}

function buildGraphMemoAgentMessage(saved) {
  const node = saved?.node;
  if (!node) return '';
  const isEvent = node.kind === 'event';
  const isEvidence = node.kind === 'evidence';
  const recordTitle = isEvent ? '[사건 분석 입력]' : isEvidence ? '[증거 분석 입력]' : '[주체 분석 입력]';
  const eventDateTime = graphEventDateTimeLabel(node);

  return [
    recordTitle,
    `${isEvent ? '사건명' : isEvidence ? '증거명' : '인물·주체명'}: ${node.label}`,
    `${isEvent ? '사건 유형' : isEvidence ? '증거 유형·출처' : '역할·관계'}: ${node.role}`,
    ...(isEvent ? [`사건 일시: ${eventDateTime || '확인 필요'}`] : []),
    ...(isEvidence ? [`작성·확보 시점: ${eventDateTime || '확인 필요'}`] : []),
    `분류: ${graphLayerLabel(node.layer)}`,
    `${isEvent ? '사건 메모' : isEvidence ? '증거 메모' : '인물 메모'}: ${node.note || '확인 필요'}`,
    saved.relatedNames?.length ? `메모에 언급된 관련 노드: ${saved.relatedNames.join(', ')}` : '메모에 언급된 관련 노드: 없음',
    '',
    '요청:',
    isEvent
      ? '- 이 사건을 시간 관련성, 선후관계, 반응 구간, 행위 흐름, 증거 공백의 관점에서 정밀하게 분석해줘.'
      : isEvidence
        ? '- 이 증거를 원본성, 작성·확보 시점, 보관 경로, 입증 취지, 연결 사건·인물, 반대 해석 가능성 관점에서 분석해줘.'
        : '- 이 주체를 역할, 이해관계, 행위, 진술, 증거, 다른 노드와의 관계 역학 관점에서 정밀하게 분석해줘.',
    '- 보고서는 "상황 시각화보드", "사건 노드 기록", "인물 노드 기록" 같은 화면 설명을 쓰지 말고 전문 분석 문서처럼 작성해줘.',
    '- 분석에는 관계 역학, 시간 관련성, 논리적 강점, 논리적 약점, 공략점, 보강 질문을 포함해줘.',
    '- 노드 메모에서 확인 가능한 행위, 증거, 시점, 장소, 관계 근거는 사실·주장·추정·확인 필요로 분리해줘.',
    '- 그래프 노드나 관계선은 사용자가 직접 조작하므로 새 노드 생성 지시는 하지 말고, 보고서의 분석 포인트와 확인 질문으로만 남겨줘.',
  ].join('\n');
}

function clusterNodesAndLinks(cluster) {
  const nodeIds = new Set((cluster?.nodeIds || []).filter(Boolean));
  const nodes = [...nodeIds].map(graphNodeById).filter(Boolean);
  const links = graphState.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  return { nodes, links };
}

function buildGraphClusterAgentMessage(saved) {
  const cluster = saved?.cluster;
  if (!cluster) return '';

  const { nodes, links } = clusterNodesAndLinks(cluster);
  const nodeLines = nodes.length
    ? nodes.map((node) => `- ${graphNodeLabel(node)} / ${graphLayerLabel(node.layer)} / ${node.note || '메모 없음'}`)
    : ['- 포함 노드 없음'];
  const linkLines = links.length
    ? links.map((link) => {
        const source = graphNodeById(link.source);
        const target = graphNodeById(link.target);
        return `- ${source?.label || '미상'} ↔ ${target?.label || '미상'} / ${link.label || '관계'} / ${graphStrengthLabel(link.strength)} / ${link.basis || '근거 확인 필요'}`;
      })
    : ['- 내부 관계선 없음'];

  return [
    '[클러스터 분석 입력]',
    `클러스터명: ${cluster.label}`,
    `분석 초점: ${cluster.focus || '관계 묶음'}`,
    `분류: ${graphLayerLabel(cluster.layer)}`,
    `클러스터 메모: ${cluster.note || '확인 필요'}`,
    '',
    '[포함 노드]',
    ...nodeLines,
    '',
    '[클러스터 내부 관계]',
    ...linkLines,
    '',
    '요청:',
    '- 이 클러스터를 하나의 분석 단위로 보고, 포함 노드와 관계선을 사실·주장·추정·확인 필요로 분해해줘.',
    '- 시간·장소·행위·증거·관계 근거가 서로 어떻게 맞물리는지 관계 역학과 시간 관련성 중심으로 분석해줘.',
    '- 이 묶음의 논리적 강점, 논리적 약점, 공략점, 보강해야 할 자료를 구분해줘.',
    '- 그래프 노드나 관계선은 사용자가 직접 조작하므로 자동 생성 지시는 하지 말고, 부족한 부분은 분석상 빈칸과 확인 질문으로 정리해줘.',
  ].join('\n');
}

function graphSnapshotForAgent() {
  const snapshot = graphSnapshotForStorage();
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    activeLegalTemplateId: graphState.activeLegalTemplateId || 'none',
    selectedNodeId: graphState.selectedNodeId || '',
    selectedLinkId: graphState.selectedLinkId || '',
    nodes: snapshot.state.nodes,
    links: snapshot.state.links,
    relationCandidates: snapshot.state.relationCandidates || [],
    clusters: snapshot.state.clusters,
    commandBlocks: commandBlocks
      .map(sanitizeCommandBlock)
      .filter(Boolean)
      .slice(0, 20),
    analysisResults: graphState.analysisResults || {},
  };
}

function buildGraphNodeStructuredInput(saved) {
  const node = saved?.node;
  if (!node) return null;
  const isEvent = node.kind === 'event';
  const isEvidence = node.kind === 'evidence';

  return {
    kind: `${node.kind || 'unknown'}_node`,
    schemaVersion: GRAPH_SCHEMA_VERSION,
    node: {
      id: node.id,
      type: node.kind || 'unknown',
      label: node.label,
      role: node.role,
      importance: node.importance || node.layer || 'support',
      epistemicStatus: node.epistemicStatus || 'unknown',
      polarity: node.polarity || 'neutral',
      note: node.note,
      sourceRefs: node.sourceRefs || [],
      claimText: node.claimText || '',
      templateId: node.templateId || '',
      elementKey: node.elementKey || '',
      hypothesisStatus: node.hypothesisStatus || '',
      eventDate: node.eventDate || '',
      eventTime: node.eventTime || '',
      timeStart: node.timeStart || '',
      timeEnd: node.timeEnd || '',
      timePrecision: node.timePrecision || '',
      place: node.place || '',
      eventDateTime: graphEventDateTimeLabel(node),
      sourceEvidenceId: node.sourceEvidenceId || '',
      sourceFileName: node.sourceFileName || '',
      relatedNames: saved.relatedNames || [],
      createdNames: saved.createdNames || [],
      parsed: {
        evidence: parseGraphMemoField(node.note, ['증거', '보유 증거', '자료', '문서', 'PDF', '녹취', '카톡', '문자', '메일']),
        actions: parseGraphMemoField(node.note, ['행위', '핵심 행위', '문제 행위', '발언', '요구', '요청', '진술']),
        time: parseGraphMemoField(node.note, ['시점', '일시', '날짜', '시간']),
        place: parseGraphMemoField(node.note, ['장소', '공간', '채널']),
        origin: parseGraphMemoField(node.note, ['원본성', '원본', '작성자', '작성 주체', '출처', '보관 경로', '확보 경로']),
        proofPurpose: parseGraphMemoField(node.note, ['입증 취지', '입증하려는 사실', '증명 대상', '연결 사건']),
        relatedPeople: parseRelatedEntityNames(node.note, node.label),
      },
    },
    analysisFocus: isEvent
      ? ['time_place_sequence', 'participants', 'acts', 'evidence_basis', 'unknown_slots']
      : isEvidence
        ? ['source_reliability', 'custody_path', 'proof_purpose', 'event_actor_connection', 'counter_interpretation', 'unknown_slots']
        : ['role', 'acts', 'statements', 'evidence_basis', 'relationships', 'unknown_slots'],
    graphSnapshot: graphSnapshotForAgent(),
  };
}

function buildGraphClusterStructuredInput(saved) {
  const cluster = saved?.cluster;
  if (!cluster) return null;

  const { nodes, links } = clusterNodesAndLinks(cluster);
  return {
    kind: 'cluster_record',
    schemaVersion: GRAPH_SCHEMA_VERSION,
    cluster: {
      id: cluster.id,
      label: cluster.label,
      focus: cluster.focus || '',
      layer: cluster.layer || 'support',
      note: cluster.note || '',
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.kind || 'unknown',
        label: node.label,
        role: node.role,
        importance: node.importance || node.layer || 'support',
        epistemicStatus: node.epistemicStatus || 'unknown',
        polarity: node.polarity || 'neutral',
        note: node.note,
        eventDate: node.eventDate || '',
        eventTime: node.eventTime || '',
        eventDateTime: graphEventDateTimeLabel(node),
        sourceEvidenceId: node.sourceEvidenceId || '',
        sourceFileName: node.sourceFileName || '',
      })),
      relations: links.map((link) => {
        const source = graphNodeById(link.source);
        const target = graphNodeById(link.target);
        return {
          id: link.id,
          source: source?.label || link.source,
          target: target?.label || link.target,
          type: link.type || 'LEGACY_RELATED_TO',
          role: link.role || '',
          label: link.label || '관계',
          verificationStatus: link.verificationStatus || 'unverified',
          assessment: link.assessment || defaultAssessment(),
          basis: link.basis || '',
        };
      }),
    },
    analysisFocus: ['cluster_context', 'node_roles', 'internal_relations', 'evidence_gaps', 'unknown_slots'],
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
    '[관계 분석 입력]',
    `출발 노드: ${source.label} (${graphKindLabel(source.kind)} · ${source.role || '역할 미정'})`,
    `도착 노드: ${target.label} (${graphKindLabel(target.kind)} · ${target.role || '역할 미정'})`,
    `관계명: ${link.label || '관계'}`,
    `관계 상태: ${graphStrengthLabel(link.strength)}`,
    `관계 근거: ${link.basis || '확인 필요'}`,
    '',
    '[출발 노드 메모]',
    source.note || '확인 필요',
    '',
    '[도착 노드 메모]',
    target.note || '확인 필요',
    '',
    '요청:',
    '- 위 두 노드 사이의 관계를 사실·주장·추정·확인 필요로 분해해줘.',
    '- 관계가 어떤 증거, 진술, 시간, 장소, 행위 흐름으로 뒷받침되는지 분석해줘.',
    '- 이 관계가 전체 사건의 설명력, 논리적 강점, 약점, 반박 가능성, 공략점에 어떤 의미를 갖는지 정리해줘.',
    '- 관계의 강도는 법적 판단이 아니라 자료상 연결 정도로만 표현해줘.',
    '- 보강 단서는 가능하면 "증거:", "행위:", "시점:", "장소:", "관련 인물:" 형식으로 짧게 남겨줘.',
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
    schemaVersion: GRAPH_SCHEMA_VERSION,
    relation: {
      id: link.id,
      type: link.type || 'LEGACY_RELATED_TO',
      role: link.role || '',
      label: link.label || '관계',
      verificationStatus: link.verificationStatus || 'unverified',
      assessment: link.assessment || defaultAssessment(),
      strength: link.assessment?.supportStrength || link.strength || 'unknown',
      strengthLabel: graphStrengthLabel(link.assessment?.supportStrength || link.strength),
      basis: link.basis || '',
      sourceRefs: link.sourceRefs || [],
      source: {
        id: source.id,
        type: source.kind || 'unknown',
        label: source.label,
        role: source.role,
        note: source.note,
        eventDateTime: graphEventDateTimeLabel(source),
        sourceFileName: source.sourceFileName || '',
      },
      target: {
        id: target.id,
        type: target.kind || 'unknown',
        label: target.label,
        role: target.role,
        note: target.note,
        eventDateTime: graphEventDateTimeLabel(target),
        sourceFileName: target.sourceFileName || '',
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
    link.source === sourceId
    && link.target === targetId
    && (link.type || 'LEGACY_RELATED_TO') === 'LEGACY_RELATED_TO'
    && !link.role
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
    message: `${sourceNode.label} → ${targetNode.label} 방향의 새 관계선을 생성합니다.`,
    detail: '생성 후 관계선을 더블클릭하면 관계 유형, 역할, 검증 상태, 근거와 검토 상태를 입력할 수 있습니다.',
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
  scheduleGraphRemotePersistence('graph_link_create');
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
  const isolated = graphIsolatedNodes();
  const eventNodes = graphState.nodes.filter((node) => node.kind === 'event');
  const evidenceNodes = graphState.nodes.filter((node) => node.kind === 'evidence');
  const personNodes = graphState.nodes.filter((node) => node.kind === 'person');
  const datedEvents = eventNodes.filter((node) => graphEventDateTimeLabel(node));
  const datedEvidenceNodes = evidenceNodes.filter((node) => graphEventDateTimeLabel(node));
  const weakLinks = graphState.links.filter((link) => normalizeGraphStrength(link.strength) === 'weak');
  const confirmedLinks = graphState.links.filter((link) => normalizeGraphStrength(link.strength) === 'confirmed');
  const nodesWithoutMemo = graphState.nodes.filter((node) => !String(node.note || '').trim());
  const linksWithoutBasis = graphState.links.filter((link) => !String(link.basis || '').trim());

  const cell = (value, fallback = '확인 필요', max = 120) => {
    const text = String(value || fallback)
      .replace(/\|/g, '/')
      .replace(/\s+/g, ' ')
      .trim();
    return (text || fallback).slice(0, max);
  };

  const briefNote = (value, fallback = '메모 필요') => cell(value, fallback, 96);
  const nodeLinks = (nodeId) => graphState.links.filter((link) => link.source === nodeId || link.target === nodeId);
  const linkedLabels = (nodeId) => {
    const labels = nodeLinks(nodeId)
      .map((link) => graphNodeById(link.source === nodeId ? link.target : link.source)?.label)
      .filter(Boolean);
    return labels.length ? labels.join(', ') : '연결 부족';
  };
  const linkEndpoint = (link) => {
    const source = graphNodeById(link.source);
    const target = graphNodeById(link.target);
    return `${source?.label || '미상'} ↔ ${target?.label || '미상'}`;
  };
  const sortedEvents = [...eventNodes].sort((a, b) => {
    const left = `${a.eventDate || '9999-99-99'} ${a.eventTime || '99:99'}`;
    const right = `${b.eventDate || '9999-99-99'} ${b.eventTime || '99:99'}`;
    if (left !== right) return left.localeCompare(right);
    return a.x - b.x;
  });
  const density = nodeCount <= 1 ? '판단 보류' : `${linkCount}/${Math.round((nodeCount * (nodeCount - 1)) / 2)} 연결`;
  const selectedLine = selected
    ? `- 현재 선택된 분석 초점: ${graphNodeLabel(selected)}`
    : '- 현재 선택된 분석 초점: 없음';

  if (!nodeCount) {
    return [
      '## 정밀 분석 브리프',
      '',
      '- 아직 분석할 인물·사건 노드가 없습니다.',
      '- 오른쪽 평면에 사건과 주체를 배치하면 관계 역학, 시간 관련성, 논리적 강점과 약점이 이 보고서에 반영됩니다.',
      '- 사건 노드는 일자와 시간을 함께 입력해야 시간축 분석에 사용할 수 있습니다.',
    ].join('\n');
  }

  const strengthNotes = [
    confirmedLinks.length ? `확인된 관계선 ${confirmedLinks.length}개가 있어 일부 관계축은 자료로 설명 가능합니다.` : '',
    datedEvents.length ? `일시가 입력된 사건 ${datedEvents.length}개가 있어 시간 순서 분석의 출발점이 있습니다.` : '',
    evidenceNodes.length ? `증거 노드 ${evidenceNodes.length}개가 있어 주장과 행위의 연결 근거를 별도 층위로 검토할 수 있습니다.` : '',
    clusters.length ? `클러스터 ${clusters.length}개가 있어 장면 또는 쟁점 단위로 묶어 해석할 수 있습니다.` : '',
    !isolated.length && nodeCount > 1 ? '고립 노드가 없어 주요 주체와 사건이 최소 1개 이상의 관계축으로 연결되어 있습니다.' : '',
  ].filter(Boolean);

  const weaknessNotes = [
    weakLinks.length ? `근거가 약하거나 미확정인 관계선 ${weakLinks.length}개가 있어 반박 가능성이 남습니다.` : '',
    linksWithoutBasis.length ? `관계선 ${linksWithoutBasis.length}개는 연결 근거가 비어 있어 증거·진술·시간 기록 보강이 필요합니다.` : '',
    isolated.length ? `고립 노드 ${isolated.length}개는 사건 전체와의 연결 의미가 아직 설명되지 않았습니다.` : '',
    nodesWithoutMemo.length ? `메모가 비어 있는 노드 ${nodesWithoutMemo.length}개는 행위, 증거, 이해관계가 불명확합니다.` : '',
    eventNodes.length !== datedEvents.length ? `일시가 완성되지 않은 사건 ${eventNodes.length - datedEvents.length}개는 시간 관련성 분석에서 약점이 됩니다.` : '',
    evidenceNodes.length !== datedEvidenceNodes.length ? `작성·확보 시점이 없는 증거 ${evidenceNodes.length - datedEvidenceNodes.length}개는 증거 흐름 분석에서 약점이 됩니다.` : '',
    !eventNodes.length ? '주요 사건 노드가 없어 관계는 보이지만 시간 흐름과 반응 구간이 아직 드러나지 않습니다.' : '',
    !evidenceNodes.length ? '증거 노드가 없어 주장과 행위를 뒷받침하는 원자료 층위가 아직 분리되지 않았습니다.' : '',
  ].filter(Boolean);

  return [
    '## 그래프 기반 정밀 분석 브리프',
    '',
    `- 분석 재료: 주체 ${personNodes.length}개, 사건 ${eventNodes.length}개, 증거 ${evidenceNodes.length}개, 관계 ${linkCount}개, 묶음 ${clusters.length}개`,
    `- 관계 밀도: ${density}`,
    selectedLine,
    '',
    '### 사건 시간축과 관련성',
    ...(sortedEvents.length
      ? [
          '| 시점 | 사건 | 연결된 주체 | 분석상 의미 | 보강 지점 |',
          '|---|---|---|---|---|',
          ...sortedEvents.map((node) => {
            const time = graphEventDateTimeLabel(node) || '일시 확인 필요';
            const connected = linkedLabels(node.id);
            const meaning = nodeLinks(node.id).length
              ? '관계축과 함께 선후관계 검토 가능'
              : '사건과 주체의 연결 설명 필요';
            const gap = node.note ? '증거·장소·발언 원문 대조' : '장소·행위·증거 메모 입력';
            return `| ${cell(time)} | ${cell(node.label)} | ${cell(connected)} | ${cell(meaning)} | ${cell(gap)} |`;
          }),
        ]
      : ['- 사건 시간축이 아직 비어 있습니다. 주요 사건을 일자·시간과 함께 입력하면 선후관계와 반응 구간을 분석할 수 있습니다.']),
    '',
    '### 증거 연결 분석',
    ...(evidenceNodes.length
      ? [
          '| 증거 | 작성·확보 시점 | 연결된 노드 | 입증 취지·메모 | 보강 지점 |',
          '|---|---|---|---|---|',
          ...evidenceNodes.map((node) => {
            const time = graphEventDateTimeLabel(node) || '시점 확인 필요';
            const connected = linkedLabels(node.id);
            const note = node.note || node.sourceFileName || '증거 메모 필요';
            const gap = node.note ? '원본성·보관 경로·반대 해석 대조' : '원본성·출처·입증 취지 입력';
            return `| ${cell(node.label)} | ${cell(time)} | ${cell(connected)} | ${cell(note)} | ${cell(gap)} |`;
          }),
        ]
      : ['- 증거 노드가 아직 없습니다. PDF 원자료, 진술서, 녹취록, 캡처 등을 증거 노드로 분리하면 행위·주장과의 연결이 선명해집니다.']),
    '',
    '### 관계 역학 분석',
    ...(graphState.links.length
      ? [
          '| 관계축 | 상태 | 근거 | 분석상 의미 | 취약점 |',
          '|---|---|---|---|---|',
          ...graphState.links.map((link) => {
            const endpoint = linkEndpoint(link);
            const status = graphStrengthLabel(link.strength);
            const basis = link.basis || '근거 확인 필요';
            const meaning = normalizeGraphStrength(link.strength) === 'confirmed'
              ? '자료 기반 설명력이 비교적 높음'
              : normalizeGraphStrength(link.strength) === 'likely'
                ? '정황 연결은 있으나 직접 근거 보강 필요'
                : '관계 자체의 설명 근거가 약함';
            const gap = link.basis ? '반대 진술 또는 시간 공백 대조' : '증거·진술·시점·장소 근거 입력';
            return `| ${cell(endpoint)} | ${cell(status)} | ${cell(basis)} | ${cell(meaning)} | ${cell(gap)} |`;
          }),
        ]
      : ['- 관계선이 아직 없습니다. 주체와 사건 사이의 연결을 만들면 역학 구조, 공백, 보강 지점이 드러납니다.']),
    '',
    '### 논리적 강점',
    ...(strengthNotes.length
      ? strengthNotes.map((item) => `- ${item}`)
      : ['- 현재 자료만으로 강하게 설명되는 축은 아직 제한적입니다. 사건 일시, 관계 근거, 원자료를 보강해야 합니다.']),
    '',
    '### 논리적 약점',
    ...(weaknessNotes.length
      ? weaknessNotes.map((item) => `- ${item}`)
      : ['- 현재 구조상 즉시 드러나는 큰 공백은 적지만, 각 관계선의 원자료 대조는 별도로 필요합니다.']),
    '',
    '### 공략점 및 보강 전략',
    '- 가장 약한 관계선부터 증거, 진술, 시간, 장소 중 무엇으로 뒷받침되는지 입력하세요.',
    '- 사건 노드는 일자와 시간을 기준으로 정렬해 선후관계, 반응 속도, 공백 구간을 먼저 확인하세요.',
    '- 직접 행위자, 주변 관여자, 관리·감독 위치의 주체를 분리하면 주장 대립축이 선명해집니다.',
    '- 반박이 예상되는 관계는 "왜 그렇게 연결되는지"를 문서, PDF 원자료, 캡처, 진술 중 하나로 연결해야 합니다.',
    '',
    '### 장면·쟁점 묶음',
    ...(clusters.length
      ? clusters.map((cluster) => {
          const names = cluster.nodeIds
            .map(graphNodeById)
            .filter(Boolean)
            .map((node) => graphNodeLabel(node));
          return `- ${cluster.label}: ${names.join(' / ') || '확인 필요'}${cluster.note ? ` · 분석 메모: ${briefNote(cluster.note)}` : ' · 분석 메모 필요'}`;
        })
      : ['- 아직 묶인 장면이 없습니다. 같은 시간대, 같은 장소, 같은 쟁점에 속하는 노드를 묶으면 분석 단위가 선명해집니다.']),
    '',
    '### 다음 확인 질문',
    linksWithoutBasis[0]
      ? `- ${linkEndpoint(linksWithoutBasis[0])} 관계는 어떤 문서, 진술, 시간대 또는 장소 기록으로 뒷받침되나요?`
      : isolated[0]
        ? `- ${isolated[0].label}은 어떤 사건 또는 주체와 연결되어야 하나요?`
        : '- 현재 가장 중요한 관계축 하나를 골라, 그 관계가 성립한다고 보는 근거를 구체적으로 입력해 주세요.',
  ].join('\n');
}

function buildKnowledgeGraphGuidance() {
  if (!graphState.nodes.length) return '';

  return `
[사용자가 사건 평면에 구성한 분석 데이터]
${buildKnowledgeGraphGuidanceV2(graphSnapshotForAgent())}

주의:
- 보고서에는 UI 요소를 설명하지 말고 인물, 주요사건, 주장, 근거, 기반명제의 연결과 취약한 지점을 흡수한다.
- 그래프 노드 수, 관계 수, 밀도는 사건의 강도나 법적 충분성이 아니다.
- 가능한 경우 "주장 → 근거" 또는 "주장 → 기반명제 → 주요사건" 경로로 설명한다.
- relationCandidates는 승인 전 계산 경로에 포함하지 않는다.
`.trim();
}

function graphTimeLabel(node, index) {
  const explicit = graphEventDateTimeLabel(node);
  if (explicit) return explicit.slice(0, 24);

  const text = [node?.note, node?.label, node?.role].filter(Boolean).join('\n');
  const keyed = text.match(/(?:시점|일시|날짜|시간|발생\s*시점)\s*[:：]\s*([^\n]+)/i);
  const date = text.match(/(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}\s*일?|\d{1,2}\s*월\s*\d{1,2}\s*일(?:\s*(?:오전|오후)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)?)/);
  const time = text.match(/((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)/);
  const label = keyed?.[1] || date?.[1] || time?.[1] || `T${index + 1}`;

  return String(label)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function graphTimelineNodes() {
  return graphState.nodes
    .filter((node) => node.kind === 'event' || (node.kind === 'evidence' && graphEventDateTimeLabel(node)))
    .sort((a, b) => a.x - b.x);
}

function renderGraphTimeAxis() {
  if (!dom.graphTimeAxis || !dom.graphCanvas) return;

  const timelineNodes = graphTimelineNodes();
  if (!timelineNodes.length) {
    dom.graphTimeAxis.hidden = true;
    dom.graphTimeAxis.innerHTML = '';
    return;
  }

  const rect = dom.graphCanvas.getBoundingClientRect();
  const minX = 44;
  const maxX = Math.max(minX, rect.width - 54);
  const visibleNodes = timelineNodes
    .map((node, index) => ({ node, index, screen: graphWorldToScreen(node) }))
    .filter((item) => item.screen.x >= -80 && item.screen.x <= rect.width + 80)
    .slice(0, 12);

  if (!visibleNodes.length) {
    dom.graphTimeAxis.hidden = true;
    dom.graphTimeAxis.innerHTML = '';
    return;
  }

  const ticks = visibleNodes.map(({ node, index, screen }) => {
    const left = Math.max(minX, Math.min(maxX, screen.x));
    const label = graphTimeLabel(node, index);

    return `
      <span class="case-graph-time-tick is-${escapeHtml(node.kind || 'event')}" style="left: ${left}px">
        <b>${escapeHtml(label)}</b>
        <i>${escapeHtml(node.label || `${graphKindLabel(node.kind)} ${index + 1}`)}</i>
      </span>
    `;
  }).join('');

  dom.graphTimeAxis.hidden = false;
  dom.graphTimeAxis.innerHTML = `
    <strong>시간축</strong>
    ${ticks}
  `;
}

function graphEdgePath(source, target, curveIndex = 0, curveTotal = 1) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const offset = (curveIndex - (curveTotal - 1) / 2) * 34;
  const controlX = (source.x + target.x) / 2 + normalX * offset;
  const controlY = (source.y + target.y) / 2 + normalY * offset;
  return {
    d: `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`,
    labelX: controlX,
    labelY: controlY,
  };
}

function graphVisibleRelations() {
  const accepted = (graphState.links || []).map((link) => ({ ...link, isCandidate: false }));
  const candidates = (graphState.relationCandidates || [])
    .filter((candidate) => candidate.status === 'pending')
    .map((candidate) => ({
      id: candidate.id,
      source: candidate.source,
      target: candidate.target,
      type: candidate.suggestedType || 'LEGACY_RELATED_TO',
      role: candidate.suggestedRole || '',
      label: candidate.suggestedType || '후보',
      basis: candidate.basis || '',
      sourceRefs: candidate.sourceRefs || [],
      strength: candidate.confidence === 'high' ? 'likely' : 'weak',
      assessment: defaultAssessment({ extractionConfidence: candidate.confidence || 'unknown' }),
      verificationStatus: 'unverified',
      analysisStatus: 'candidate',
      isCandidate: true,
    }));
  return [...accepted, ...candidates];
}

function graphNodePreviewText(node, fallback = '') {
  const text = String(
    node?.kind === 'claim'
      ? node.claimText || node.note || fallback
      : node?.kind === 'source_span'
        ? node.note || node.sourceRefs?.[0]?.quote || fallback
        : node?.note || fallback
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return fallback;
  return text.length > 82 ? `${text.slice(0, 82)}...` : text;
}

function graphRelationTypeClass(type = '') {
  return String(type || 'LEGACY_RELATED_TO').toLowerCase().replace(/_/g, '-');
}

function graphRelationDisplayLabel(link = {}) {
  const type = String(link.type || link.suggestedType || 'LEGACY_RELATED_TO').toUpperCase();
  const labels = {
    CONTAINS: '원자료',
    ASSERTS: '명제화',
    DERIVED_FROM: '출처',
    PARTICIPATES_AS: '참여',
    SUPPORTS: '지지',
    ATTACKS: '반박',
    UNDERCUTS: '약화',
    SATISFIES: '논증 연결',
    REQUIRED_FOR: '필요 항목',
    PRECEDES: '선행',
    OVERLAPS: '동시성',
    CONTRADICTS: '충돌',
    EXPLAINS: '장면 설명',
    ALTERNATIVE_TO: '대체 가설',
    INCOMPATIBLE_WITH: '양립 곤란',
    LEGACY_RELATED_TO: '관련성',
  };
  const base = labels[type] || normalizeEntityName(link.label) || '관계';
  return link.isCandidate ? `후보 · ${base}` : base;
}

function renderKnowledgeGraph() {
  if (!dom.graphCanvas || !dom.graphNodes || !dom.graphLinks) return;

  const rect = dom.graphCanvas.getBoundingClientRect();
  const relations = graphVisibleRelations();
  const relationGroups = new Map();
  relations.forEach((link) => {
    const key = `${link.source}->${link.target}`;
    if (!relationGroups.has(key)) relationGroups.set(key, []);
    relationGroups.get(key).push(link);
  });

  dom.graphLinks.innerHTML = `
    <defs>
      <marker id="case-graph-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" class="case-graph-arrow"></path>
      </marker>
      <marker id="case-graph-arrow-candidate" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" class="case-graph-arrow is-candidate"></path>
      </marker>
    </defs>
    ${relations
    .map((link) => {
      const source = graphNodeById(link.source);
      const target = graphNodeById(link.target);
      if (!source || !target) return '';
      const siblings = relationGroups.get(`${link.source}->${link.target}`) || [link];
      const curve = graphEdgePath(source, target, siblings.findIndex((item) => item.id === link.id), siblings.length);
      const selectedClass = link.id === graphState.selectedLinkId ? ' is-selected' : '';
      const strengthClass = ` is-${normalizeGraphStrength(link.strength)}`;
      const typeClass = ` is-type-${graphRelationTypeClass(link.type)}`;
      const candidateClass = link.isCandidate ? ' is-candidate' : '';
      const statusClass = link.analysisStatus ? ` is-${link.analysisStatus}` : '';
      const statusLabel = link.analysisStatus === 'synced'
        ? '저장됨'
        : link.analysisStatus === 'analyzing'
          ? '분석 중'
          : link.analysisStatus === 'failed'
            ? '확인 필요'
            : graphStrengthLabel(link.strength);
      return `
        <g class="case-graph-link-group${selectedClass}${strengthClass}${typeClass}${candidateClass}${statusClass}" data-graph-link-id="${escapeHtml(link.id)}">
          <path class="case-graph-link-hit" data-graph-link-id="${escapeHtml(link.id)}" d="${escapeHtml(curve.d)}"></path>
          <path class="case-graph-link" data-graph-link-id="${escapeHtml(link.id)}" d="${escapeHtml(curve.d)}" marker-end="url(#${link.isCandidate ? 'case-graph-arrow-candidate' : 'case-graph-arrow'})"></path>
          <text class="case-graph-link-label" data-graph-link-id="${escapeHtml(link.id)}" x="${curve.labelX}" y="${curve.labelY - 6}" text-anchor="middle">${escapeHtml(graphRelationDisplayLabel(link))}</text>
          <text class="case-graph-link-strength" data-graph-link-id="${escapeHtml(link.id)}" x="${curve.labelX}" y="${curve.labelY + 9}" text-anchor="middle">${escapeHtml(link.isCandidate ? '후보 · 직접 근거 검토' : statusLabel)}</text>
        </g>
      `;
    })
    .join('')}
  `;
  dom.graphLinks.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);

  dom.graphNodes.innerHTML = '';
  (graphState.clusters || []).forEach((cluster) => {
    const clusterNodes = cluster.nodeIds
      .map(graphNodeById)
      .filter(Boolean);
    if (clusterNodes.length < 2) return;

    const area = document.createElement('section');
    area.className = [
      'case-graph-cluster-area',
      `is-${cluster.layer || 'support'}`,
      cluster.analysisStatus === 'analyzing' ? 'is-analyzing' : '',
      cluster.analysisStatus === 'synced' ? 'is-synced' : '',
      cluster.analysisStatus === 'failed' ? 'is-failed' : '',
    ].filter(Boolean).join(' ');
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
      <small>${escapeHtml(cluster.focus || clusterNodes.map((node) => node.label).join(' · '))}</small>
    `;
    dom.graphNodes.append(area);
  });

  graphState.nodes.forEach((node) => {
    const eventDateTime = graphEventDateTimeLabel(node);
    const emptyMemo = node.kind === 'evidence'
      ? '더블클릭으로 근거 메모 입력'
      : node.kind === 'event'
        ? '더블클릭으로 사건 메모 입력'
        : node.kind === 'source_span'
          ? '근거 발췌 입력'
          : node.kind === 'claim'
            ? '주장 입력'
            : node.kind === 'premise'
              ? '기반명제 입력'
            : node.kind === 'inference'
              ? '기반명제 입력'
              : node.kind === 'legal_element'
                ? '기반명제 설명 입력'
                : node.kind === 'hypothesis'
                  ? '주장 입력'
                  : '더블클릭으로 인물 메모 입력';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'case-graph-node',
      `is-kind-${node.kind || 'person'}`,
      `is-${node.importance || node.layer || 'uncertain'}`,
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
      <em>${escapeHtml([eventDateTime, graphNodePreviewText(node, emptyMemo)].filter(Boolean).join(' · '))}</em>
      ${node.analysisStatus === 'synced' ? '<u>저장됨</u>' : ''}
      ${node.analysisStatus === 'analyzing' ? '<u>분석 중</u>' : ''}
      ${node.analysisStatus === 'failed' ? '<u>확인 필요</u>' : ''}
    `;
    dom.graphNodes.append(button);
  });

  dom.graphEmpty?.classList.toggle('is-hidden', graphState.nodes.length > 0);
  dom.graphLinkMode?.classList.toggle('is-active', graphState.linkMode);
  dom.graphLinkMode && (dom.graphLinkMode.textContent = graphState.linkMode ? '관계선 모드 켜짐' : '관계선 모드 꺼짐');
  applyGraphViewport();
  renderGraphTimeAxis();

  if (!graphPersistenceHydrating) {
    persistGraphStateLocal();
  }
}

function commandOutputHtml(output) {
  const text = String(output || '').trim();
  if (!text) return '<p>아직 출력이 없습니다.</p>';

  return text
    .split(/\n{2,}/)
    .map((chunk) => {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return '';

      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${reportInlineHtml(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      }

      if (lines.length === 1 && /^#{1,4}\s+/.test(lines[0])) {
        return `<h3>${reportInlineHtml(lines[0].replace(/^#{1,4}\s+/, ''))}</h3>`;
      }

      return `<p>${lines.map(reportInlineHtml).join('<br>')}</p>`;
    })
    .join('');
}

function commandBlockTitle(block) {
  const command = String(block?.command || '').replace(/\s+/g, ' ').trim();
  if (!command) return '명령 블록';
  return command.length > 54 ? `${command.slice(0, 54)}...` : command;
}

function commandBlockMetaText(block) {
  return [
    formatDate(block?.executedAt || block?.createdAt),
    block?.graphSummary || graphCommandSummary(),
    `${block?.usageUnits || 1}회`,
  ].filter(Boolean).join(' · ');
}

function setCommandOpen(isOpen, initialCommand = '') {
  if (!dom.commandBackdrop || !dom.commandModal) return;

  if (!isOpen) blurActiveElementInside(dom.commandModal);

  dom.commandBackdrop.hidden = !isOpen;
  dom.commandModal.hidden = !isOpen;
  dom.commandModal.setAttribute('aria-hidden', String(!isOpen));

  if (isOpen) {
    if (dom.commandInput) {
      dom.commandInput.value = initialCommand;
      requestAnimationFrame(() => dom.commandInput?.focus());
    }
  }
}

function setSituationOpen(isOpen, initialText = '') {
  if (!dom.situationBackdrop || !dom.situationModal) return;

  if (!isOpen) blurActiveElementInside(dom.situationModal);

  dom.situationBackdrop.hidden = !isOpen;
  dom.situationModal.hidden = !isOpen;
  dom.situationModal.setAttribute('aria-hidden', String(!isOpen));

  if (isOpen && dom.situationInput) {
    dom.situationInput.value = initialText;
    requestAnimationFrame(() => dom.situationInput?.focus());
  }
}

function setCommandResultOpen(isOpen, blockOrId = null) {
  if (!dom.commandResultBackdrop || !dom.commandResultModal) return;

  const block = typeof blockOrId === 'string'
    ? commandBlocks.find((item) => item.id === blockOrId)
    : blockOrId;

  if (isOpen && !block) return;

  if (!isOpen) blurActiveElementInside(dom.commandResultModal);

  activeCommandResultBlockId = isOpen ? block.id : '';
  dom.commandResultBackdrop.hidden = !isOpen;
  dom.commandResultModal.hidden = !isOpen;
  dom.commandResultModal.setAttribute('aria-hidden', String(!isOpen));

  if (!isOpen) return;

  if (dom.commandResultTitle) {
    dom.commandResultTitle.textContent = commandBlockTitle(block);
  }

  if (dom.commandResultMeta) {
    dom.commandResultMeta.textContent = commandBlockMetaText(block);
  }

  if (dom.commandResultOutput) {
    dom.commandResultOutput.innerHTML = commandOutputHtml(block.output);
  }
}

function buildCommandMessage(command) {
  return [
    '[명령 블록 실행]',
    `명령: ${command}`,
    '',
    '[증거-논증 그래프 요약]',
    graphCommandSummary(),
    '',
    '요청:',
    '- 오른쪽 그래프의 인물, 주요사건, 주장, 근거, 기반명제 연결을 기반으로 답변해줘.',
    '- 보고서 전체를 작성하지 말고, 이 명령에 대한 실행 결과만 명확하게 출력해줘.',
    '- 사실, 주장, 추정, 확인 필요를 구분하고 자료상 한계를 함께 표시해줘.',
    '- 법률·수사·행정 결론은 단정하지 말고 보조적 분석으로 표현해줘.',
  ].join('\n');
}

function buildCommandStructuredInput(command) {
  const graphSnapshot = graphSnapshotForAgent();
  const engineResult = runDeterministicGraphCommand(graphSnapshot, command, {
    templateId: graphSnapshot.activeLegalTemplateId || 'none',
    targetNodeId: graphState.selectedNodeId,
    evidenceNodeId: graphState.nodes.find((node) => node.kind === 'evidence')?.id || '',
  });
  const queryPackage = buildGraphQueryPackage(graphSnapshot, command, {
    engineResult,
    templateId: graphSnapshot.activeLegalTemplateId || 'none',
    targetNodeId: graphState.selectedNodeId,
  });

  return {
    kind: 'command_block',
    schemaVersion: GRAPH_SCHEMA_VERSION,
    command,
    graphSummary: graphCommandSummary(),
    graphSnapshot,
    engineResult,
    queryPackage,
  };
}

function readableGraphNodeName(id) {
  const node = graphNodeById(id);
  if (!node) return '';
  const label = normalizeGraphReferenceName(node.label || node.claimText || node.note || id);
  return `${graphKindLabel(node.kind)} · ${label || '이름 없음'}`;
}

function readableGraphNodeShortName(id) {
  const node = graphNodeById(id);
  if (!node) return '';
  return normalizeGraphReferenceName(node.label || node.claimText || node.note || id) || '';
}

function readableGraphNodeKind(id) {
  const node = graphNodeById(id);
  return node ? normalizeGraphKind(node.kind) : '';
}

function readableGraphIdList(ids = []) {
  return [...new Set(ids)]
    .map((id) => readableGraphNodeName(id))
    .filter(Boolean)
    .slice(0, 6)
    .join(' / ');
}

function readableGraphShortList(ids = [], limit = 3) {
  return [...new Set(ids)]
    .map((id) => readableGraphNodeShortName(id))
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}

function readableFindingTitle(item, index = 0) {
  if (!item || typeof item !== 'object') return `발견 ${index + 1}`;
  if (item.title) return String(item.title).replace(/(?:claim|person|event|evidence|premise|source_span|legal_element|hypothesis|inference)-[\w-]+/gi, '').trim() || `취약점 ${index + 1}`;
  if (item.label) return item.label;
  if (item.claimText) return graphTextLabelFromContent(item.claimText, `주장 ${index + 1}`);
  if (item.sourceLabel && item.targetLabel) return `${item.sourceLabel} → ${item.targetLabel}`;
  if (item.gap) return '보완이 필요한 지점';
  if (item.type) return '연결 구조 점검';
  return `취약점 ${index + 1}`;
}

function readableFindingSummary(item) {
  if (!item || typeof item !== 'object') return String(item || '').slice(0, 220);
  const parts = [];
  const summary = item.summary || item.missingLinkDescription || item.gap || item.why_it_matters || item.weakness || '';
  if (summary) {
    parts.push(String(summary)
      .replace(/원문\s*발췌/g, '직접 근거')
      .replace(/사실명제/g, '주장')
      .replace(/증거\s*경로/g, '근거 경로')
      .replace(/(?:claim|person|event|evidence|premise|source_span|legal_element|hypothesis|inference)-[\w-]+/gi, '해당 블록')
    );
  }
  if (Array.isArray(item.risks) && item.risks.length) parts.push(item.risks.slice(0, 3).join(' '));
  if (item.impactCount) parts.push(`영향받는 연결 ${item.impactCount}개`);
  if (item.singleEvidenceDependency) parts.push('하나의 근거에 크게 의존합니다.');
  return parts.join(' ').trim();
}

function readableFindingNodeIds(item) {
  return [
    item?.elementId,
    item?.evidenceNodeId,
    item?.hypothesisId,
    item?.claimId,
    ...(Array.isArray(item?.node_ids) ? item.node_ids : []),
    ...(Array.isArray(item?.nodeIds) ? item.nodeIds : []),
    ...(Array.isArray(item?.affectedClaims) ? item.affectedClaims.map((claim) => claim.id) : []),
  ].filter(Boolean);
}

function readableFindingStatus(value) {
  const text = String(value || '').trim();
  const map = {
    unsupported: '연결 부족',
    weakly_supported: '근거 약함',
    contested: '다툼 가능',
    supported_for_review: '검토 가능',
    unverified: '확인 필요',
    asserted: '주장됨',
    corroborated: '보강됨',
    disputed: '다툼 있음',
    rejected: '제외됨',
  };
  return map[text] || text;
}

function readableFindingSectionTitle(key) {
  const map = {
    summary: '요약',
    priorityFixes: '우선 보완할 취약점',
    argumentGaps: '보완할 주장',
    provenanceRisks: '약한 근거 연결',
    evidenceRemovalRisks: '근거 의존 취약점',
    singleEvidenceDependencies: '단일 근거 의존',
    hypothesisRisks: '대체 주장',
    contradictions: '충돌 가능성',
    propositionRisks: '주장 보완',
    candidateRisks: '확인 대기 연결',
    evidencePlan: '추가할 근거',
  };
  return map[key] || key;
}

function graphSharpVulnerabilityMarkdown(commandInput) {
  const result = commandInput?.engineResult || {};
  const findings = result.findings;
  if (!findings || typeof findings !== 'object' || !Array.isArray(findings.priorityFixes)) return '';

  const priorityFixes = findings.priorityFixes || [];
  const claimWeaknesses = priorityFixes.filter((item) => item.kind === 'claim_weakness');
  const evidenceDependencies = priorityFixes.filter((item) => item.kind === 'evidence_dependency');
  const contradictions = priorityFixes.filter((item) => item.kind === 'contradiction');
  const lines = ['# 취약점분석', ''];

  const headlineParts = [];
  if (claimWeaknesses.length) headlineParts.push(`주장 연결 약점 ${claimWeaknesses.length}개`);
  if (evidenceDependencies.length) headlineParts.push(`근거 의존 축 ${evidenceDependencies.length}개`);
  if (contradictions.length) headlineParts.push(`충돌 가능성 ${contradictions.length}개`);
  lines.push(`- ${headlineParts.length ? headlineParts.join(' · ') : '현재 그래프상 치명적인 단절은 크지 않습니다.'}`);

  const insights = [];
  claimWeaknesses.slice(0, 2).forEach((item) => {
    const claimIds = readableFindingNodeIds(item).filter((id) => readableGraphNodeKind(id) === 'claim');
    const claim = readableGraphShortList(claimIds, 1) || readableFindingTitle(item);
    const summary = readableFindingSummary(item)
      .replace(/어느 주요사건에서 나온 주장인지 연결이 필요합니다\.\s*/g, '발생 장면 연결이 약합니다. ')
      .replace(/누구의 말이나 행위와 연결되는 주장인지 확인이 필요합니다\.\s*/g, '진술자/행위자 연결이 약합니다. ')
      .replace(/이 주장을 받치는 기반명제가 부족합니다\.\s*/g, '전제 사실 보강이 필요합니다. ');
    insights.push(`주장 「${claim}」은 ${summary || '사건·인물·근거 중 하나가 비어 있습니다.'}`);
  });

  evidenceDependencies.slice(0, 2).forEach((item) => {
    const ids = readableFindingNodeIds(item);
    const evidence = readableGraphShortList(ids.filter((id) => readableGraphNodeKind(id) === 'evidence'), 1) || readableFindingTitle(item).replace(/\s*의존성\s*점검$/g, '');
    const claims = readableGraphShortList(ids.filter((id) => readableGraphNodeKind(id) === 'claim'), 2);
    insights.push(`근거 「${evidence}」가 빠지면${claims ? ` 「${claims}」 축이 흔들립니다` : ' 연결된 주장 축이 약해집니다'}. 같은 사실을 받치는 독립 근거가 필요합니다.`);
  });

  contradictions.slice(0, 1).forEach((item) => {
    const blocks = readableGraphShortList(readableFindingNodeIds(item), 3);
    insights.push(`충돌 가능성은 ${blocks || '주장 간 관계'}에서 먼저 확인해야 합니다.`);
  });

  lines.push('', '## 핵심 취약점');
  insights.length
    ? insights.slice(0, 4).forEach((line) => lines.push(`- ${line}`))
    : lines.push('- 지금 그래프는 큰 단절보다 개별 근거의 정확한 연결 보강이 더 중요합니다.');

  const actions = [];
  if (claimWeaknesses.length) actions.push('약한 주장을 해당 주요사건과 진술자/행위자에 직접 연결하세요.');
  if (evidenceDependencies.length) actions.push('한 근거에만 기대는 주장은 다른 근거 또는 목격 진술을 추가로 붙이세요.');
  if ((findings.summary?.pendingCandidateCount || 0) > 0) actions.push('후보 관계는 필요한 것만 승인하고, 직접 근거 없는 연결은 버리세요.');
  if (!actions.length) actions.push('현재 연결을 유지하되, 각 근거의 실제 발췌문을 더 구체화하세요.');

  lines.push('', '## 바로 할 일');
  actions.slice(0, 3).forEach((line) => lines.push(`- ${line}`));

  return lines.join('\n');
}

function graphEngineResultMarkdown(commandInput) {
  const result = commandInput?.engineResult || {};
  const type = result.analysis_type || 'freeform';
  const findings = result.findings;
  const limitations = Array.isArray(result.limitations) ? result.limitations : [];
  const sharpMarkdown = type === 'vulnerability_analysis' ? graphSharpVulnerabilityMarkdown(commandInput) : '';
  if (sharpMarkdown) return sharpMarkdown;
  const lines = [
    '# 취약점분석 결과',
    '',
  ];

  const addFinding = (item, index) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${String(item || '').slice(0, 220)}`);
      return;
    }
    const title = readableFindingTitle(item, index);
    const status = item.status ? ` · ${readableFindingStatus(item.status)}` : '';
    const summary = readableFindingSummary(item);
    lines.push(`- ${title}${status}${summary ? `: ${summary}` : ''}`);
    const nodeLabels = readableGraphIdList(readableFindingNodeIds(item));
    if (nodeLabels) lines.push(`  - 관련 블록: ${nodeLabels}`);
    if (Array.isArray(item.sourceRefs) && item.sourceRefs.length) {
      lines.push(`  - 근거 발췌: ${item.sourceRefs.slice(0, 2).map((ref) => ref.quote || ref.fileName || '').filter(Boolean).join(' / ') || '확인 필요'}`);
    }
  };

  if (findings && typeof findings === 'object' && Array.isArray(findings.priorityFixes)) {
    const summary = findings.summary && typeof findings.summary === 'object' ? findings.summary : {};
    lines.push('## 한눈에 보기');
    const summaryLine = [
      summary.propositionRiskCount ? `보완할 주장 ${summary.propositionRiskCount}개` : '',
      summary.weakArgumentEdgeCount ? `약한 연결 ${summary.weakArgumentEdgeCount}개` : '',
      summary.evidenceRemovalRiskCount ? `근거 의존 취약점 ${summary.evidenceRemovalRiskCount}개` : '',
      summary.contradictionCount ? `충돌 가능성 ${summary.contradictionCount}개` : '',
    ].filter(Boolean).join(' · ');
    lines.push(`- ${summaryLine || '현재 그래프에서 즉시 표시할 취약점은 많지 않습니다.'}`);
    lines.push('', '## 우선 보완할 취약점');
    findings.priorityFixes.length
      ? findings.priorityFixes.slice(0, 12).forEach(addFinding)
      : lines.push('- 구조적으로 탐지된 우선 보완 항목이 없습니다.');
    const evidencePlan = Array.isArray(findings.evidencePlan) ? findings.evidencePlan : [];
    if (evidencePlan.length) {
      lines.push('', '## 추가할 근거');
      evidencePlan.slice(0, 6).forEach(addFinding);
    }
  } else if (Array.isArray(findings)) {
    lines.push('## 발견사항');
    findings.length ? findings.slice(0, 18).forEach(addFinding) : lines.push('- 구조적으로 탐지된 항목이 없습니다.');
  } else if (findings && typeof findings === 'object') {
    lines.push('## 취약점');
    Object.entries(findings).forEach(([key, value]) => {
      if (key === 'summary') return;
      lines.push(`### ${readableFindingSectionTitle(key)}`);
      if (Array.isArray(value)) {
        value.length ? value.slice(0, 12).forEach(addFinding) : lines.push('- 없음');
      } else if (value && typeof value === 'object') {
        const entries = Object.entries(value)
          .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== '')
          .map(([entryKey, entryValue]) => `${readableFindingSectionTitle(entryKey)} ${entryValue}`);
        lines.push(entries.length ? `- ${entries.join(' · ')}` : '- 없음');
      } else {
        lines.push(`- ${String(value || '없음').slice(0, 700)}`);
      }
    });
  } else {
    lines.push('- 구조적 결과가 없습니다.');
  }

  if (limitations.length) {
    lines.push('', '## 한계');
    limitations.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join('\n');
}

function graphCommandResponseMarkdown(data) {
  if (!data || typeof data !== 'object') return '';
  const root = data.result && typeof data.result === 'object' ? data.result : data;
  const message = String(root.assistant_message || root.assistantMessage || '').trim();
  const findings = Array.isArray(root.findings) ? root.findings : [];
  const citations = Array.isArray(root.citations) ? root.citations : [];
  const limitations = Array.isArray(root.limitations) ? root.limitations : [];

  if (!message && !findings.length && !citations.length && !limitations.length) return '';

  const lines = [];
  if (message) lines.push(message);
  if (findings.length) {
    lines.push('', '## 우선 보완할 취약점');
    findings.slice(0, 18).forEach((finding, index) => {
      const title = readableFindingTitle(finding, index);
      const status = finding?.status ? ` · ${readableFindingStatus(finding.status)}` : '';
      const summary = readableFindingSummary(finding);
      lines.push(`- ${title}${status}${summary ? `: ${summary}` : ''}`);
      const nodeLabels = readableGraphIdList(readableFindingNodeIds(finding));
      if (nodeLabels) lines.push(`  - 관련 블록: ${nodeLabels}`);
      if (Array.isArray(finding?.source_refs) || Array.isArray(finding?.sourceRefs)) {
        const refs = finding.source_refs || finding.sourceRefs;
        const refLine = refs.slice(0, 3).map((ref) => ref.quote || ref.fileName || ref.sourceNodeId).filter(Boolean).join(' / ');
        if (refLine) lines.push(`  - 근거 발췌: ${refLine}`);
      }
    });
  }
  if (citations.length) {
    lines.push('', '## 근거 발췌');
    citations.slice(0, 12).forEach((citation) => {
      const quote = citation?.quote || citation?.sourceRef?.quote || citation?.fileName || '';
      lines.push(`- ${quote || JSON.stringify(citation).slice(0, 240)}`);
    });
  }
  if (limitations.length) {
    lines.push('', '## 한계');
    limitations.forEach((item) => lines.push(`- ${typeof item === 'string' ? item : item?.summary || JSON.stringify(item).slice(0, 240)}`));
  }
  return lines.join('\n').trim();
}

async function persistCommandBlockRemote(block) {
  if (!block) return false;
  return persistGraphStateRemote({ reason: 'case_file_command_block_update' });
}

async function deleteCommandBlockRemote(block) {
  if (!block) return false;
  return persistGraphStateRemote({ reason: 'case_file_command_block_delete' });
}

async function deleteCommandBlock(blockId) {
  const block = commandBlocks.find((item) => item.id === blockId);
  if (!block) return;

  const ok = window.confirm('이 명령 블록을 삭제할까요? 이 블록만 삭제되고 오른쪽 수사지식그래프는 유지됩니다.');
  if (!ok) return;

  commandBlocks = commandBlocks.filter((item) => item.id !== block.id);
  if (activeCommandResultBlockId === block.id) {
    setCommandResultOpen(false);
  }
  persistGraphStateLocal();
  renderCommandBlocks();

  const deletedRemote = await deleteCommandBlockRemote(block);
  const localOnly = !supabase || !session?.user || !activeConversation?.id || activeConversation.isLocal;
  setServiceStatus(
    deletedRemote || localOnly
      ? '명령 블록을 삭제하고 현재 사안 파일에 반영했습니다.'
      : '명령 블록은 화면에서 삭제했지만 원격 사안 파일 반영이 지연되었습니다.',
    deletedRemote || localOnly ? 'ready' : 'error'
  );
}

async function invokeGraphCommand(command) {
  const normalizedCommand = String(command || '').trim();

  if (desktopOnlyMedia.matches) {
    const reason = 'RoosyCozy Intelligence는 PC 브라우저에서만 사용할 수 있습니다.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  const activeSession = session?.user ? session : await restoreSessionIfAvailable(true);

  if (!activeSession?.user) {
    const reason = '로그인 후 명령을 실행할 수 있습니다.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  if (!hasWorkspaceAccess()) {
    const reason = '권한 필요: Teacher 또는 PRO 승인 계정만 명령 블록을 사용할 수 있습니다.';
    setServiceStatus(reason, 'error');
    syncInteractionState();
    return { ok: false, reason };
  }

  if (!supabase) {
    const reason = 'Supabase 연결 설정을 확인해 주세요.';
    setServiceStatus(reason, 'error');
    return { ok: false, reason };
  }

  if (!normalizedCommand) {
    return { ok: false, reason: '실행할 명령이 없습니다.' };
  }

  const usageUnits = 1;
  if (!canChat(usageUnits)) {
    const reason = `${usageUnits}회가 필요한 요청입니다. 현재 남은 사용량은 ${remainingUsage()}회입니다.`;
    setServiceStatus(reason, 'error');
    syncInteractionState();
    return { ok: false, reason };
  }

  isSending = true;
  document.body.dataset.busy = 'true';
  document.body.dataset.busyMode = 'command';
  syncInteractionState();
  renderAll();

  let commandInput = null;
  try {
    const usageBeforeRequest = { ...usageState };
    commandInput = buildCommandStructuredInput(normalizedCommand);
    const { data, error } = await withTimeout(
      supabase.functions.invoke('report-chat', {
        body: {
          mode: 'graph_command',
          conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
          product: currentProductKind(),
          message: normalizedCommand,
          forceReport: false,
          clientIntent: 'direct_question',
          clientPolicy: {
            shouldUpdateReport: false,
            mode: 'graph_command',
            usageUnits,
          },
          clientGuidance: '명령 블록 모드입니다. 보고서 전체를 갱신하지 말고 수사지식그래프의 인물·사건·증거 노드, 관계선, 클러스터, 시간축에 대한 명령 실행 결과만 간결하게 반환하세요.',
          structuredInput: commandInput,
          command: normalizedCommand,
          graphSummary: commandInput.graphSummary,
          usageUnits,
        },
      }),
      75000,
      '명령 실행 응답이 지연되고 있습니다. 명령을 더 짧게 나누어 실행해 주세요.'
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

    const output = String(
      graphCommandResponseMarkdown(data) ||
      data?.output ||
      data?.answer ||
      data?.assistantMessage ||
      data?.assistant_message ||
      data?.result?.assistant_message ||
      (typeof data?.result === 'string' ? data.result : '') ||
      ''
    ).trim();

    if (!output) {
      throw new Error('명령 실행 결과가 비어 있습니다.');
    }

    if (data?.conversation) {
      const nextConversation = data.conversation;
      const existingIndex = conversations.findIndex((item) => item.id === nextConversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = nextConversation;
      } else {
        conversations.unshift(nextConversation);
      }

      activeConversation = nextConversation;
      persistGraphStateLocal();
    }

    if (data?.usage) {
      applyUsageState(data.usage);
    } else {
      applyLocalUsageIncrement(usageBeforeRequest, usageUnits);
    }

    await loadUsage({ preserveOnError: true });
    applyLocalUsageIncrement(usageBeforeRequest, usageUnits);

    return {
      ok: true,
      output,
      usage: usageState,
      meta: data?.meta ?? null,
    };
  } catch (error) {
    await loadUsage({ preserveOnError: true });
    if (commandInput?.engineResult) {
      return {
        ok: true,
        output: graphEngineResultMarkdown(commandInput),
        usage: usageState,
        meta: {
          localOnly: true,
          engineResult: commandInput.engineResult,
        },
      };
    }
    return {
      ok: false,
      reason: friendlyServiceError(error instanceof Error ? error : '명령 실행에 실패했습니다.'),
    };
  } finally {
    isSending = false;
    document.body.dataset.busy = 'false';
    document.body.dataset.busyMode = 'idle';
    syncInteractionState();
    renderAll();
  }
}

async function invokeGraphExtraction(text) {
  const normalizedText = compactText(text);

  if (!normalizedText) {
    return { ok: false, reason: '그래프로 변환할 상황 기록이 없습니다.' };
  }

  if (!supabase) {
    return { ok: false, reason: 'Supabase 연결 설정을 확인해 주세요.' };
  }

  const usageUnits = 1;
  if (!canChat(usageUnits)) {
    return { ok: false, reason: `${usageUnits}회가 필요한 요청입니다. 현재 남은 사용량은 ${remainingUsage()}회입니다.` };
  }

  isSending = true;
  document.body.dataset.busy = 'true';
  document.body.dataset.busyMode = 'situation';
  syncInteractionState();
  renderAll();

  try {
    const usageBeforeRequest = { ...usageState };
    const existingGraph = graphSnapshotForAgent();
    const { data, error } = await withTimeout(
      supabase.functions.invoke('report-chat', {
        body: {
          mode: 'graph_extract',
          conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
          product: currentProductKind(),
          message: normalizedText,
          forceReport: false,
          clientIntent: 'fact_update',
          clientPolicy: {
            shouldUpdateReport: false,
            mode: 'graph_extract',
            usageUnits,
          },
          clientGuidance: [
            'graph_extract 모드입니다.',
            '사용자의 줄글 상황을 인물, 주요사건, 주장, 근거(증거), 기반명제 5개 블록만으로 변환하세요.',
            'source_span, legal_element, hypothesis, inference는 새 입력에서 만들지 마세요.',
            '주요사건은 시간순으로 1~5개만 추출하고, 인물은 사건에 붙이고, 주장은 사건에서 파생되게 연결하세요.',
            '근거(증거)는 주장을 뒷받침하거나 공격하는 자료로 연결하고, 기반명제는 주장을 이해하기 위한 전제 사실로 연결하세요.',
            '게시글, 댓글, 캡처, 메모, 계좌내역, 문서, 자료는 인물이 아니라 근거(증거)입니다.',
            '모든 링크는 단방향으로 반환하고, 노드가 고립되지 않도록 주요사건 -> 인물/주장 -> 근거/기반명제 흐름을 구성하세요.',
            '사용자가 말하지 않은 법률 판단이나 책임 단정은 하지 말고, 사실 구조와 취약점 확인에 필요한 연결만 만드세요.',
          ].join('\n'),
          structuredInput: {
            kind: 'graph_extraction_request',
            schemaVersion: GRAPH_SCHEMA_VERSION,
            sourceText: normalizedText,
            existingGraph,
            expectedOutput: {
              graphPatch: {
                nodes: [{ clientId: '', kind: 'person|event|evidence|claim|premise', label: '', sourceRefs: [] }],
                links: [{ source: '', target: '', type: 'PARTICIPATES_AS|EXPLAINS|SUPPORTS|ATTACKS|UNDERCUTS|PRECEDES|DERIVED_FROM', directed: true, verificationStatus: 'asserted|corroborated|disputed|unverified', sourceRefs: [] }],
                relation_candidates: [{ source: '', target: '', suggestedType: '', reason: '', basis: '', status: 'pending' }],
              },
            },
          },
          usageUnits,
        },
      }),
      90000,
      'AI 그래프 판별 응답이 지연되고 있습니다. 잠시 뒤 다시 시도하거나 입력을 더 짧게 나누어 주세요.'
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
      const nextConversation = data.conversation;
      const existingIndex = conversations.findIndex((item) => item.id === nextConversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = nextConversation;
      } else {
        conversations.unshift(nextConversation);
      }

      activeConversation = nextConversation;
      persistGraphStateLocal();
    }

    if (data?.usage) {
      applyUsageState(data.usage);
    } else {
      applyLocalUsageIncrement(usageBeforeRequest, usageUnits);
    }

    await loadUsage({ preserveOnError: true });
    applyLocalUsageIncrement(usageBeforeRequest, usageUnits);

    const graphPatch = normalizeGraphExtractionPatch(data, normalizedText);
    if (!graphPatch || (!graphPatch.nodes.length && !graphPatch.links.length && !graphPatch.relationCandidates.length && !graphPatch.clusters.length)) {
      return { ok: false, reason: 'AI가 그래프 패치를 반환하지 않았습니다.' };
    }

    return {
      ok: true,
      graphPatch,
      assistantMessage: String(data?.assistantMessage || data?.assistant_message || graphPatch.summary || '').trim(),
    };
  } catch (error) {
    await loadUsage({ preserveOnError: true });
    return {
      ok: false,
      reason: friendlyServiceError(error instanceof Error ? error : 'AI 그래프 판별에 실패했습니다.'),
    };
  } finally {
    isSending = false;
    document.body.dataset.busy = 'false';
    document.body.dataset.busyMode = 'idle';
    syncInteractionState();
    renderAll();
  }
}

async function runCommandBlock(command, options = {}) {
  const normalizedCommand = String(command || '').trim();
  if (!normalizedCommand) {
    setServiceStatus('실행할 명령을 입력해 주세요.', 'error');
    return;
  }

  if (!graphState.nodes.length && !graphState.links.length && !(graphState.clusters || []).length) {
    setServiceStatus('먼저 오른쪽 사건 평면에 인물, 주요사건, 주장, 근거, 기반명제 중 하나 이상을 입력해 주세요.', 'error');
    return;
  }

  setCommandOpen(false);
  setServiceStatus('명령 블록을 실행하고 있습니다.', 'ready');

  const graphBeforeCommand = graphSnapshotForStorage();
  const graphSavedBefore = await persistGraphStateRemote({ reason: 'command_block_before_run' }).catch(() => false);
  const result = await invokeGraphCommand(normalizedCommand);

  if (!result.ok) {
    applyGraphSnapshot(graphBeforeCommand);
    persistGraphStateLocal();
    renderAll();
    setServiceStatus(`명령 실행 실패: ${result.reason}`, 'error');
    return;
  }

  applyGraphSnapshot(graphBeforeCommand);
  const graphSavedAfter = await persistGraphStateRemote({ reason: 'command_block_after_run' }).catch(() => false);

  const block = sanitizeCommandBlock({
    id: commandBlockId(),
    command: normalizedCommand,
    output: result.output,
    status: 'ready',
    createdAt: new Date().toISOString(),
    executedAt: new Date().toISOString(),
    sourceBlockId: options.sourceBlockId || '',
    graphSummary: graphCommandSummary(),
    usageUnits: 1,
  });

  if (!block) return;

  commandBlocks = [block, ...commandBlocks].slice(0, 80);
  persistGraphStateLocal();
  renderAll();
  setCommandResultOpen(true, block);

  const commandSaved = await persistCommandBlockRemote(block);
  persistGraphStateLocal();
  renderAll();
  setCommandResultOpen(true, block);
  setServiceStatus(
    commandSaved || graphSavedBefore || graphSavedAfter
      ? '전체 그래프와 명령 블록 묶음을 하나의 사안 파일로 저장했습니다.'
      : '명령 블록은 화면에 생성했지만 원격 사안 파일 저장이 지연되었습니다. 현재 브라우저 기록은 유지됩니다.',
    commandSaved || graphSavedBefore || graphSavedAfter ? 'ready' : 'error'
  );
}

function situationResultSummary(result = {}) {
  return [
    `새 노드 ${result.createdNodes || 0}개`,
    `반영 노드 ${result.touchedNodes || 0}개`,
    `새 관계 ${result.createdLinks || 0}개`,
    result.createdCandidates ? `검토 후보 ${result.createdCandidates}개` : '',
    result.createdClusters ? `새 클러스터 ${result.createdClusters}개` : '',
  ].filter(Boolean).join(' · ');
}

async function enhanceSituationGraphWithAi(text) {
  if (!supabase || !session?.user || !hasWorkspaceAccess() || !canChat(1)) return;

  const aiExtraction = await invokeGraphExtraction(text);
  if (!aiExtraction.ok) {
    setServiceStatus(`기본 그래프는 저장했습니다. AI 보강은 건너뛰었습니다: ${aiExtraction.reason}`, 'ready');
    return;
  }

  const result = applyGraphExtractionPatch(aiExtraction.graphPatch, text);
  if (!result?.ok) {
    setServiceStatus('기본 그래프는 저장했습니다. AI 보강 결과에는 추가할 그래프 패치가 없었습니다.', 'ready');
    return;
  }

  const graphSaved = await persistGraphStateRemote({ reason: 'ai_situation_graph_enhance' }).catch(() => false);
  persistGraphStateLocal();
  renderAll();

  setServiceStatus(
    graphSaved
      ? `AI가 그래프를 보강하고 현재 사안 파일에 저장했습니다. ${situationResultSummary(result)}`
      : `AI가 그래프를 보강했습니다. 원격 저장은 지연되어 현재 브라우저의 사안 파일을 우선 유지합니다. ${situationResultSummary(result)}`,
    graphSaved ? 'ready' : 'error'
  );
}

async function runSituationGraphInput(text) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    setServiceStatus('그래프에 반영할 상황 설명을 입력해 주세요.', 'error');
    return;
  }

  if (desktopOnlyMedia.matches) {
    setServiceStatus('RoosyCozy Intelligence는 PC 브라우저에서만 사용할 수 있습니다.', 'error');
    return;
  }

  if (!session?.user) {
    setServiceStatus('로그인 후 상황을 그래프에 반영할 수 있습니다.', 'error');
    setAuthOpen(true);
    return;
  }

  if (!hasWorkspaceAccess()) {
    setServiceStatus('권한 필요: Teacher 또는 PRO 승인 계정만 사건 평면을 사용할 수 있습니다.', 'error');
    syncInteractionState();
    return;
  }

  setSituationOpen(false);
  setServiceStatus('AI가 사안을 인물, 주요사건, 주장, 근거, 기반명제로 정리하고 있습니다.', 'ready');

  const aiExtraction = await invokeGraphExtraction(normalizedText);
  let result = null;

  if (!aiExtraction.ok) {
    result = applySituationTextToGraph(normalizedText);
    const graphSaved = result?.ok
      ? await persistGraphStateRemote({ reason: 'situation_text_to_graph_ai_fallback' }).catch(() => false)
      : false;
    persistGraphStateLocal();
    renderAll();
    setServiceStatus(
      result?.ok
        ? `AI 그래프 구성은 지연됐지만 기본 그래프를 먼저 반영했습니다. ${situationResultSummary(result)} · 사유: ${aiExtraction.reason}`
        : `AI 그래프 구성 실패: ${aiExtraction.reason}`,
      result?.ok && graphSaved ? 'ready' : 'error'
    );
    return;
  }

  result = applyGraphExtractionPatch(aiExtraction.graphPatch, normalizedText);
  if (!result?.ok) {
    const fallbackResult = applySituationTextToGraph(normalizedText);
    const graphSaved = fallbackResult?.ok
      ? await persistGraphStateRemote({ reason: 'situation_text_to_graph_empty_ai_patch' }).catch(() => false)
      : false;
    persistGraphStateLocal();
    renderAll();
    setServiceStatus(
      fallbackResult?.ok
        ? `AI 응답에 그래프 패치가 부족해 기본 그래프를 반영했습니다. ${situationResultSummary(fallbackResult)}`
        : (result?.reason || 'AI가 그래프 패치를 반환했지만 사건 평면에 반영할 노드나 관계가 없습니다.'),
      fallbackResult?.ok && graphSaved ? 'ready' : 'error'
    );
    return;
  }

  const graphSaved = await persistGraphStateRemote({ reason: 'ai_situation_text_to_graph' }).catch(() => false);
  persistGraphStateLocal();
  renderAll();

  setServiceStatus(
    graphSaved
      ? `AI가 정리한 그래프를 사건 평면에 반영하고 현재 사안 파일에 저장했습니다. ${situationResultSummary(result)}`
      : `AI가 정리한 그래프는 사건 평면에 반영했습니다. 원격 저장이 지연되어 현재 브라우저의 사안 파일을 우선 유지합니다. ${situationResultSummary(result)}`,
    graphSaved ? 'ready' : 'error'
  );
}

function renderCommandBlocks() {
  dom.activeProduct.textContent = activeConversation ? productLabel(activeConversation.product) : '사안 입력';
  dom.activeTitle.textContent = activeConversation?.title || '수사지식그래프를 구성하세요';

  const target = dom.commandList || dom.reportPreview;
  if (!target) return;

  if (!commandBlocks.length) {
    target.innerHTML = `
      <section class="case-command-empty">
        <span>명령 블록 없음</span>
        <h2>그래프에 명령을 실행하세요</h2>
        <p>오른쪽 사건 평면에 인물·사건·증거·관계선을 구성한 뒤, 취약한 연결이나 보강 자료를 명령으로 분석할 수 있습니다.</p>
        <button type="button" data-command-add>명령 추가</button>
      </section>
    `;
    syncInteractionState();
    return;
  }

  target.innerHTML = commandBlocks
    .map((block, index) => `
      <article class="case-command-block ${block.status === 'failed' ? 'is-failed' : ''}" data-command-block-id="${escapeHtml(block.id)}">
        <header>
          <div>
            <span>Command ${String(commandBlocks.length - index).padStart(2, '0')}</span>
            <h3>${escapeHtml(commandBlockTitle(block))}</h3>
          </div>
          <button type="button" data-command-view="${escapeHtml(block.id)}">결과 보기</button>
        </header>
        <div class="case-command-meta">
          <span>${escapeHtml(formatDate(block.executedAt || block.createdAt))}</span>
          <span>${escapeHtml(block.graphSummary || graphCommandSummary())}</span>
          <span>${escapeHtml(`${block.usageUnits || 1}회`)}</span>
        </div>
        <div class="case-command-actions">
          <button type="button" data-command-view="${escapeHtml(block.id)}">열기</button>
          <button type="button" data-command-rerun="${escapeHtml(block.id)}">다시 실행</button>
          <button type="button" class="is-danger" data-command-delete="${escapeHtml(block.id)}">삭제</button>
        </div>
      </article>
    `)
    .join('');

  syncInteractionState();
}

function renderAll() {
  renderConversations();
  renderMessages();
  renderCommandBlocks();
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
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(20),
      45000,
      '저장된 사안 파일을 불러오는 중 응답이 지연되고 있습니다.'
    );
  } catch (error) {
    setServiceStatus(error instanceof Error ? `${error.message} 현재 화면은 유지합니다. Supabase 인덱스 확인이 필요할 수 있습니다.` : '저장된 사안 파일을 불러오지 못했습니다.', 'error');
    renderAll();
    return;
  }

  const { data, error } = response;

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  conversations = data ?? [];
  activeConversation = conversations.find((conversation) => conversation.id === previousActiveId) ?? conversations[0] ?? null;
  if (activeConversation?.id !== previousActiveId) {
    resetKnowledgeGraph();
    lastGraphRemoteSnapshotKey = '';
  }
  if (activeConversation?.id) {
    await loadConversationDetail(activeConversation.id, { silent: true });
  }
  await loadMessages({ silent: true });
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
      30000,
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

async function loadMessages({ limit = 80, silent = false } = {}) {
  if (!activeConversation || !supabase) {
    messages = [];
    commandBlocks = [];
    latestReportMeta = null;
    resetKnowledgeGraph();
    return;
  }

  if (activeConversation.isLocal) {
    commandBlocks = [];
    latestReportMeta = null;
    return;
  }

  let response;
  try {
    response = await withTimeout(
      supabase
        .from('report_messages')
        .select('id, conversation_id, role, content, metadata, created_at')
        .eq('conversation_id', activeConversation.id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      30000,
      '사안 파일 내용을 불러오는 중 응답이 지연되고 있습니다.'
    );
  } catch (error) {
    if (!silent) {
      setServiceStatus(error instanceof Error ? error.message : '대화 기록을 불러오지 못했습니다.', 'error');
    }
    return;
  }

  const { data, error } = response;

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  const rows = (data ?? []).slice().reverse();
  const remoteSnapshot = latestGraphSnapshotFromMessages(rows);
  const localSnapshot = loadGraphStateLocal(activeConversation.id);
  const snapshot = graphSnapshotSortValue(localSnapshot) >= graphSnapshotSortValue(remoteSnapshot)
    ? localSnapshot
    : remoteSnapshot;

  commandBlocks = commandBlocksFromMessages(rows);
  messages = rows.filter((message) => !isWorkspaceInternalMessage(message));
  latestReportMeta = latestReportMetaFromMessages(messages);

  if (snapshot) {
    applyGraphSnapshot(snapshot);
    commandBlocks = snapshot.hasBundledCommandBlocks
      ? snapshot.commandBlocks
      : commandBlocksFromMessages(rows);
    lastGraphRemoteSnapshotKey = JSON.stringify({
      nodes: graphState.nodes,
      links: graphState.links,
      relationCandidates: graphState.relationCandidates,
      clusters: graphState.clusters,
      activeLegalTemplateId: graphState.activeLegalTemplateId,
      analysisResults: graphState.analysisResults,
      commandBlocks,
      viewport: graphViewport,
    });
  } else {
    commandBlocks = commandBlocksFromMessages(rows);
  }
}

async function selectConversation(id) {
  activeConversation = conversations.find((conversation) => conversation.id === id) ?? null;
  evidenceFiles = [];
  commandBlocks = [];
  latestReportMeta = null;
  resetKnowledgeGraph();
  await loadConversationDetail(id, { silent: false });
  await loadMessages({ silent: false });
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

async function invokeChat({
  message = '',
  forceReport = false,
  structuredInput = null,
  includeEvidence = false,
  clientIntentOverride = '',
  shouldUpdateReportOverride = null,
  clientGuidanceExtra = '',
  timeoutMsOverride = null,
  reloadMessagesAfter = true,
} = {}) {
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
  const inferredIntent = classifyChatIntent(trimmedMessage, forceReport);
  const chatIntent = clientIntentOverride || inferredIntent;
  const shouldUpdateReport = typeof shouldUpdateReportOverride === 'boolean'
    ? shouldUpdateReportOverride
    : shouldUpdateReportFromMessage(chatIntent, forceReport);
  const forceFullReport = Boolean(forceReport && shouldUpdateReport);
  const evidenceGuidance = includeEvidence ? buildEvidenceGuidance() : '';
  const graphGuidance = structuredInput ? '' : buildKnowledgeGraphGuidance();
  const usageUnits = evidenceGuidance && shouldUpdateReport ? 2 : 1;
  const requestPolicy = {
    ...chatRequestPolicy(chatIntent, shouldUpdateReport),
    inferredIntent,
    usageUnits,
    includesPdfEvidence: Boolean(evidenceGuidance),
    includesKnowledgeGraph: Boolean(graphGuidance),
    includeEvidence,
    structuredInputKind: structuredInput?.kind || null,
    forceReportRequested: Boolean(forceReport),
    forceFullReport,
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
    const behaviorGuide = shouldUpdateReport
      ? reportChatBehaviorGuide
      : '일반 메시지 모드: 보고서 전문을 갱신하지 말고 사용자 질문에 짧게 답하세요. report_changed는 false입니다.';
    const clientGuidance = [behaviorGuide, clientGuidanceExtra, graphGuidance, evidenceGuidance]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 12000);
    const timeoutMs = timeoutMsOverride ?? (shouldUpdateReport ? 160000 : 65000);
    const { data, error } = await withTimeout(
      supabase.functions.invoke('report-chat', {
        body: {
          conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
          product: activeConversation?.product ?? currentProductKind(),
          message: trimmedMessage,
          forceReport: forceFullReport,
          clientIntent: chatIntent,
          clientPolicy: requestPolicy,
          clientGuidance,
          structuredInput,
          usageUnits,
        },
      }),
      timeoutMs,
      shouldUpdateReport
        ? '답변과 정밀 분석 보고서 정리가 지연되고 있습니다. 요청이 너무 크면 PDF 증거 반영과 노드 반영을 나누어 실행해 주세요.'
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

    const nextReportMeta = normalizeReportMeta(chatResponse.meta);
    if (nextReportMeta && (chatResponse.meta?.updateReport || chatResponse.meta?.reportChanged)) {
      latestReportMeta = nextReportMeta;
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
      persistGraphStateLocal();
      scheduleGraphRemotePersistence('chat_response');
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
    if (reloadMessagesAfter) {
      loadMessages({ silent: true }).then(() => renderAll()).catch(() => {});
    }
    renderAll();
    setServiceStatus('분석 저장 완료', 'ready');
    return { ok: true, conversation: activeConversation, usage: usageState, response: chatResponse };
  } catch (error) {
    await loadUsage({ preserveOnError: true });
    const messageText = friendlyServiceError(error instanceof Error ? error : '요청에 실패했습니다.');
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
    .eq('user_id', session.user.id)
    .select(conversationDetailSelect)
    .single();

  if (error) {
    setServiceStatus(error.message, 'error');
  } else {
    activeConversation = data;
    conversations = conversations.map((conversation) => (
      conversation.id === data.id ? data : conversation
    ));
    persistGraphStateLocal();
    const graphSaved = await persistGraphStateRemote({ reason: 'case_save' });
    setServiceStatus(
      graphSaved ? '사안 파일 저장 완료: 전체 그래프와 명령 세트를 함께 보존했습니다.' : '명령 세트는 저장했지만 수사지식그래프 원격 저장은 지연되었습니다. 새로고침 복원은 이 브라우저에서 유지됩니다.',
      graphSaved ? 'ready' : 'error'
    );
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

  const ok = window.confirm(`'${target.title || '새 사안'}' 사안 파일을 삭제할까요?`);
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
  removeGraphStateLocal(id);

  if (activeConversation?.id === id) {
    activeConversation = conversations[0] ?? null;
    commandBlocks = [];
    resetKnowledgeGraph();
    if (activeConversation?.id) {
      await loadConversationDetail(activeConversation.id, { silent: true });
    }
    await loadMessages({ silent: true });
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
  dom.reportToggle.setAttribute('aria-label', isOpen ? '명령 블록 닫기' : '명령 블록 열기');
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

  const evidenceNodeButton = event.target.closest('[data-evidence-node]');
  if (evidenceNodeButton) {
    createEvidenceNodeFromFile(evidenceNodeButton.dataset.evidenceNode);
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
  renderGraphTimeAxis();
}, { passive: false });

dom.graphCanvas?.addEventListener('pointerdown', (event) => {
  if (![0, 2].includes(event.button)) return;
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (event.target.closest?.('[data-graph-cluster-id]')) return;
  if (event.target.closest?.('[data-graph-link-id]')) return;
  if (event.target.closest?.('[data-graph-create-menu], [data-graph-node-menu]')) return;

  const isPanGesture = event.button === 2;
  const screen = graphClientPoint(event);
  const world = graphScreenToWorld(screen);
  graphCanvasDragState = {
    mode: isPanGesture ? 'pan' : 'select',
    pointerId: event.pointerId,
    startScreen: screen,
    currentScreen: screen,
    startWorld: world,
    startViewport: { ...graphViewport },
    moved: false,
  };

  setGraphCreateMenuOpen(false);
  setGraphNodeMenuOpen(false);
  setGraphMarquee(null);
  dom.graphCanvas.classList.toggle('is-panning', isPanGesture);
  dom.graphCanvas.setPointerCapture?.(event.pointerId);
  if (isPanGesture) event.preventDefault();
});

dom.graphCanvas?.addEventListener('contextmenu', (event) => {
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (event.target.closest?.('[data-graph-create-menu], [data-graph-node-menu]')) return;
  event.preventDefault();
});

dom.graphCanvas?.addEventListener('click', (event) => {
  if (event.button !== 0) return;
  if (Date.now() < graphCanvasSuppressClickUntil) return;
  if (event.target.closest?.('[data-graph-node-id]')) return;
  if (event.target.closest?.('[data-graph-cluster-id]')) return;
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
  const clusterElement = event.target.closest('[data-graph-cluster-id]');
  if (clusterElement && event.button === 0 && !event.target.closest('[data-graph-node-id]')) {
    const cluster = graphClusterById(clusterElement.dataset.graphClusterId);
    if (!cluster) return;

    const now = Date.now();
    const isDoublePress = graphLastClusterPress.id === cluster.id && now - graphLastClusterPress.at < 420;
    graphLastClusterPress = { id: cluster.id, at: now };

    if (isDoublePress) {
      graphClusterDragState = null;
      openGraphClusterMemo(cluster.id);
      event.preventDefault();
      return;
    }

    graphClusterDragState = {
      id: cluster.id,
      startX: event.clientX,
      startY: event.clientY,
      clusterX: cluster.x,
      clusterY: cluster.y,
      nodePositions: (cluster.nodeIds || [])
        .map((id) => {
          const node = graphNodeById(id);
          return node ? { id: node.id, x: node.x, y: node.y } : null;
        })
        .filter(Boolean),
      moved: false,
    };
    clusterElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }

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
  const clusterElement = event.target.closest('[data-graph-cluster-id]');
  if (clusterElement && !event.target.closest('[data-graph-node-id]')) {
    const cluster = graphClusterById(clusterElement.dataset.graphClusterId);
    if (!cluster) return;
    event.preventDefault();
    openGraphClusterMemo(cluster.id);
    return;
  }

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

dom.commandAddButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    if (!canChat()) {
      setServiceStatus('권한과 사용량을 확인한 뒤 명령을 실행할 수 있습니다.', 'error');
      syncInteractionState();
      return;
    }
    setCommandOpen(true);
  });
});

dom.situationAddButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    if (!canChat()) {
      setServiceStatus('권한과 사용량을 확인한 뒤 상황을 추가할 수 있습니다.', 'error');
      syncInteractionState();
      return;
    }
    setSituationOpen(true);
  });
});

dom.commandBackdrop?.addEventListener('click', () => {
  setCommandOpen(false);
});

dom.situationBackdrop?.addEventListener('click', () => {
  setSituationOpen(false);
});

dom.commandResultBackdrop?.addEventListener('click', () => {
  setCommandResultOpen(false);
});

dom.commandCloseButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    setCommandOpen(false);
  });
});

dom.situationCloseButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    setSituationOpen(false);
  });
});

dom.commandResultCloseButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    setCommandResultOpen(false);
  });
});

dom.commandRun?.addEventListener('click', async () => {
  const command = dom.commandInput?.value || '';
  await runCommandBlock(command);
});

dom.situationRun?.addEventListener('click', async () => {
  const text = dom.situationInput?.value || '';
  await runSituationGraphInput(text);
});

dom.commandInput?.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    dom.commandRun?.click();
  }
});

dom.situationInput?.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    dom.situationRun?.click();
  }
});

dom.commandList?.addEventListener('click', async (event) => {
  const rerunButton = event.target.closest('[data-command-rerun]');
  const viewButton = event.target.closest('[data-command-view]');
  const deleteButton = event.target.closest('[data-command-delete]');
  const addButton = event.target.closest('[data-command-add]');
  const blockElement = event.target.closest('[data-command-block-id]');

  if (addButton) {
    if (!canChat()) {
      setServiceStatus('권한과 사용량을 확인한 뒤 명령을 실행할 수 있습니다.', 'error');
      syncInteractionState();
      return;
    }
    setCommandOpen(true);
    return;
  }

  if (deleteButton) {
    await deleteCommandBlock(deleteButton.dataset.commandDelete);
    return;
  }

  if (viewButton) {
    setCommandResultOpen(true, viewButton.dataset.commandView);
    return;
  }

  if (blockElement && !event.target.closest('button')) {
    setCommandResultOpen(true, blockElement.dataset.commandBlockId);
    return;
  }

  if (!rerunButton) return;
  const block = commandBlocks.find((item) => item.id === rerunButton.dataset.commandRerun);
  if (!block) return;
  await runCommandBlock(block.command, { sourceBlockId: block.id });
});

dom.commandResultOutput?.addEventListener('click', (event) => {
  const refButton = event.target.closest('[data-graph-ref-id]');
  if (!refButton) return;
  event.preventDefault();
  const ok = focusGraphEntity(refButton.dataset.graphRefKind, refButton.dataset.graphRefId);
  setServiceStatus(ok ? '그래프 요소를 선택했습니다.' : '해당 그래프 요소를 찾지 못했습니다.', ok ? 'ready' : 'error');
});

dom.graphMemoBackdrop?.addEventListener('click', () => {
  setGraphMemoOpen(false);
});

dom.graphMemoClose?.addEventListener('click', () => {
  setGraphMemoOpen(false);
});

dom.graphMemoNote?.addEventListener('input', () => {
  updateGraphMentionMenu();
});

dom.graphMemoNote?.addEventListener('click', () => {
  updateGraphMentionMenu();
});

dom.graphMemoNote?.addEventListener('keydown', (event) => {
  if (!graphMentionState.open || !graphMentionState.items.length) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const length = graphMentionState.items.length;
    setGraphMentionOpen(true, {
      activeIndex: (graphMentionState.activeIndex + delta + length) % length,
    });
    return;
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    insertGraphMention(graphMentionState.items[graphMentionState.activeIndex]?.id);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    setGraphMentionOpen(false);
  }
});

dom.graphMentionMenu?.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

dom.graphMentionMenu?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-graph-mention-id]');
  if (!button) return;
  insertGraphMention(button.dataset.graphMentionId);
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
  const relationCount = saved.mappedLinks?.length || 0;
  setServiceStatus(
    saved.cluster
      ? '클러스터 편집 내용을 현재 사안 그래프에 저장했습니다.'
      : relationCount
        ? `사안 메모를 저장하고 ${relationCount}개 관계선을 자동 연결했습니다.`
        : '노드 편집 내용을 현재 사안 그래프에 저장했습니다.',
    'ready'
  );
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
      if (graphCanvasDragState.mode === 'select') {
        setGraphMarquee({
          left: Math.min(graphCanvasDragState.startScreen.x, currentScreen.x),
          top: Math.min(graphCanvasDragState.startScreen.y, currentScreen.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
        });
      } else {
        graphViewport = {
          ...graphViewport,
          x: graphCanvasDragState.startViewport.x + dx,
          y: graphCanvasDragState.startViewport.y + dy,
        };
        setGraphMarquee(null);
        applyGraphViewport();
        renderGraphTimeAxis();
      }
    }
  }

  if (graphClusterDragState && dom.graphCanvas) {
    const dx = (event.clientX - graphClusterDragState.startX) / graphViewport.scale;
    const dy = (event.clientY - graphClusterDragState.startY) / graphViewport.scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) graphClusterDragState.moved = true;

    graphState = {
      ...graphState,
      clusters: (graphState.clusters || []).map((cluster) => (
        cluster.id === graphClusterDragState.id
          ? {
              ...cluster,
              x: graphClusterDragState.clusterX + dx,
              y: graphClusterDragState.clusterY + dy,
            }
          : cluster
      )),
      nodes: graphState.nodes.map((node) => {
        const initial = graphClusterDragState.nodePositions.find((item) => item.id === node.id);
        return initial
          ? {
              ...node,
              x: initial.x + dx,
              y: initial.y + dy,
            }
          : node;
      }),
      selectedNodeId: null,
      selectedLinkId: null,
    };
    renderKnowledgeGraph();
    return;
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
    dom.graphCanvas?.classList.remove('is-panning');
    setGraphMarquee(null);

    if (selectionState.moved) {
      graphCanvasSuppressClickUntil = Date.now() + 160;

      if (selectionState.mode !== 'select') {
        persistGraphStateLocal();
        return;
      }

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

  if (graphClusterDragState) {
    const clusterId = graphClusterDragState.id;
    const wasMoved = graphClusterDragState.moved;
    graphClusterDragState = null;
    graphCanvasSuppressClickUntil = Date.now() + 160;

    if (wasMoved) {
      renderAll();
      scheduleGraphRemotePersistence('graph_cluster_move');
      setServiceStatus('클러스터 묶음을 이동했습니다.', 'ready');
      return;
    }

    if (graphClusterById(clusterId)) {
      graphState = {
        ...graphState,
        selectedNodeId: null,
        selectedLinkId: null,
      };
      renderKnowledgeGraph();
    }
    return;
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
  scheduleGraphRemotePersistence('graph_node_move');
});

dom.graphLinkMode?.addEventListener('click', () => {
  graphState = {
    ...graphState,
    linkMode: !graphState.linkMode,
    pendingLinkNodeId: !graphState.linkMode ? graphState.selectedNodeId : null,
  };
  renderAll();
});

dom.graphCommandPresetButtons?.forEach((button) => {
  button.addEventListener('click', () => {
    runCommandBlock(button.dataset.graphCommandPreset || button.textContent || '');
  });
});

dom.graphClear?.addEventListener('click', () => {
  const ok = graphState.nodes.length
    ? window.confirm('현재 사건 평면을 초기화할까요?')
    : true;
  if (!ok) return;
  resetKnowledgeGraph();
  renderAll();
  scheduleGraphRemotePersistence('graph_clear');
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
    setServiceStatus('PDF 본문 추출이 끝난 뒤 정밀 분석 보고서에 반영할 수 있습니다.', 'error');
    return;
  }

  invokeChat({
    message: '증거 관리 섹션에 올린 PDF 본문을 바탕으로 사건 시간축, 관계 역학, 논리적 강점, 논리적 약점, 공략점 및 보강 전략, 제출 전 정리 문안을 업데이트해줘.',
    forceReport: true,
    includeEvidence: true,
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
  commandBlocks = [];
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

  if (!session?.user) {
    setServiceStatus('로그인 후 상황을 그래프에 반영할 수 있습니다.', 'error');
    setAuthOpen(true);
    return;
  }

  if (!canChat()) {
    setServiceStatus('권한과 사용량을 확인한 뒤 상황을 추가할 수 있습니다.', 'error');
    syncInteractionState();
    return;
  }

  dom.input.value = '';
  resizeComposer();
  await runSituationGraphInput(message);
});

dom.input.addEventListener('input', resizeComposer);

dom.input.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  dom.form.requestSubmit();
});

dom.generateReport?.addEventListener('click', () => {
  invokeChat({ forceReport: true });
});

boot();
