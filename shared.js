// =========================================
// KONFIGURASI SUPABASE
// =========================================
const SUPABASE_URL = "https://lxrwkbobosdmaqrmlvpd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JvZsmYEd3RsMmdMRLcnvpg_ho7aUpBL";

// ✅ PERBAIKAN: Gunakan SUPABASE_ANON_KEY
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================
// GLOBAL STATE
// =========================================
let currentUser = null;

// =========================================
// ICON HELPERS
// =========================================
function icon(name, className = "icon-sm") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}


function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
      ? parsed.href
      : "";
  } catch (_) {
    return "";
  }
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.8,
      },
    });
  }
}

function setThemeIcons() {
  const isLight = document.body.classList.contains("light-mode");
  document.querySelectorAll("#themeIcon").forEach((el) => {
    el.innerHTML = icon(isLight ? "sun" : "moon");
  });
  refreshIcons();
}

// =========================================
// 1. TOAST NOTIFICATION
// =========================================
function toast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast ${type}`;
  toastEl.innerHTML = `<span>${message}</span>`;
  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => toastEl.remove(), 300);
  }, 3000);
}

// =========================================
// 2. MODAL & THEME FUNCTIONS
// =========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }
  setThemeIcons();
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  setThemeIcons();
}

// =========================================
// 3. API HANDLER
// =========================================
const apiHandler = {
  async handle(query, onSuccess = null, onError = null) {
    try {
      const { data, error } = await query;
      if (error) throw error;
      if (onSuccess) onSuccess(data);
      return data;
    } catch (err) {
      console.error("SUPABASE ERROR:", err);
      toast(err.message || "Terjadi kesalahan", "error");
      if (onError) onError(err);
      return null;
    }
  },
};

// =========================================
// 4. AUTH HELPERS
// =========================================
async function initUser() {
  try {
    const { data } = await sbClient.auth.getUser();
    if (!data.user) return null;
    currentUser = data.user;
    return currentUser;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

// =========================================
// 5. UTILITIES
// =========================================
const formatDate = {
  toIndonesian: (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
  toDateTimeLocal: (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().slice(0, 16);
  },
};

const validators = {
  mpin: (v) => /^\d{6}$/.test(v),
  required: (v) => v && v.trim().length > 0,
  phone: (v) => /^(08|628)\d{8,12}$/.test(v),
};

// =========================================
// 6. CUSTOM CONFIRM DIALOG
// =========================================
async function showConfirm(title, message, type = "warning") {
  return new Promise((resolve) => {
    const old = document.querySelector(".custom-confirm-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";
    overlay.innerHTML = `
      <div class="custom-confirm-box">
        <div class="custom-confirm-icon">${icon(type === "danger" ? "trash-2" : "triangle-alert", "icon-lg")}</div>
        <div class="custom-confirm-title">${title}</div>
        <div class="custom-confirm-message">${message}</div>
        <div class="custom-confirm-actions">
          <button class="btn btn-primary" id="confirmYes">Ya</button>
          <button class="btn btn-danger" id="confirmNo">Batal</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    refreshIcons();
    setTimeout(() => overlay.classList.add("active"), 10);

    const close = (res) => {
      overlay.classList.remove("active");
      setTimeout(() => overlay.remove(), 200);
      resolve(res);
    };

    document.getElementById("confirmYes").onclick = () => close(true);
    document.getElementById("confirmNo").onclick = () => close(false);
  });
}

// =========================================
// INITIALIZATION
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  refreshIcons();

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.classList.remove("active");
    }
    if (
      !e.target.closest(".notification-panel") &&
      !e.target.closest('button[onclick*="toggleNotifPanel"]')
    ) {
      document
        .querySelectorAll(".notification-panel")
        .forEach((p) => p.classList.remove("active"));
    }
  });
});
