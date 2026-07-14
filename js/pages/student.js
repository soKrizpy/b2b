// =========================================
// GLOBAL STATE
// =========================================
let currentProfile = null;
let nextScheduleData = null;
let upcomingSchedules = [];
let allSchedulesForSidebar = []; // all statuses — used by calendar + package widget
let calViewDate = new Date();    // which month the mini calendar is showing
let refreshInterval = null;
let hasCompletedSession = false; // gate for Materi tab

// =========================================
// TAB SWITCHING
// =========================================
function switchStudentTab(tabName) {
  // Gate: Materi tab requires at least one completed session
  if (tabName === "materials" && !hasCompletedSession) {
    toast(
      "Selesaikan minimal 1 pertemuan dengan guru untuk membuka Materi 📚",
      "error",
    );
    tabName = "home"; // fall back to home
  }

  // Yield to browser first so the click is registered visually,
  // then do the heavier DOM updates.
  requestAnimationFrame(async () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.tab === tabName),
      );
    document
      .querySelectorAll(".tab-panel")
      .forEach((panel) =>
        panel.classList.toggle("active", panel.id === `tab-${tabName}`),
      );
      
    // LAZY LOAD DATA based on tab
    if (tabName === "materials" && hasCompletedSession) {
      await loadLearningPath();
    } else if (tabName === "history") {
      await loadHistory();
    } else if (tabName === "requests") {
      await loadRequests();
    }
  });
}

// =========================================
// MATERIALS ACCESS GATE
// =========================================
async function checkMaterialsAccess() {
  const { data, error } = await sbClient
    .from("schedules")
    .select("id")
    .eq("student_id", currentProfile.id)
    .eq("status", "completed")
    .limit(1);

  hasCompletedSession = !error && Array.isArray(data) && data.length > 0;
  updateMaterialsTabUI();
}

function updateMaterialsTabUI() {
  const materialsBtn = document.querySelector('.tab-btn[data-tab="materials"]');
  const lockedPlaceholder = document.getElementById(
    "materialsLockedPlaceholder",
  );
  const materialsContent = document.getElementById("materialsContent");

  if (hasCompletedSession) {
    // Unlocked — show content, hide lock screen
    if (materialsBtn) {
      materialsBtn.classList.remove("tab-locked");
      materialsBtn.title = "";
    }
    if (lockedPlaceholder) lockedPlaceholder.hidden = true;
    if (materialsContent) materialsContent.hidden = false;
  } else {
    // Locked — show lock screen, hide content
    if (materialsBtn) {
      materialsBtn.classList.add("tab-locked");
      materialsBtn.title =
        "Selesaikan minimal 1 pertemuan untuk membuka Materi";
    }
    if (lockedPlaceholder) lockedPlaceholder.hidden = false;
    if (materialsContent) materialsContent.hidden = true;
    // If currently on materials tab, kick back to home
    const activePanel = document.querySelector(".tab-panel.active");
    if (activePanel && activePanel.id === "tab-materials") {
      switchStudentTab("home");
    }
  }
}

async function checkAuth() {
  const user = await initUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error } = await sbClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    toast("Gagal memuat profil: " + error.message, "error");
    return;
  }

  if (!profile) {
    toast("Profile tidak ditemukan!", "error");
    return;
  }

  currentProfile = profile;

  if (profile.role !== "student") {
    window.location.href = "admin.html";
    return;
  }

  // Tampilkan nama siswa
  const nameEl = document.getElementById("studentName");
  if (nameEl) nameEl.textContent = `Halo, ${profile.full_name}!`;

  // Load essential data
  await Promise.all([
    loadUpcomingSchedules(),
    loadSidebarData(),
    loadNotifications("student")
  ]);

  // Check completed sessions FIRST
  await checkMaterialsAccess();
  
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab || "home";
  if (activeTab === "materials" && hasCompletedSession) {
    await loadLearningPath();
  } else if (activeTab === "history") {
    await loadHistory();
  } else if (activeTab === "requests") {
    await loadRequests();
  }

  // Auto-refresh setiap 30 detik (safe recursive setTimeout)
  const refreshData = async () => {
    try {
      await Promise.all([
        loadUpcomingSchedules(),
        loadSidebarData(),
        loadNotifications("student")
      ]);
      await checkMaterialsAccess();
      updateJoinButton();
      
      // Update active tab data if needed
      const currentTab = document.querySelector(".tab-btn.active")?.dataset.tab;
      if (currentTab === "history") loadHistory();
      if (currentTab === "requests") loadRequests();
      if (currentTab === "materials" && hasCompletedSession) loadLearningPath();
    } finally {
      refreshInterval = setTimeout(refreshData, 30000);
    }
  };
  refreshInterval = setTimeout(refreshData, 30000);
  // Mount timezone widget
  const tzEl = document.getElementById("studentTzWidget");
  if (tzEl) {
    tzEl.innerHTML = renderTimezoneWidget("studentTzBtn");
    refreshIcons();
  }
}

