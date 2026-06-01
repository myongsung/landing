import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const config = window.ROOSYCOZY_SUPABASE ?? {};
const supabaseUrl = config.url ?? '';
const supabasePublishableKey = config.publishableKey ?? '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

document.body.dataset.supabaseConfigured = isSupabaseConfigured ? 'true' : 'false';

const dom = {
  authPanel: document.querySelector('[data-auth-panel]'),
  userPanel: document.querySelector('[data-user-panel]'),
  authMessage: document.querySelector('[data-auth-message]'),
  serviceStatus: document.querySelector('[data-service-status]'),
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
  teacherUpgradeForm: document.querySelector('[data-teacher-upgrade-form]'),
  teacherCodeInput: document.querySelector('[data-teacher-code-input]'),
  upgradeMessage: document.querySelector('[data-upgrade-message]'),
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

function setAuthMessage(message, isError = false) {
  if (!dom.authMessage) return;
  dom.authMessage.textContent = message;
  dom.authMessage.style.color = isError ? '#b42318' : '#667085';
}

function setServiceStatus(message, status = 'idle') {
  if (!dom.serviceStatus) return;
  const isError = status === 'error';
  dom.serviceStatus.hidden = !isError;
  dom.serviceStatus.textContent = isError ? message : '';
  dom.serviceStatus.dataset.status = status;
}

function setUpgradeMessage(message, status = 'idle') {
  if (!dom.upgradeMessage) return;
  dom.upgradeMessage.textContent = message;
  dom.upgradeMessage.dataset.status = status;
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
    dom.input.placeholder = 'Google 로그인 후 상담을 시작하세요';
    if (dom.composerNote) dom.composerNote.textContent = '비로그인 사용자는 대화할 수 없습니다. Google 로그인 후 이용해 주세요.';
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

function markdownToHtml(markdown) {
  const source = String(markdown || '').trim();

  if (!source) {
    return `
      <header class="report-cover">
        <span>RoosyCozy Case Report</span>
        <h2>상담 내용 정리</h2>
        <p>AI와 문답을 시작하면 사건 개요, 경위, 쟁점, 요청사항이 문서 형식으로 정리됩니다.</p>
      </header>
      <div class="report-meta">
        <span>문답 기반 정리</span>
        <span>자동 갱신</span>
      </div>
      <section class="report-section report-placeholder">
        <h2>작성 대기</h2>
        <p>왼쪽 상담창에서 상황을 입력하면 보고서가 자동으로 갱신됩니다.</p>
      </section>
    `;
  }

  const lines = source.split('\n');
  let title = '사건보고서';
  const sections = [];
  let currentSection = null;
  let paragraph = [];
  let list = [];

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

  function startSection(nextTitle, level = 2) {
    flushParagraph();
    flushList();
    currentSection = { title: nextTitle, level, blocks: [] };
    sections.push(currentSection);
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    if (line.startsWith('# ')) {
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

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ''));
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  const body = sections
    .filter((section) => section.title || section.blocks.length)
    .map((section) => {
      const heading = section.title
        ? `<h${section.level}>${escapeHtml(section.title)}</h${section.level}>`
        : '';
      const blocks = section.blocks
        .map((block) => {
          if (block.type === 'list') {
            const items = block.items
              .map((item) => `<li>${reportInlineHtml(item)}</li>`)
              .join('');
            return `<ul>${items}</ul>`;
          }

          return `<p>${block.lines.map(reportInlineHtml).join('<br>')}</p>`;
        })
        .join('');

      return `<section class="report-section">${heading}${blocks}</section>`;
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

function productLabel(product) {
  return '통합 상담';
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
        <strong>사실관계와 보고서 구조를 정리하고 있습니다</strong>
      </div>
    `;
    dom.messageList.append(loading);
  }

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
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
  if (!session?.user) {
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
    const { data, error } = await supabase.functions.invoke('report-chat', {
      body: {
        conversationId: activeConversation?.isLocal ? null : activeConversation?.id ?? null,
        product: activeConversation?.product ?? 'pro',
        message: trimmedMessage,
        forceReport,
      },
    });

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
    setAuthMessage(error.message, true);
  }
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

async function redeemTeacherUpgradeCode(event) {
  event.preventDefault();

  if (!session?.user) {
    setUpgradeMessage('Google 로그인 후 프로코드를 입력해 주세요.', 'error');
    return;
  }

  const code = dom.teacherCodeInput?.value.trim().toUpperCase() ?? '';

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    setUpgradeMessage('프로코드는 영문 대문자와 숫자 6자리입니다.', 'error');
    return;
  }

  const client = ensureClient();
  if (!client) return;

  const submitButton = dom.teacherUpgradeForm.querySelector('button[type="submit"]');
  const idleLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '확인 중';
  setUpgradeMessage('프로코드를 확인하고 있습니다.', 'loading');

  try {
    const { data, error } = await withTimeout(
      client.rpc('redeem_teacher_upgrade_code', {
        input_code: code,
      }),
      12000,
      '프로코드 승급 RPC 응답이 지연되고 있습니다. Database Function redeem_teacher_upgrade_code 상태를 확인해 주세요.'
    );

    if (error) throw error;

    dom.teacherCodeInput.value = '';
    applyUsageState({
      tier: data?.tier ?? 'teacher',
      used: data?.used ?? usageState.used,
      limit: data?.limit ?? tierConfig.teacher.limit,
      period: data?.period ?? usageState.period,
    });
    await withTimeout(
      loadUsage(),
      8000,
      '사용량 갱신 응답이 지연되고 있습니다.'
    ).catch(() => null);
    setUpgradeMessage('Teacher 계정으로 승급되었습니다. 사용량이 갱신되었습니다.', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : '승급 처리에 실패했습니다.';
    setUpgradeMessage(`승급 오류: ${message}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = idleLabel;
    syncInteractionState();
  }
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

function setMenuOpen(isOpen) {
  if (!dom.menuToggle) return;
  if (isOpen) {
    setReportOpen(false);
    setHistoryOpen(false);
    setLicenseOpen(false);
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
  }

  document.body.classList.toggle('is-license-open', isOpen);
  dom.licenseModal.hidden = false;
  dom.licenseBackdrop.hidden = !isOpen;
  dom.licenseModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

  if (isOpen) {
    setUpgradeMessage('프로코드는 인디스쿨에서 루지코지by노명성을 찾아 쪽지를 보내면 안내받을 수 있습니다.', 'idle');
    setTimeout(() => dom.teacherCodeInput?.focus(), 60);
    return;
  }

  setTimeout(() => {
    if (!document.body.classList.contains('is-license-open')) {
      dom.licenseModal.hidden = true;
    }
  }, 180);
}

function setReportOpen(isOpen) {
  if (!dom.reportToggle || !dom.reportBackdrop) return;
  if (isOpen) {
    setMenuOpen(false);
    setHistoryOpen(false);
    setLicenseOpen(false);
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
  applySession(data.session);
  await loadUsage();

  client.auth.onAuthStateChange(async (_event, nextSession) => {
    applySession(nextSession);
    if (nextSession?.user) {
      await loadUsage();
      await loadConversations();
    }
  });

  if (data.session?.user) {
    await loadConversations();
  }

  const draftPrompt = sessionStorage.getItem('roosycozyDraftPrompt');

  if (draftPrompt) {
    dom.input.value = draftPrompt;
    resizeComposer();
    sessionStorage.removeItem('roosycozyDraftPrompt');
  }
}

dom.signInGoogle.addEventListener('click', signInWithGoogle);
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

dom.teacherUpgradeForm?.addEventListener('submit', redeemTeacherUpgradeCode);

dom.teacherCodeInput?.addEventListener('input', () => {
  dom.teacherCodeInput.value = dom.teacherCodeInput.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
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
  setMenuOpen(false);
  setHistoryOpen(false);
  setReportOpen(false);
  setLicenseOpen(false);
});

dom.newConversation.addEventListener('click', () => {
  activeConversation = null;
  messages = [];
  setMenuOpen(false);
  setHistoryOpen(false);
  setReportOpen(false);
  setLicenseOpen(false);
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
