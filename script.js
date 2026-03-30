/**
 * SafeSpace AI Mental Health Therapist – JavaScript
 *
 * Modules:
 *   1. Theme Toggle
 *   2. View Switching (Chat / Dashboard)
 *   3. Mobile Sidebar
 *   4. Chat (send / receive / render)
 *   5. Message Timestamps & Date Separators
 *   6. Mood Tracking (quick bar + dashboard)
 *   7. Breathing Exercise Widget
 *   8. localStorage Persistence
 *   9. Init
 */

'use strict';

/* ================================================================
   1. Constants & State
================================================================ */

const BACKEND_URL = 'http://localhost:8000/ask';
const MAX_MESSAGES = 100;
const MAX_MOOD_ENTRIES = 50;

const MOOD_MAP = {
  happy:      { emoji: '😊', label: 'Happy' },
  neutral:    { emoji: '😐', label: 'Neutral' },
  sad:        { emoji: '😔', label: 'Sad' },
  anxious:    { emoji: '😰', label: 'Anxious' },
  frustrated: { emoji: '😤', label: 'Frustrated' },
  tired:      { emoji: '😴', label: 'Tired' },
};

let selectedMoodKey = null;  // dashboard mood selector state
let breathingTimer = null;   // setInterval handle for breathing
let breathingActive = false;

/* ================================================================
   2. Theme Toggle
================================================================ */