// Re-render date-dependent views when timezone changes
document.addEventListener("timezone-changed", () => {
  if (typeof renderNextSchedule === "function") renderNextSchedule();
  if (typeof renderCalendarMini === "function") renderCalendarMini();
  if (typeof renderUpcomingList === "function") renderUpcomingList();
  if (typeof renderHistory === "function") renderHistory();
  refreshIcons();
});

document.addEventListener("DOMContentLoaded", checkAuth);

// =========================================
// LOGOUT
// =========================================
async function logout() {
  const confirmed = await showConfirm(
    "Logout",
    "Apakah Anda yakin ingin keluar?",
    "warning",
  );
  if (!confirmed) return;

  if (refreshInterval) clearTimeout(refreshInterval);
  await sbClient.auth.signOut();
  toast("Berhasil logout", "success");
  window.location.href = "index.html";
}

// =========================================
// UPCOMING SCHEDULES WITH DYNAMIC BUTTONS
// =========================================

// How many minutes after start until "Terlambat" kicks in
const LATE_THRESHOLD_MIN   = 20;
// How many hours after start until the card moves to Riwayat
const ARCHIVE_THRESHOLD_HR = 5;

async function loadUpcomingSchedules() {
  const archiveCutoff = new Date(
    Date.now() - ARCHIVE_THRESHOLD_HR * 60 * 60 * 1000,
  ).toISOString();

  // Fetch upcoming schedules whose start_time is still within the archive window
  // (i.e. not yet 5 hours in the past) so we can still show them until they age out.
  const { data: schedules, error } = await sbClient
    .from("schedules")
    .select("*")
    .eq("student_id", currentProfile.id)
    .eq("status", "upcoming")
    .gte("start_time", archiveCutoff)          // ignore anything older than 5 h
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) {
    console.error("Error loading schedules:", error);
    return;
  }

  const now = new Date();

  // Split into cards-that-should-be-archived vs visible
  const toArchive = (schedules || []).filter((s) => {
    const minutesSinceStart = (now - new Date(s.start_time)) / (1000 * 60);
    return minutesSinceStart >= ARCHIVE_THRESHOLD_HR * 60;
  });

  // Auto-mark archived schedules as "completed" in DB (silently)
  for (const s of toArchive) {
    sbClient
      .from("schedules")
      .update({ status: "completed", attendance_status: "missed" })
      .eq("id", s.id)
      .then(({ error: err }) => {
        if (err) console.error("Auto-archive error:", err);
      });
  }

  // Only show cards that have NOT been archived yet
  upcomingSchedules = (schedules || []).filter((s) => {
    const minutesSinceStart = (now - new Date(s.start_time)) / (1000 * 60);
    return minutesSinceStart < ARCHIVE_THRESHOLD_HR * 60;
  });

  nextScheduleData = upcomingSchedules[0] || null;
  renderUpcomingSchedules();

  // Reload history so freshly archived items appear there immediately
  if (toArchive.length > 0) {
    loadHistory();
  }
}

// Backward-compatible name for any old inline/debug references.
const loadNextSchedule = loadUpcomingSchedules;

