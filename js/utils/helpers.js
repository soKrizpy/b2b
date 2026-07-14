// =========================================
// // ICON HELPERS
// =========================================
function icon(name, className = "icon-sm") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

let _refreshIconsTimer = null;
function refreshIcons() {
  if (!window.lucide) return;
  clearTimeout(_refreshIconsTimer);
  _refreshIconsTimer = setTimeout(() => {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.8,
      },
    });
  }, 10);
}

function setThemeIcons() {
  const isLight = document.body.classList.contains("light-mode");
  document.querySelectorAll("#themeIcon").forEach((el) => {
    el.innerHTML = icon(isLight ? "sun" : "moon");
  });
  refreshIcons();
}

// =========================================
// // 1. TOAST NOTIFICATION
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
  toastEl.innerHTML = `<span>${message}</span><div class="toast-progress"></div>`;
  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => toastEl.remove(), 300);
  }, 3000);
}

// =========================================
// // 2. MODAL & THEME FUNCTIONS
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
// // 5. UTILITIES
// =========================================

// Single HTML escaping function ΓÇö used everywhere
// Uses DOM textContent which inherently produces correct HTML entities.
// This approach avoids formatter-mangling issues with entity codes.
function escHtml(str) {
  var d = document.createElement("div");
  d.textContent = str ?? "";
  // Replace innerHTML to get fully escaped output
  return d.innerHTML;
}

// Compatibility alias ΓÇö admin.js calls esc() in many places
var esc = escHtml;

// =========================================
// // TIMEZONE SYSTEM
// =========================================
const TIMEZONE_OPTIONS = [
  { label: "WIB (GMT+7)",     tz: "Asia/Jakarta" },
  { label: "WITA (GMT+8)",    tz: "Asia/Makassar" },
  { label: "WIT (GMT+9)",     tz: "Asia/Jayapura" },
  { label: "SGT (GMT+8)",     tz: "Asia/Singapore" },
  { label: "MYT (GMT+8)",     tz: "Asia/Kuala_Lumpur" },
  { label: "ICT (GMT+7)",     tz: "Asia/Bangkok" },
  { label: "PHT (GMT+8)",     tz: "Asia/Manila" },
  { label: "JST (GMT+9)",     tz: "Asia/Tokyo" },
  { label: "IST (GMT+5:30)",  tz: "Asia/Kolkata" },
  { label: "GST (GMT+4)",     tz: "Asia/Dubai" },
  { label: "UTC (GMT+0)",     tz: "UTC" },
  { label: "CET (GMT+1)",     tz: "Europe/Paris" },
  { label: "EST (GMT-5)",     tz: "America/New_York" },
  { label: "CST (GMT-6)",     tz: "America/Chicago" },
  { label: "MST (GMT-7)",     tz: "America/Denver" },
  { label: "PST (GMT-8)",     tz: "America/Los_Angeles" },
  { label: "AEST (GMT+10)",   tz: "Australia/Sydney" },
];

function getAutoTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getUserTimezone() {
  return localStorage.getItem("userTimezone") || getAutoTimezone();
}

function setUserTimezone(tz) {
  localStorage.setItem("userTimezone", tz);
  // Re-render all date displays
  document.dispatchEvent(new CustomEvent("timezone-changed", { detail: { tz } }));
}

function getTimezoneLabel(tz) {
  const match = TIMEZONE_OPTIONS.find(o => o.tz === tz);
  if (match) return match.label;
  // Fallback: show offset
  try {
    const offset = new Date().toLocaleString("en", { timeZone: tz, timeZoneName: "short" }).split(" ").pop();
    return `${offset}`;
  } catch { return tz; }
}

function renderTimezoneWidget(buttonId = "tzBtn") {
  const currentTz = getUserTimezone();
  const label = getTimezoneLabel(currentTz);
  return `
    <div class="tz-widget" style="position:relative;">
      <button id="${buttonId}" onclick="toggleTzDropdown('${buttonId}')" class="btn glass px-3 py-2 rounded-lg text-sm flex items-center gap-2" title="Timezone">
        ${icon("globe")} <span id="${buttonId}Label"><span class="tz-full">${label}</span><span class="tz-short">${label.match(/GMT[^)]+/) ? label.match(/GMT[^)]+/)[0] : label}</span></span>
      </button>
      <div id="${buttonId}Dropdown" class="tz-dropdown hidden" style="position:absolute;right:0;top:110%;z-index:9999;min-width:200px;max-height:280px;overflow-y:auto;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);backdrop-filter:blur(16px);">
        ${TIMEZONE_OPTIONS.map(o => `
          <button onclick="selectTimezone('${o.tz}','${buttonId}')" class="tz-option w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${currentTz === o.tz ? 'text-primary font-bold' : 'text-secondary'}" style="background:none;border:none;cursor:pointer;display:block;">
            ${o.label}
          </button>`).join("")}
      </div>
    </div>`;
}

function toggleTzDropdown(buttonId) {
  const dd = document.getElementById(`${buttonId}Dropdown`);
  if (dd) dd.classList.toggle("hidden");
}

function selectTimezone(tz, buttonId) {
  setUserTimezone(tz);
  const label = getTimezoneLabel(tz);
  const lblEl = document.getElementById(`${buttonId}Label`);
  if (lblEl) lblEl.textContent = label;
  toggleTzDropdown(buttonId);
  // Refresh icons for the globe icon
  refreshIcons();
}

// Close tz dropdown on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".tz-widget")) {
    document.querySelectorAll(".tz-dropdown").forEach(d => d.classList.add("hidden"));
  }
}, true);

const formatDate = {
  toIndonesian: (dateStr) => {
    if (!dateStr) return "-";
    const tz = getUserTimezone();
    return new Date(dateStr).toLocaleString("id-ID", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  },
  toDateTimeLocal: (dateStr) => {
    if (!dateStr) return "";
    const tz = getUserTimezone();
    const d = new Date(dateStr);
    // Format as YYYY-MM-DDTHH:mm in the user's timezone
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find(p => p.type === type)?.value || "00";
    const hh = get("hour") === "24" ? "00" : get("hour");
    return `${get("year")}-${get("month")}-${get("day")}T${hh}:${get("minute")}`;
  },
  isToday: (dateStr) => {
    if (!dateStr) return false;
    const tz = getUserTimezone();
    const opts = { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" };
    return new Intl.DateTimeFormat("en-CA", opts).format(new Date(dateStr)) ===
           new Intl.DateTimeFormat("en-CA", opts).format(new Date());
  },
  isPast: (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  },
  relative: (dateStr) => {
    if (!dateStr) return "-";
    const diff = new Date(dateStr) - new Date();
    const mins = Math.round(diff / 60000);
    if (mins < 0) return `${Math.abs(mins)} menit yang lalu`;
    if (mins < 60) return `${mins} menit lagi`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours} jam ${rem} menit lagi`;
  },
};

const validators = {
  mpin: (v) => /^\d{6}$/.test(v),
  required: (v) => v && v.trim().length > 0,
  phone: (v) => /^(08|628)\d{8,12}$/.test(v),
  url: (v) => {
    if (!v) return true; // optional
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
};

// =========================================
// // INITIALIZATION
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