function getStoredTheme() {
  return localStorage.getItem('safespace_theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('safespace_theme', theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const themeIconEl = document.getElementById('themeIcon');
  const mobileIconEl = document.getElementById('mobileThemeIcon');
  if (themeIconEl) themeIconEl.textContent = icon;
  if (mobileIconEl) mobileIconEl.textContent = icon;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

/* ================================================================
   3. View Switching
================================================================ */

function switchView(view) {
  const chatView = document.getElementById('chatView');
  const dashboardView = document.getElementById('dashboardView');
  const navChat = document.getElementById('navChat');
  const navDashboard = document.getElementById('navDashboard');

  if (view === 'chat') {
    chatView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    navChat.classList.add('active');
    navDashboard.classList.remove('active');
    navChat.setAttribute('aria-pressed', 'true');
    navDashboard.setAttribute('aria-pressed', 'false');
  } else {
    chatView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    navDashboard.classList.add('active');
    navChat.classList.remove('active');
    navDashboard.setAttribute('aria-pressed', 'true');
    navChat.setAttribute('aria-pressed', 'false');
    renderMoodDashboard();
  }

  // close mobile sidebar if open
  closeSidebar();
}

/* ================================================================
   4. Mobile Sidebar
================================================================ */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

/* ================================================================
   5. Chat – Message Rendering
================================================================ */

/**
 * Format a Date as "Today at 2:30 PM" or "Mar 30, 2026 at 2:30 PM"
 */
function formatMessageTime(dateObj) {
  const now = new Date();
  const isToday = (
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate()
  );
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${timeStr}`;
  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Return a short date string like "Today" or "Mar 30, 2026" used for separators.
 */
function shortDate(dateObj) {
  const now = new Date();
  const isToday = (
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate()
  );
  if (isToday) return 'Today';
  return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

let lastRenderedDate = null;  // track separator state during session

function maybeInsertDateSeparator(dateObj) {
  const dayKey = dateObj.toDateString();
  if (lastRenderedDate === dayKey) return;
  lastRenderedDate = dayKey;
  const sep = document.createElement('div');
  sep.className = 'date-separator';
  sep.setAttribute('role', 'separator');
  sep.innerHTML = `<span class="date-separator-text">${shortDate(dateObj)}</span>`;
  document.getElementById('messagesArea').appendChild(sep);
}

function renderMessage({ role, text, timestamp, toolUsed }) {
  const messagesArea = document.getElementById('messagesArea');

  // Remove welcome message if present
  const welcome = messagesArea.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  const dateObj = timestamp ? new Date(timestamp) : new Date();
  maybeInsertDateSeparator(dateObj);

  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `message-row ${isUser ? 'user' : 'bot'}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = isUser ? '👤' : '🧠';

  const content = document.createElement('div');
  content.className = 'message-content';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  const ts = document.createElement('div');
  ts.className = 'message-timestamp';
  ts.setAttribute('aria-label', `Sent ${formatMessageTime(dateObj)}`);
  ts.textContent = formatMessageTime(dateObj);

  content.appendChild(bubble);

  if (!isUser && toolUsed && toolUsed !== 'None') {
    const badge = document.createElement('div');
    badge.className = 'message-tool-badge';
    badge.setAttribute('aria-label', `Tool used: ${toolUsed}`);
    badge.textContent = `⚙ Tool: ${toolUsed}`;
    content.appendChild(badge);
  }

  content.appendChild(ts);

  row.appendChild(avatar);
  row.appendChild(content);
  messagesArea.appendChild(row);
  scrollToBottom();
  return row;
}

function renderLoadingMessage() {
  const messagesArea = document.getElementById('messagesArea');
  const row = document.createElement('div');
  row.className = 'message-row bot loading';
  row.id = 'loadingMessage';
  row.innerHTML = `
    <div class="message-avatar" aria-hidden="true">🧠</div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-dots" aria-label="Thinking...">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>`;
  messagesArea.appendChild(row);
  scrollToBottom();
  return row;
}

function removeLoadingMessage() {
  const loader = document.getElementById('loadingMessage');
  if (loader) loader.remove();
}

function scrollToBottom() {
  const area = document.getElementById('messagesArea');
  area.scrollTop = area.scrollHeight;
}

/* ================================================================
   6. Chat – Send / Receive
================================================================ */

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  autoResizeTextarea(input);

  const timestamp = new Date().toISOString();
  const userMsg = { role: 'user', text, timestamp };
  renderMessage(userMsg);
  saveMessage(userMsg);

  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;

  const loader = renderLoadingMessage();

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    removeLoadingMessage();

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    const botMsg = {
      role: 'bot',
      text: data.response || 'I received your message but could not generate a response.',
      timestamp: new Date().toISOString(),
      toolUsed: data.tool_called || null,
    };
    renderMessage(botMsg);
    saveMessage(botMsg);
  } catch (err) {
    removeLoadingMessage();
    const errMsg = {
      role: 'bot',
      text: `⚠️ Unable to reach SafeSpace server. Please make sure the backend is running at ${BACKEND_URL}`,
      timestamp: new Date().toISOString(),
    };
    const errRow = renderMessage(errMsg);
    errRow.querySelector('.message-bubble').classList.add('error-message');
    // don't save error messages to history
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/* Textarea auto-resize */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* Keyboard: Enter sends, Shift+Enter = newline */
document.getElementById('chatInput')?.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('chatInput')?.addEventListener('input', function () {
  autoResizeTextarea(this);
});

/* ================================================================
   7. Chat – localStorage persistence
================================================================ */

function getStoredMessages() {
  try {
    return JSON.parse(localStorage.getItem('safespace_messages') || '[]');
  } catch {
    return [];
  }
}

function saveMessage(msg) {
  const msgs = getStoredMessages();
  msgs.push(msg);
  // keep last MAX_MESSAGES
  if (msgs.length > MAX_MESSAGES) msgs.splice(0, msgs.length - MAX_MESSAGES);
  localStorage.setItem('safespace_messages', JSON.stringify(msgs));
}

function loadChatHistory() {
  const msgs = getStoredMessages();
  if (!msgs.length) return;
  msgs.forEach(msg => renderMessage(msg));
}

/* ================================================================
   8. Mood Tracking – Quick Mood Bar
================================================================ */

function quickLogMood(key, emoji, label) {
  logMood(key);

  const feedback = document.getElementById('moodFeedback');
  feedback.textContent = `${emoji} ${label} logged!`;
  feedback.classList.remove('show');
  // force reflow to restart animation
  void feedback.offsetWidth;
  feedback.classList.add('show');

  // clear class after animation
  setTimeout(() => {
    feedback.classList.remove('show');
    feedback.textContent = '';
  }, 2600);
}

/* ================================================================
   9. Mood Tracking – Dashboard
================================================================ */

function selectMood(btn) {
  // deselect previous
  document.querySelectorAll('.mood-select-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedMoodKey = btn.dataset.mood;
  document.getElementById('logMoodBtn').disabled = false;
}

function logMoodFromDashboard() {
  if (!selectedMoodKey) return;
  logMood(selectedMoodKey);

  // deselect
  document.querySelectorAll('.mood-select-btn').forEach(b => b.classList.remove('selected'));
  selectedMoodKey = null;
  document.getElementById('logMoodBtn').disabled = true;

  renderMoodDashboard();
}

function logMood(key) {
  const info = MOOD_MAP[key];
  if (!info) return;
  const entry = {
    key,
    emoji: info.emoji,
    label: info.label,
    timestamp: new Date().toISOString(),
  };
  const entries = getStoredMoods();
  entries.push(entry);
  if (entries.length > MAX_MOOD_ENTRIES) entries.splice(0, entries.length - MAX_MOOD_ENTRIES);
  localStorage.setItem('safespace_moods', JSON.stringify(entries));
}

function getStoredMoods() {
  try {
    return JSON.parse(localStorage.getItem('safespace_moods') || '[]');
  } catch {
    return [];
  }
}

function renderMoodDashboard() {
  const entries = getStoredMoods();
  renderMoodStats(entries);
  renderMoodHistoryList(entries);
}

function renderMoodStats(entries) {
  const totalEl = document.getElementById('statTotalEntries');
  const todayEl = document.getElementById('statTodayMood');
  const topEl = document.getElementById('statTopMood');
  const lastEl = document.getElementById('statLastEntry');

  totalEl.textContent = entries.length;

  if (!entries.length) {
    todayEl.textContent = '—';
    topEl.textContent = '—';
    lastEl.textContent = '—';
    return;
  }

  // Most frequent today
  const todayStr = new Date().toDateString();
  const todayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === todayStr);
  todayEl.textContent = mostFrequentMood(todayEntries);

  // Overall top mood
  topEl.textContent = mostFrequentMood(entries);

  // Last entry
  const last = entries[entries.length - 1];
  const lastDate = new Date(last.timestamp);
  const lastTimeStr = lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  lastEl.textContent = `${last.emoji} ${lastTimeStr}`;
}

function mostFrequentMood(entries) {
  if (!entries.length) return '—';
  const counts = {};
  entries.forEach(e => { counts[e.key] = (counts[e.key] || 0) + 1; });
  const topKey = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const info = MOOD_MAP[topKey];
  return info ? `${info.emoji} ${info.label}` : '—';
}

function renderMoodHistoryList(entries) {
  const list = document.getElementById('moodHistoryList');
  const countEl = document.getElementById('moodEntryCount');

  countEl.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span aria-hidden="true">🌟</span>
        <p>No mood entries yet. Log your first mood above!</p>
      </div>`;
    return;
  }

  // Show newest first
  const reversed = [...entries].reverse();
  list.innerHTML = '';
  reversed.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'mood-entry-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <div class="entry-emoji" aria-hidden="true">${entry.emoji}</div>
      <div class="entry-info">
        <div class="entry-mood-name">${entry.label}</div>
        <div class="entry-time">${formatMessageTime(new Date(entry.timestamp))}</div>
      </div>`;
    list.appendChild(item);
  });
}