function renderUpcomingSchedules() {
  const container = document.getElementById("nextSchedule");
  if (!container) return;

  if (!upcomingSchedules.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon"></div>
        <h3>Tidak ada jadwal mendatang</h3>
        <p>Anda akan melihat jadwal di sini setelah guru menambahkannya</p>
        <button onclick="openRescheduleRequest()" class="btn btn-primary px-4 py-3 rounded-lg font-semibold mt-4">
          Request jadwal
        </button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="schedule-card-grid">
      ${upcomingSchedules
        .map((schedule, index) => renderScheduleOverviewCard(schedule, index))
        .join("")}
    </div>`;

  updateJoinButton();
}

const renderNextSchedule = renderUpcomingSchedules;

function renderScheduleOverviewCard(schedule, index) {
  const dateStr = formatDate.toIndonesian(schedule.start_time);
  const relativeTime = formatDate.relative(schedule.start_time);

  return `
    <div class="glass card-hover p-6 student-schedule-card" id="scheduleCard-${schedule.id}">
      <div>
        <div class="schedule-card-topline">
          <span>${index === 0 ? "Jadwal terdekat" : `Jadwal ${index + 1}`}</span>
          <span>${escHtml(relativeTime)}</span>
        </div>
        <h3 class="text-2xl font-bold text-primary mb-2">${escHtml(schedule.title)}</h3>
        <p class="text-secondary mb-4">${dateStr}</p>
      </div>
      <div class="schedule-card-actions">
        <div id="joinButtonContainer-${schedule.id}"></div>
        <button onclick="openRescheduleRequest('${schedule.id}')" class="btn glass px-4 py-3 rounded-lg font-semibold w-full">
          Request reschedule
        </button>
      </div>
    </div>`;
}

function updateJoinButton() {
  const now = new Date();

  upcomingSchedules.forEach((schedule) => {
    const container = document.getElementById(`joinButtonContainer-${schedule.id}`);
    if (!container) return;

    const scheduleTime      = new Date(schedule.start_time);
    const minutesUntilStart = (scheduleTime - now) / (1000 * 60);
    const minutesSinceStart = -minutesUntilStart;

    let html = "";

    if (minutesUntilStart > 10) {
      // --- NOT YET: show countdown ---
      const totalMin = Math.ceil(minutesUntilStart - 10); // minutes until the button activates
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const timeLeft = h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
      html = `
        <button disabled class="btn btn-disabled px-4 py-3 rounded-lg font-bold w-full">
          Belum waktunya<br>
          <span class="text-sm font-normal opacity-75">Aktif dalam ${timeLeft}</span>
        </button>`;

    } else if (minutesSinceStart < LATE_THRESHOLD_MIN) {
      // --- ACTIVE: within join window (−10 min → +20 min) ---
      const statusText =
        minutesUntilStart > 0
          ? `Mulai dalam ${Math.ceil(minutesUntilStart)} menit`
          : "Kelas sedang berlangsung";
      html = `
        <button onclick="joinMeetingById('${schedule.id}')"
          class="btn btn-success px-4 py-3 rounded-lg font-bold w-full join-btn-active">
          Masuk Kelas<br>
          <span class="text-sm font-normal opacity-90">${statusText}</span>
        </button>`;

    } else if (minutesSinceStart < ARCHIVE_THRESHOLD_HR * 60) {
      // --- LATE: after 20 min, before 5-hour archive cutoff ---
      html = `
        <button disabled class="btn btn-late px-4 py-3 rounded-lg font-bold w-full">
          Terlambat<br>
          <span class="text-sm font-normal opacity-75">Waktu bergabung telah habis</span>
        </button>`;

    } else {
      // --- ARCHIVED: 5 hours passed — this branch rarely renders because
      //     loadUpcomingSchedules already filters these out, but kept as safety net ---
      html = `
        <button disabled class="btn btn-disabled px-4 py-3 rounded-lg font-bold w-full">
          Kelas selesai
        </button>`;
    }

    container.innerHTML = html;
  });
}

function joinMeeting(link) {
  if (!link) {
    toast("Link meeting belum tersedia", "error");
    return;
  }
  window.open(link, "_blank");
  toast("Membuka link meeting...", "success");
}

async function joinMeetingById(scheduleId) {
  const schedule = upcomingSchedules.find(
    (item) => String(item.id) === String(scheduleId),
  );
  if (!schedule) return;

  // Open the meeting link first so the student isn't kept waiting
  joinMeeting(schedule.meeting_link || "");

  // Mark the session as completed + attended in the DB
  const { error } = await sbClient
    .from("schedules")
    .update({ status: "completed", attendance_status: "attended" })
    .eq("id", scheduleId);

  if (error) {
    console.error("Failed to mark attendance:", error);
    // Non-fatal — the student is already in the meeting
  } else {
    // Remove the completed card from the local list and re-render so
    // the next schedule slides into position
    upcomingSchedules = upcomingSchedules.filter(
      (s) => String(s.id) !== String(scheduleId),
    );
    nextScheduleData = upcomingSchedules[0] || null;
    renderUpcomingSchedules();

    // NEW LOGIC: Unlock the next topic
    await unlockNextTopic();

    // Refresh sidebar stats and history
    loadSidebarData();
    const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
    if (activeTab === "history") {
      loadHistory();
    }
    checkMaterialsAccess();
  }
}

async function unlockNextTopic() {
  if (!currentProfile) return;
  // 1. Get student enrollments
  const { data: enrollments, error } = await sbClient
    .from("module_enrollments")
    .select('id, topic_progress(id, is_unlocked, is_completed, topics(order_index))')
    .eq("student_id", currentProfile.id)
    .eq("status", "enrolled");

  if (error || !enrollments || enrollments.length === 0) return;

  // 2. Unlock the first locked topic in the active enrollment
  for (const enrollment of enrollments) {
    let progress = enrollment.topic_progress || [];
    // Sort by topic order_index safely
    progress.sort((a, b) => (a.topics?.order_index || 0) - (b.topics?.order_index || 0));

    // Find the first locked topic
    const lockedTopic = progress.find(tp => !tp.is_unlocked);
    if (lockedTopic) {
      const { error: updateErr } = await sbClient
        .from("topic_progress")
        .update({ is_unlocked: true, unlocked_at: new Date().toISOString() })
        .eq("id", lockedTopic.id);
        
      if (!updateErr) {
        toast("Topik baru telah terbuka!", "success");
      }
      break; // Only unlock one topic per attendance
    }
  }
}

// escHtml and esc are provided by shared.js

// =========================================
// SIDEBAR — load all schedules once
// =========================================
async function loadSidebarData() {
  const { data, error } = await sbClient
    .from("schedules")
    .select("id, title, start_time, status")
    .eq("student_id", currentProfile.id)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading sidebar data:", error);
    return;
  }

  allSchedulesForSidebar = data || [];
  renderMiniCalendar();
  renderPackageProgress();
}

// =========================================
// MINI CALENDAR
// =========================================
function calNav(delta) {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + delta, 1);
  renderMiniCalendar();
}

function renderMiniCalendar() {
  const label = document.getElementById("calMonthLabel");
  const cal = document.getElementById("miniCal");
  if (!cal) return;

  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();

  if (label) {
    label.textContent = calViewDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }

  // Build a set of dates that have sessions, keyed by "YYYY-MM-DD" → status
  const sessionMap = {};
  allSchedulesForSidebar.forEach((s) => {
    const d = new Date(s.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      // Priority: upcoming > completed > cancelled
      if (!sessionMap[key] || s.status === "upcoming") {
        sessionMap[key] = s.status;
      }
    }
  });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-start (0=Mon … 6=Sun)
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  let html = `<div class="mini-cal-grid">`;

  // Day headers
  dayNames.forEach((d) => {
    html += `<div class="mini-cal-hdr">${d}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="mini-cal-day empty"></div>`;
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const status = sessionMap[key];
    const isToday = key === todayKey;

    let dotHtml = "";
    if (status === "upcoming") {
      dotHtml = `<span class="cal-dot cal-dot-upcoming"></span>`;
    } else if (status === "completed") {
      dotHtml = `<span class="cal-dot cal-dot-completed"></span>`;
    } else if (status === "cancelled") {
      dotHtml = `<span class="cal-dot cal-dot-cancelled"></span>`;
    }

    html += `
      <div class="mini-cal-day${isToday ? " cal-today" : ""}${status ? " has-session" : ""}">
        <span class="cal-num">${d}</span>
        ${dotHtml}
      </div>`;
  }

  html += `</div>`;

  // Legend
  html += `
    <div class="cal-legend">
      <span><span class="cal-dot cal-dot-upcoming"></span> Akan datang</span>
      <span><span class="cal-dot cal-dot-completed"></span> Selesai</span>
    </div>`;

  cal.innerHTML = html;
  refreshIcons();
}

// =========================================
// PACKAGE PROGRESS WIDGET
// =========================================
function renderPackageProgress() {
  const el = document.getElementById("packageProgress");
  if (!el) return;

  const total   = allSchedulesForSidebar.length;
  const completed = allSchedulesForSidebar.filter(s => s.status === "completed").length;
  const upcoming  = allSchedulesForSidebar.filter(s => s.status === "upcoming").length;
  const cancelled = allSchedulesForSidebar.filter(s => s.status === "cancelled").length;
  const remaining = Math.max(0, total - completed - cancelled);

  if (total === 0) {
    el.innerHTML = `
      <div class="empty-state pkg-loading">
        <p>Belum ada paket aktif</p>
      </div>`;
    return;
  }

  // Donut chart via SVG
  const size = 110;
  const r = 42;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  function arc(value, total, color, offset) {
    if (total === 0 || value === 0) return "";
    const pct = value / total;
    const dash = pct * circumference;
    const gap  = circumference - dash;
    return `<circle
      cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${color}" stroke-width="11"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      stroke-linecap="round"
      style="transition:stroke-dasharray 0.8s ease"/>`;
  }

  // Offsets: start from top (−90°)
  const startOffset = circumference * 0.25;
  const completedArc = (completed / total) * circumference;
  const upcomingArc  = (upcoming  / total) * circumference;

  const donut = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="pkg-donut">
      <!-- track -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--glass-border)" stroke-width="11"/>
      ${arc(completed, total, "var(--success)",  startOffset)}
      ${arc(upcoming,  total, "var(--accent-light)", startOffset + completedArc)}
      ${arc(cancelled, total, "var(--error)",    startOffset + completedArc + upcomingArc)}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text-primary)"
            font-size="20" font-weight="800" font-family="Inter,sans-serif">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-secondary)"
            font-size="9" font-family="Inter,sans-serif">TOTAL</text>
    </svg>`;

  el.innerHTML = `
    <div class="pkg-widget">
      <div class="pkg-stats">
        <div class="pkg-stat">
          <span class="pkg-dot" style="background:var(--success)"></span>
          <div>
            <div class="pkg-stat-num">${completed}</div>
            <div class="pkg-stat-lbl">Selesai</div>
          </div>
        </div>
        <div class="pkg-stat">
          <span class="pkg-dot" style="background:var(--accent-light)"></span>
          <div>
            <div class="pkg-stat-num">${upcoming}</div>
            <div class="pkg-stat-lbl">Akan datang</div>
          </div>
        </div>
        <div class="pkg-stat">
          <span class="pkg-dot" style="background:var(--glass-border-hover)"></span>
          <div>
            <div class="pkg-stat-num">${remaining}</div>
            <div class="pkg-stat-lbl">Sisa</div>
          </div>
        </div>
        <div class="pkg-stat">
          <span class="pkg-dot" style="background:var(--error)"></span>
          <div>
            <div class="pkg-stat-num">${cancelled}</div>
            <div class="pkg-stat-lbl">Dibatalkan</div>
          </div>
        </div>
      </div>
      <div class="pkg-donut-wrap">${donut}</div>
    </div>`;
}

// =========================================
// HISTORY
// =========================================
async function loadHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;

  const { data: schedules, error } = await sbClient
    .from("schedules")
    .select("*")
    .eq("student_id", currentProfile.id)
    .eq("status", "completed")
    .order("start_time", { ascending: false });

  if (error) {
    console.error("Error loading history:", error);
    return;
  }

  if (!schedules || schedules.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📚</div>
        <h3>Belum ada riwayat</h3>
        <p>Riwayat pertemuan akan muncul di sini</p>
      </div>`;
    return;
  }

  list.innerHTML = schedules
    .map(
      (s) => `
      <div class="glass p-4">
        <h3 class="font-bold text-primary">${escHtml(s.title)}</h3>
        <p class="text-secondary text-sm mt-1"> ${formatDate.toIndonesian(s.start_time)}</p>
      </div>`,
    )
    .join("");
}

// =========================================
// LEARNING PATH (New: module_enrollments)
// =========================================
async function loadLearningPath() {
  const list = document.getElementById("learningPathList");
  if (!list) return;

  const { data: enrollments, error } = await sbClient
    .from("module_enrollments")
    .select(`
      id, status, enrolled_at,
      modules(id, title, description),
      topic_progress(id, is_completed, topic_id)
    `)
    .eq("student_id", currentProfile.id);

  if (error) {
    console.error("Error loading learning path:", error);
    return;
  }

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  if (!enrollments || enrollments.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📖</div>
        <h3>Belum ada materi</h3>
        <p>Guru akan menambahkan materi untuk Anda</p>
      </div>`;
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "0% selesai";
    return;
  }

  // Overall progress = average across all enrolled modules
  const totalTopics = enrollments.length * 12;
  const completedTopics = enrollments.reduce(
    (sum, e) => sum + (e.topic_progress?.filter(tp => tp.is_completed).length || 0), 0
  );
  const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (progressFill) progressFill.style.width = `${pct}%`;
  if (progressText) progressText.textContent = `${pct}% selesai (${completedTopics}/${totalTopics} topik)`;

  list.innerHTML = enrollments.map(enrollment => {
    const doneCount = enrollment.topic_progress?.filter(tp => tp.is_completed).length || 0;
    const modPct = Math.round((doneCount / 12) * 100);
    const allDone = doneCount >= 12;

    return `
      <div class="glass p-4">
        <div class="flex justify-between items-start gap-3 flex-wrap">
          <div style="flex:1">
            <h3 class="font-bold text-primary">${escHtml(enrollment.modules?.title || 'Modul')}</h3>
            ${enrollment.modules?.description ? `<p class="text-secondary text-sm mt-1">${escHtml(enrollment.modules.description)}</p>` : ''}
            <div class="flex items-center gap-2 mt-2">
              <div style="flex:1;height:6px;background:var(--glass-border,#333);border-radius:3px;overflow:hidden">
                <div style="width:${modPct}%;height:100%;background:var(--accent,#6366f1);border-radius:3px;transition:width 0.5s ease"></div>
              </div>
              <span class="text-secondary text-xs">${doneCount}/12 topik</span>
            </div>
          </div>
          <div>
            ${allDone
              ? `<a href="materi.html" class="btn btn-warning px-3 py-2 rounded-lg text-sm font-bold">🎓 Mulai Ujian</a>`
              : `<a href="materi.html" class="btn btn-primary px-3 py-2 rounded-lg text-sm">📚 Lanjut Belajar</a>`
            }
          </div>
        </div>
      </div>`;
  }).join('');
}

