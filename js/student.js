// =========================================
// GLOBAL STATE
// =========================================
let currentProfile = null;
let nextScheduleData = null;
let upcomingSchedules = [];
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
    // Ensure home tab stays active
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.tab === "home"),
      );
    document
      .querySelectorAll(".tab-panel")
      .forEach((panel) =>
        panel.classList.toggle("active", panel.id === "tab-home"),
      );
    return;
  }

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
    if (lockedPlaceholder) lockedPlaceholder.style.display = "none";
    if (materialsContent) materialsContent.style.display = "block";
  } else {
    // Locked — show lock screen, hide content
    if (materialsBtn) {
      materialsBtn.classList.add("tab-locked");
      materialsBtn.title =
        "Selesaikan minimal 1 pertemuan untuk membuka Materi";
    }
    if (lockedPlaceholder) lockedPlaceholder.style.display = "block";
    if (materialsContent) materialsContent.style.display = "none";
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

  // Load semua data
  await Promise.all([
    loadUpcomingSchedules(),
    loadHistory(),
    loadNotifications("student"),
    loadRequests(),
  ]);

  // Check completed sessions FIRST, then load materials only if unlocked
  await checkMaterialsAccess();
  if (hasCompletedSession) {
    await loadLearningPath();
  }

  // Auto-refresh setiap 30 detik
  refreshInterval = setInterval(async () => {
    await Promise.all([
      loadUpcomingSchedules(),
      loadHistory(),
      loadNotifications("student"),
      loadRequests(),
    ]);
    await checkMaterialsAccess();
    if (hasCompletedSession) {
      await loadLearningPath();
    }
    updateJoinButton();
  }, 30000);
}

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

  if (refreshInterval) clearInterval(refreshInterval);
  await sbClient.auth.signOut();
  toast("Berhasil logout", "success");
  window.location.href = "index.html";
}

// =========================================
// UPCOMING SCHEDULES WITH DYNAMIC BUTTONS
// =========================================
async function loadUpcomingSchedules() {
  const { data: schedules, error } = await sbClient
    .from("schedules")
    .select("*")
    .eq("student_id", currentProfile.id)
    .eq("status", "upcoming")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) {
    console.error("Error loading schedules:", error);
    return;
  }

  upcomingSchedules = schedules || [];
  nextScheduleData = upcomingSchedules[0] || null;
  renderUpcomingSchedules();
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
    <div class="glass card-hover p-6 student-schedule-card">
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
  upcomingSchedules.forEach((schedule) => {
    const container = document.getElementById(`joinButtonContainer-${schedule.id}`);
    if (!container) return;

    const now = new Date();
    const scheduleTime = new Date(schedule.start_time);
    const timeDiff = scheduleTime - now;
    const minutesUntilStart = timeDiff / (1000 * 60);
    const minutesSinceStart = -minutesUntilStart;

    let html = "";

    if (minutesUntilStart > 10) {
      const h = Math.floor(minutesUntilStart / 60);
      const m = Math.floor(minutesUntilStart % 60);
      const timeLeft = h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
      html = `
        <button disabled class="btn btn-disabled px-4 py-3 rounded-lg font-bold w-full">
          Belum waktunya<br>
          <span class="text-sm font-normal opacity-75">Aktif ${timeLeft} lagi</span>
        </button>`;
    } else if (minutesUntilStart <= 10 && minutesSinceStart < 40) {
      const status =
        minutesUntilStart > 0
          ? `Mulai dalam ${Math.floor(minutesUntilStart)} menit`
          : "Kelas sedang berlangsung";
      html = `
        <button onclick="joinMeetingById('${schedule.id}')"
          class="btn btn-success px-4 py-3 rounded-lg font-bold w-full join-btn-active">
          Join meeting<br>
          <span class="text-sm font-normal opacity-90">${status}</span>
        </button>`;
    } else {
      html = `
        <button disabled class="btn btn-disabled px-4 py-3 rounded-lg font-bold w-full">
          Kelas selesai<br>
          <span class="text-sm font-normal opacity-75">Kelas telah berakhir</span>
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

function joinMeetingById(scheduleId) {
  const schedule = upcomingSchedules.find((item) => String(item.id) === String(scheduleId));
  joinMeeting(schedule?.meeting_link || "");
}

// escHtml and esc are provided by shared.js

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
// LEARNING PATH
// =========================================
async function loadLearningPath() {
  const list = document.getElementById("learningPathList");
  if (!list) return;

  const { data: modules, error } = await sbClient
    .from("learning_paths")
    .select("*")
    .eq("student_id", currentProfile.id)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error loading learning path:", error);
    return;
  }

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  if (!modules || modules.length === 0) {
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

  const completed = modules.filter((m) => m.is_completed).length;
  const pct = Math.round((completed / modules.length) * 100);

  if (progressFill) progressFill.style.width = `${pct}%`;
  if (progressText)
    progressText.textContent = `${pct}% selesai (${completed}/${modules.length} materi)`;

  list.innerHTML = modules
    .map(
      (m) => `
      <div class="glass p-4 flex items-center gap-3">
        <span class="text-2xl">${m.is_completed ? "✅" : ""}</span>
        <span class="text-primary ${m.is_completed ? "line-through opacity-50" : ""}">
          ${escHtml(m.module_name)}
        </span>
      </div>`,
    )
    .join("");
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
  if (refreshInterval) clearInterval(refreshInterval);
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
