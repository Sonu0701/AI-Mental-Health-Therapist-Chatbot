/* ============================================================
   SafeSpace – AI Mental Health Therapist
   script.js
   ============================================================ */

// Change this to match your backend URL if it differs from the default.
const BACKEND_URL = window.SAFESPACE_API_URL || "http://localhost:8000/ask";
const STORAGE_KEY  = "safespace_chat_history";

/* ---------- DOM References ---------- */
const chatContainer = document.getElementById("chatContainer");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const clearBtn      = document.getElementById("clearChat");
const themeToggle   = document.getElementById("themeToggle");
const themeIcon     = document.getElementById("themeIcon");
const menuBtn       = document.getElementById("menuBtn");
const sidebar       = document.getElementById("sidebar");
const sidebarClose  = document.getElementById("sidebarClose");
const overlay       = document.getElementById("overlay");

/* ---------- State ---------- */
let isLoading = false;

/* ============================================================
   Theme Management
   ============================================================ */
function applyTheme(dark) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  themeIcon.textContent = dark ? "☀️" : "🌙";
  themeToggle.innerHTML = `<span id="themeIcon">${dark ? "☀️" : "🌙"}</span> ${dark ? "Light" : "Dark"} Mode`;
  localStorage.setItem("safespace_theme", dark ? "dark" : "light");
}

function initTheme() {
  const saved = localStorage.getItem("safespace_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ? saved === "dark" : prefersDark);
}

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(!isDark);
});

/* ============================================================
   Sidebar (Mobile)
   ============================================================ */
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("visible");
  document.body.style.overflow = "";
}

menuBtn.addEventListener("click", openSidebar);
sidebarClose.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

/* ============================================================
   Utility – Helpers
   ============================================================ */
function escapeHTML(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
}

/* ============================================================
   Toast Notification
   ============================================================ */
let toastEl = null;
let toastTimer = null;

function showToast(message, duration = 3500) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

/* ============================================================
   Welcome Screen
   ============================================================ */
const SUGGESTIONS = [
  "I'm feeling anxious today",
  "Help me manage stress",
  "I can't stop overthinking",
  "Find therapists near me",
  "I need someone to talk to",
];

function renderWelcome() {
  const card = document.createElement("div");
  card.className = "welcome-card";
  card.id = "welcomeCard";
  card.innerHTML = `
    <div class="welcome-emoji">🧠</div>
    <h1>Welcome to SafeSpace</h1>
    <p>A safe, confidential space for you to share your thoughts and feelings.
       I'm here to listen and support you on your journey.</p>
    <div class="suggestion-chips" role="list">
      ${SUGGESTIONS.map(s => `<button class="chip" role="listitem" tabindex="0">${escapeHTML(s)}</button>`).join("")}
    </div>
  `;
  chatContainer.appendChild(card);

  // Click on suggestion chips
  card.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      userInput.value = chip.textContent;
      userInput.focus();
      adjustTextarea();
    });
  });
}

function removeWelcome() {
  const card = document.getElementById("welcomeCard");
  if (card) card.remove();
}

/* ============================================================
   Render a Single Message
   ============================================================ */
function createMessageEl(role, text, toolCalled, timestamp) {
  const isUser = role === "user";
  const row = document.createElement("div");
  row.className = `message-row ${isUser ? "user" : "bot"}`;
  row.setAttribute("role", "article");

  const avatarHTML = isUser
    ? `<div class="avatar user-avatar" aria-hidden="true">You</div>`
    : `<div class="avatar bot-avatar" aria-hidden="true">🧠</div>`;

  const toolBadge = !isUser && toolCalled && toolCalled !== "None"
    ? `<span class="tool-badge" title="Tool used by AI">⚙ ${escapeHTML(toolCalled)}</span>`
    : "";

  const timeStr = formatTime(timestamp ? new Date(timestamp) : new Date());

  row.innerHTML = `
    ${isUser ? "" : avatarHTML}
    <div class="message-bubble-wrap">
      <div class="message-bubble">${escapeHTML(text)}</div>
      ${toolBadge}
      <span class="message-time">${escapeHTML(timeStr)}</span>
    </div>
    ${isUser ? avatarHTML : ""}
  `;

  return row;
}

/* ============================================================
   Loading Indicator
   ============================================================ */
let loadingEl = null;

function showLoading() {
  removeLoading();
  loadingEl = document.createElement("div");
  loadingEl.className = "loading-row";
  loadingEl.innerHTML = `
    <div class="avatar bot-avatar" aria-hidden="true">🧠</div>
    <div class="loading-bubble" aria-label="AI is thinking">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  chatContainer.appendChild(loadingEl);
  scrollToBottom();
}

function removeLoading() {
  if (loadingEl) {
    loadingEl.remove();
    loadingEl = null;
  }
}

/* ============================================================
   Chat History (localStorage)
   ============================================================ */
function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("SafeSpace: could not save chat history to localStorage.", e);
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("SafeSpace: could not load chat history from localStorage.", e);
    return [];
  }
}

function restoreHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    renderWelcome();
    return;
  }
  history.forEach(msg => {
    const el = createMessageEl(msg.role, msg.text, msg.toolCalled, msg.timestamp);
    chatContainer.appendChild(el);
  });
  scrollToBottom();
}

/* ============================================================
   Send Message
   ============================================================ */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  userInput.disabled = true;
  userInput.value = "";
  adjustTextarea();

  // Remove welcome if present
  removeWelcome();

  const now = new Date();

  // Add user message to UI
  const userEl = createMessageEl("user", text, null, now);
  chatContainer.appendChild(userEl);
  scrollToBottom();

  // Persist user message
  const history = loadHistory();
  history.push({ role: "user", text, toolCalled: null, timestamp: now.toISOString() });
  saveHistory(history);

  // Show loading
  showLoading();

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const aiReply    = data.response   || "I'm here for you. Could you tell me more?";
    const toolCalled = data.tool_called || "None";

    removeLoading();

    const aiEl = createMessageEl("assistant", aiReply, toolCalled, new Date());
    chatContainer.appendChild(aiEl);
    scrollToBottom();

    // Persist AI message
    history.push({
      role: "assistant",
      text: aiReply,
      toolCalled,
      timestamp: new Date().toISOString(),
    });
    saveHistory(history);

  } catch (err) {
    removeLoading();
    const errMsg = "I'm having trouble connecting right now. Please make sure the backend is running and try again.";
    const errEl = createMessageEl("assistant", errMsg, null, new Date());
    chatContainer.appendChild(errEl);
    scrollToBottom();
    showToast("⚠️ Could not connect to the service. Please try again later.");
    console.error("SafeSpace API error:", err);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

/* ============================================================
   Clear Chat
   ============================================================ */
clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all chat history? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  chatContainer.innerHTML = "";
  renderWelcome();
  showToast("Chat history cleared.");
  closeSidebar();
});

/* ============================================================
   Auto-resize Textarea
   ============================================================ */
function adjustTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
}

userInput.addEventListener("input", adjustTextarea);

/* ---------- Send on Enter (Shift+Enter = newline) ---------- */
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

/* ============================================================
   Initialise
   ============================================================ */
initTheme();
restoreHistory();
userInput.focus();