// =========================================
// NOTIFICATIONS
// =========================================
function toggleNotifPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const isActive = panel.classList.contains("active");
  document
    .querySelectorAll(".notification-panel")
    .forEach((p) => p.classList.remove("active"));

  if (!isActive) {
    panel.classList.add("active");
    loadNotifications("student");
  }
}

async function loadNotifications(type) {
  const list = document.getElementById(`${type}NotifList`);
  const badge = document.getElementById(`${type}NotifBadge`);

  if (!currentProfile) return;

  const { data: notifications, error } = await sbClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentProfile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error loading notifications:", error);
    return;
  }

  if (!notifications || notifications.length === 0) {
    if (list)
      list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔔</div>
        <p>Tidak ada notifikasi</p>
      </div>`;
    if (badge) badge.classList.add("hidden");
    return;
  }

  const unread = notifications.filter((n) => !n.is_read).length;
  if (badge) {
    badge.textContent = unread > 9 ? "9+" : unread;
    unread > 0
      ? badge.classList.remove("hidden")
      : badge.classList.add("hidden");
  }

  if (list) {
    list.innerHTML = notifications
      .map(
        (n) => `
      <div class="notification-item ${!n.is_read ? "unread" : ""} p-3 rounded-lg">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-primary text-sm">${escHtml(n.title)}</h4>
            <p class="text-secondary text-xs mt-1">${escHtml(n.message)}</p>
            <p class="text-secondary text-xs mt-2">${formatDate.toIndonesian(n.created_at)}</p>
          </div>
          ${
            !n.is_read
              ? `<button onclick="markNotifRead('${n.id}', '${type}')" class="text-xs text-primary hover:underline ml-2">✓</button>`
              : ""
          }
        </div>
      </div>`,
      )
      .join("");
  }
}

async function markNotifRead(id, type) {
  const { error } = await sbClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    toast("Gagal menandai notifikasi", "error");
    return;
  }
  loadNotifications(type);
}

async function markAllRead(type) {
  if (!currentProfile) return;

  const { error } = await sbClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", currentProfile.id);

  if (error) {
    toast("Gagal menandai semua notifikasi", "error");
    return;
  }
  loadNotifications(type);
}

// Cleanup saat halaman ditutup
window.addEventListener("beforeunload", () => {
  if (refreshInterval) clearTimeout(refreshInterval);
});

// =========================================
// RESCHEDULE REQUESTS
// =========================================
async function loadRequests() {
  const list = document.getElementById("requestList");
  if (!list || !currentProfile) return;

  const { data, error } = await sbClient
    .from("reschedule_requests")
    .select("*, schedules:schedule_id(title, start_time)")
    .eq("student_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading requests:", error);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <h3>Belum ada request reschedule</h3>
        <p>Gunakan tombol "Request reschedule" pada kartu jadwal untuk meminta perubahan waktu.</p>
      </div>`;
    return;
  }

  const statusConfig = {
    pending:  { label: "Menunggu konfirmasi guru", badge: "status-warning",  icon: "⏳" },
    approved: { label: "Disetujui",                badge: "status-success",  icon: "✅" },
    rejected: { label: "Ditolak",                  badge: "status-danger",   icon: "❌" },
  };

  list.innerHTML = data
    .map((r) => {
      const cfg = statusConfig[r.status] || { label: r.status, badge: "status-info", icon: "📋" };

      // For approved requests: show the new time that was applied
      const updatedTimeNote =
        r.status === "approved" && r.requested_time
          ? `<p class="text-sm mt-2" style="color:var(--success,#22c55e)">
               ✅ Jadwal dipindahkan ke: <strong>${formatDate.toIndonesian(r.requested_time)}</strong>
             </p>`
          : "";

      // Admin note (shown when admin left a message)
      const adminNoteHtml = r.admin_note
        ? `<div class="glass p-3 mt-3" style="border-left:3px solid var(--accent)">
             <p class="text-xs text-secondary mb-1">💬 Pesan dari guru:</p>
             <p class="text-sm text-primary">${escHtml(r.admin_note)}</p>
           </div>`
        : "";

      // Context: what schedule was this about
      const scheduleInfo = r.schedules?.title
        ? `<p class="text-secondary text-sm mt-1">📚 Jadwal: <strong>${escHtml(r.schedules.title)}</strong>
             ${r.schedules.start_time ? `— ${formatDate.toIndonesian(r.schedules.start_time)}` : ""}</p>`
        : `<p class="text-secondary text-sm mt-1">📚 Permintaan jadwal baru</p>`;

      const borderColor = r.status === "approved"
        ? "var(--success,#22c55e)"
        : r.status === "rejected"
        ? "var(--error,#ef4444)"
        : "var(--accent)";

      return `
      <div class="glass p-4" style="border-left: 3px solid ${borderColor}">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div style="flex:1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-primary">${cfg.icon} ${escHtml(r.schedules?.title || "Permintaan Jadwal Baru")}</span>
              <span class="status-pill ${cfg.badge}" style="font-size:0.7rem;padding:2px 8px">${cfg.label}</span>
            </div>
            ${scheduleInfo}
            ${r.requested_time
              ? `<p class="text-secondary text-sm mt-1">🕐 Waktu yang diminta: ${formatDate.toIndonesian(r.requested_time)}</p>`
              : ""}
            <p class="text-secondary text-sm mt-2">💬 Alasan: ${escHtml(r.reason)}</p>
            ${updatedTimeNote}
            ${adminNoteHtml}
            <p class="text-secondary text-xs mt-3">Dikirim: ${formatDate.toIndonesian(r.created_at)}</p>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

async function openRescheduleRequest(scheduleId = "") {
  const schedule = upcomingSchedules.find((item) => String(item.id) === String(scheduleId));
  const scheduleField = document.getElementById("requestScheduleId");
  const timeField = document.getElementById("requestTime");
  const reasonField = document.getElementById("requestReason");

  if (scheduleField) scheduleField.value = schedule?.id || "";
  if (reasonField) reasonField.value = "";

  // Populate available slots dropdown
  if (timeField) {
    timeField.innerHTML = '<option value="">Memuat slot kosong...</option>';

    // Fetch available slots
    const { data: slots, error } = await sbClient
      .from("available_slots")
      .select("*")
      .eq("status", "available")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading available slots:", error);
      timeField.innerHTML = '<option value="">Gagal memuat slot</option>';
    } else if (!slots || slots.length === 0) {
      timeField.innerHTML = '<option value="">Tidak ada slot kosong tersedia</option>';
    } else {
      timeField.innerHTML = '<option value="">-- Pilih slot kosong --</option>';
      slots.forEach((slot) => {
        const option = document.createElement("option");
        option.value = slot.start_time; // Store the start_time as option value
        option.dataset.slotId = slot.id; // Store the slot UUID
        option.textContent = formatDate.toIndonesian(slot.start_time);
        timeField.appendChild(option);
      });
    }
  }

  openModal("requestModal");
}

async function submitRescheduleRequest() {
  if (!currentProfile) return;

  const scheduleId = document.getElementById("requestScheduleId")?.value;
  const timeField = document.getElementById("requestTime");
  const reason = document.getElementById("requestReason")?.value.trim();

  if (!reason) {
    toast("Alasan wajib diisi", "error");
    return;
  }

  const selectedOption = timeField?.options[timeField.selectedIndex];
  const requestedTime = selectedOption?.value || null;
  const slotId = selectedOption?.dataset.slotId || null;

  if (!requestedTime) {
    toast("Silakan pilih slot kosong yang tersedia", "error");
    return;
  }

  const { error } = await sbClient.from("reschedule_requests").insert([
    {
      student_id: currentProfile.id,
      schedule_id: scheduleId || null,
      requested_time: new Date(requestedTime).toISOString(),
      slot_id: slotId,
      reason,
      status: "pending",
    },
  ]);

  if (error) {
    toast("Gagal mengirim request: " + error.message, "error");
    return;
  }

  toast("Request berhasil dikirim", "success");
  if (document.getElementById("requestScheduleId")) {
    document.getElementById("requestScheduleId").value = "";
  }
  if (document.getElementById("requestTime")) {
    document.getElementById("requestTime").value = "";
  }
  if (document.getElementById("requestReason")) {
    document.getElementById("requestReason").value = "";
  }
  closeModal("requestModal");
  await Promise.all([loadRequests(), loadNotifications("student")]);
}