/* ================================================================
   10. Breathing Exercise Widget
================================================================ */

function openBreathingModal() {
  const modal = document.getElementById('breathingModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  closeSidebar();
}

function closeBreathingModal() {
  stopBreathing();
  const modal = document.getElementById('breathingModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

// Close modal on backdrop click
document.getElementById('breathingModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeBreathingModal();
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('breathingModal');
    if (!modal.classList.contains('hidden')) closeBreathingModal();
  }
});

const BREATHING_PHASES = [
  { name: 'breathe-in',  label: 'Breathe In...',   hint: '(Inhale slowly through nose)', duration: 4,  circleClass: 'expand' },
  { name: 'hold',        label: 'Hold...',          hint: '(Keep lungs full)',            duration: 7,  circleClass: 'hold'   },
  { name: 'breathe-out', label: 'Breathe Out...',   hint: '(Exhale slowly through mouth)', duration: 8, circleClass: ''      },
];
const TOTAL_CYCLES = 5;

function startBreathing() {
  if (breathingActive) return;
  breathingActive = true;

  document.getElementById('breathingStartBtn').style.display = 'none';
  document.getElementById('breathingStopBtn').style.display = 'inline-flex';

  let cycle = 0;
  let phaseIndex = 0;
  let secondsLeft = BREATHING_PHASES[0].duration;

  updateBreathingUI(phaseIndex, secondsLeft, cycle);

  breathingTimer = setInterval(() => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      phaseIndex++;
      if (phaseIndex >= BREATHING_PHASES.length) {
        phaseIndex = 0;
        cycle++;
        if (cycle >= TOTAL_CYCLES) {
          stopBreathing(true);
          return;
        }
      }
      secondsLeft = BREATHING_PHASES[phaseIndex].duration;
    }

    updateBreathingUI(phaseIndex, secondsLeft, cycle);
  }, 1000);
}

function updateBreathingUI(phaseIndex, secondsLeft, cycle) {
  const phase = BREATHING_PHASES[phaseIndex];
  const circle = document.getElementById('breathingCircle');
  const countEl = document.getElementById('breathingCount');
  const instrEl = document.getElementById('breathingInstruction');
  const phaseEl = document.getElementById('breathingPhase');
  const cycleEl = document.getElementById('breathingCycleCount');

  circle.className = `breathing-circle${phase.circleClass ? ' ' + phase.circleClass : ''}`;
  countEl.textContent = secondsLeft;
  instrEl.textContent = phase.label;
  phaseEl.textContent = phase.hint;
  cycleEl.textContent = `Cycle: ${cycle + 1} / ${TOTAL_CYCLES}`;
}

function stopBreathing(completed = false) {
  if (breathingTimer) {
    clearInterval(breathingTimer);
    breathingTimer = null;
  }
  breathingActive = false;

  const circle = document.getElementById('breathingCircle');
  const countEl = document.getElementById('breathingCount');
  const instrEl = document.getElementById('breathingInstruction');
  const phaseEl = document.getElementById('breathingPhase');
  const cycleEl = document.getElementById('breathingCycleCount');

  if (circle) circle.className = 'breathing-circle';
  if (countEl) countEl.textContent = '';
  if (instrEl) instrEl.textContent = completed ? '✅ Session complete! Well done.' : 'Press Start to begin';
  if (phaseEl) phaseEl.textContent = '';
  if (cycleEl) cycleEl.textContent = `Cycle: 0 / ${TOTAL_CYCLES}`;

  const startBtn = document.getElementById('breathingStartBtn');
  const stopBtn = document.getElementById('breathingStopBtn');
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
}

/* ================================================================
   11. Clear All Data
================================================================ */

function clearAll() {
  if (!confirm('Are you sure you want to clear all chat messages and mood entries? This cannot be undone.')) return;
  localStorage.removeItem('safespace_messages');
  localStorage.removeItem('safespace_moods');

  // Reset chat UI
  const area = document.getElementById('messagesArea');
  area.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon" aria-hidden="true">🧠</div>
      <h2>Welcome to SafeSpace</h2>
      <p>I'm here to listen and support you. Feel free to share what's on your mind.</p>
      <p class="welcome-hint">You can also log your mood using the buttons above.</p>
    </div>`;
  lastRenderedDate = null;

  // Reset dashboard UI
  selectedMoodKey = null;
  document.querySelectorAll('.mood-select-btn').forEach(b => b.classList.remove('selected'));
  const logBtn = document.getElementById('logMoodBtn');
  if (logBtn) logBtn.disabled = true;
  renderMoodDashboard();

  closeSidebar();
}

/* ================================================================
   12. Init
================================================================ */

function init() {
  // Apply saved theme
  applyTheme(getStoredTheme());

  // Load persisted chat history
  loadChatHistory();

  // Breathing modal starts hidden
  const modal = document.getElementById('breathingModal');
  if (modal && !modal.classList.contains('hidden')) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

document.addEventListener('DOMContentLoaded', init);
