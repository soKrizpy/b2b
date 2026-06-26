// =========================================
// GLOBAL STATE
// =========================================
let currentProfile = null;
let nextScheduleData = null;
let refreshInterval = null;

// =========================================
// AUTHENTICATION CHECK
// =========================================
async function checkAuth() {
  const user = await initUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // PERBAIKAN: gunakan .maybeSingle() agar tidak error jika tidak ada data
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
  if (nameEl) nameEl.textContent = `Halo, ${profile.full_name || "Siswa"}!`;

  // Load semua data
  await Promise.all([
    loadNextSchedule(),
    loadHistory(),
    loadLearningPath(),
    loadRequests(),
    loadNotifications("student"),
  ]);

  // Auto-refresh setiap 30 detik untuk update tombol join & notifikasi
  refreshInterval = setInterval(() => {
    updateJoinButton();
    loadNotifications("student");
  }, 30000);
}

document.addEventListener("DOMContentLoaded", checkAuth);

function switchStudentTab(tabName) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  refreshIcons();
}

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
// NEXT SCHEDULE WITH DYNAMIC BUTTON
// =========================================
async function loadNextSchedule() {
  const { data: schedule, error } = await sbClient
    .from("schedules")
    .select("*")
    .eq("student_id", currentProfile.id)
    .eq("status", "upcoming")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle(); // PERBAIKAN: maybeSingle agar tidak error

  if (error) {
    console.error("Error loading schedule:", error);
    return;
  }

  nextScheduleData = schedule;
  renderNextSchedule();
}

function renderNextSchedule() {
  const container = document.getElementById("nextSchedule");
  if (!container) return;

  if (!nextScheduleData) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon"></div>
        <h3>Tidak ada jadwal mendatang</h3>
        <p>Anda akan melihat jadwal di sini setelah guru menambahkannya</p>
      </div>`;
    return;
  }

  const dateStr = formatDate.toIndonesian(nextScheduleData.start_time);

  container.innerHTML = `
    <div class="glass card-hover p-6 text-center">
      <h3 class="text-2xl font-bold text-primary mb-2">${esc(nextScheduleData.title)}</h3>
      <p class="text-secondary mb-6">${dateStr}</p>
      <div id="joinButtonContainer"></div>
      <button onclick="openRequestModal('${nextScheduleData.id}')" class="btn glass px-4 py-3 rounded-lg font-semibold mt-4 w-full">
        🔁 Request Reschedule
      </button>
    </div>`;

  updateJoinButton();
}

function updateJoinButton() {
  if (!nextScheduleData) return;

  const container = document.getElementById("joinButtonContainer");
  if (!container) return;

  const now = new Date();
  const scheduleTime = new Date(nextScheduleData.start_time);
  const timeDiff = scheduleTime - now;
  const minutesUntilStart = timeDiff / (1000 * 60);
  const minutesSinceStart = -minutesUntilStart;

  let html = "";

  // Kondisi 1: Belum waktunya (lebih dari 10 menit sebelum jadwal)
  if (minutesUntilStart > 10) {
    const h = Math.floor(minutesUntilStart / 60);
    const m = Math.floor(minutesUntilStart % 60);
    const timeLeft = h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
    html = `
      <button disabled class="btn btn-disabled px-8 py-4 rounded-lg font-bold text-lg w-full">
        ⏰ Belum Waktunya<br>
        <span class="text-sm font-normal opacity-75">Akan aktif ${timeLeft} lagi</span>
      </button>`;
  }
  // Kondisi 2: Dalam 10 menit sebelum sampai 40 menit setelah jadwal
  else if (minutesUntilStart <= 10 && minutesSinceStart < 40) {
    const status =
      minutesUntilStart > 0
        ? `Mulai dalam ${Math.floor(minutesUntilStart)} menit`
        : "Kelas sedang berlangsung";
    html = `
      <button onclick="joinMeeting('${esc(nextScheduleData.meeting_link)}')"
        class="btn btn-success px-8 py-4 rounded-lg font-bold text-lg w-full join-btn-active">
        🎥 JOIN MEETING<br>
        <span class="text-sm font-normal opacity-90">${status}</span>
      </button>`;
  }
  // Kondisi 3: Sudah lebih dari 40 menit (kelas selesai)
  else {
    html = `
      <button disabled class="btn btn-disabled px-8 py-4 rounded-lg font-bold text-lg w-full">
        ✓ Kelas Selesai<br>
        <span class="text-sm font-normal opacity-75">Kelas telah berakhir</span>
      </button>`;
  }

  container.innerHTML = html;
}

function joinMeeting(link) {
  const url = safeUrl(link);
  if (!url) {
    toast("Link meeting tidak valid", "error");
    return;
  }
  window.open(url, "_blank");
  toast("Membuka link meeting...", "success");
}

function openRequestModal(scheduleId) {
  document.getElementById("requestScheduleId").value = scheduleId || "";
  document.getElementById("requestTime").value = "";
  document.getElementById("requestReason").value = "";
  openModal("requestModal");
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
        <h3 class="font-bold text-primary">${esc(s.title)}</h3>
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
  const timeline = document.getElementById("timelineList");

  const { data: modules, error } = await sbClient
    .from("learning_paths")
    .select("*")
    .eq("student_id", currentProfile.id)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error loading learning path:", error);
    toast("Gagal memuat materi: " + error.message, "error");
    return;
  }

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const emptyHtml = `
      <div class="empty-state">
        <div class="icon">📖</div>
        <h3>Belum ada materi</h3>
        <p>Guru akan menambahkan materi untuk Anda</p>
      </div>`;

  if (!modules || modules.length === 0) {
    if (list) list.innerHTML = emptyHtml;
    if (timeline) timeline.innerHTML = emptyHtml;
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "0% selesai";
    return;
  }

  const completed = modules.filter((m) => m.is_completed).length;
  const pct = Math.round((completed / modules.length) * 100);

  if (progressFill) progressFill.style.width = `${pct}%`;
  if (progressText)
    progressText.textContent = `${pct}% selesai (${completed}/${modules.length} materi)`;

  if (list) {
    list.innerHTML = modules
      .map((m) => {
        const resourceUrl = safeUrl(m.resource_url);
        return `
      <div class="glass p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">${m.is_completed ? "✅" : "📖"}</span>
          <div class="flex-1">
            <h3 class="font-bold text-primary ${m.is_completed ? "line-through opacity-50" : ""}">${esc(m.module_name)}</h3>
            ${resourceUrl ? `<a class="text-secondary text-sm mt-2 inline-block hover:text-primary" href="${esc(resourceUrl)}" target="_blank" rel="noopener">🔗 Buka resource</a>` : ""}
            ${m.homework_text ? `<p class="text-secondary text-sm mt-2">📝 ${esc(m.homework_text)}</p>` : ""}
          </div>
        </div>
      </div>`;
      })
      .join("");
  }

  if (timeline) {
    timeline.innerHTML = modules
      .map(
        (m, index) => `
      <div class="glass p-3 mb-3">
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-secondary">${index + 1}</span>
          <span class="text-primary ${m.is_completed ? "line-through opacity-50" : ""}">${esc(m.module_name)}</span>
          <span class="text-secondary text-sm">${m.is_completed ? "Selesai" : "Belum selesai"}</span>
        </div>
      </div>`,
      )
      .join("");
  }
}

async function loadRequests() {
  const list = document.getElementById("requestList");
  if (!list) return;

  const { data: requests, error } = await sbClient
    .from("reschedule_requests")
    .select("*, schedules:schedule_id(title,start_time)")
    .eq("student_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading requests:", error);
    toast("Gagal memuat request: " + error.message, "error");
    return;
  }

  if (!requests || requests.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔁</div>
        <h3>Belum ada request</h3>
        <p>Request reschedule Anda akan muncul di sini</p>
      </div>`;
    return;
  }

  list.innerHTML = requests
    .map(
      (request) => `
      <div class="glass p-4">
        <h3 class="font-bold text-primary">${esc(request.schedules?.title || "Jadwal")}</h3>
        <p class="text-secondary text-sm mt-1">Jadwal awal: ${request.schedules?.start_time ? formatDate.toIndonesian(request.schedules.start_time) : "-"}</p>
        <p class="text-secondary text-sm mt-1">Waktu diminta: ${request.requested_time ? formatDate.toIndonesian(request.requested_time) : "Fleksibel"}</p>
        <p class="text-secondary text-sm mt-2">${esc(request.reason || "-")}</p>
        <p class="text-secondary text-xs mt-2">Status: ${esc(request.status || "pending")}</p>
      </div>`,
    )
    .join("");
}

async function submitRescheduleRequest() {
  const scheduleId = document.getElementById("requestScheduleId")?.value;
  const requestedTime = document.getElementById("requestTime")?.value;
  const reason = document.getElementById("requestReason")?.value.trim();

  if (!scheduleId) {
    toast("Pilih jadwal yang ingin di-reschedule", "error");
    return;
  }

  if (!reason) {
    toast("Alasan request wajib diisi", "error");
    return;
  }

  const { error } = await sbClient.from("reschedule_requests").insert([
    {
      student_id: currentProfile.id,
      schedule_id: scheduleId,
      requested_time: requestedTime || null,
      reason,
      status: "pending",
    },
  ]);

  if (error) {
    toast("Gagal mengirim request: " + error.message, "error");
    return;
  }

  closeModal("requestModal");
  toast("Request terkirim", "success");
  await loadRequests();
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
            <h4 class="font-semibold text-primary text-sm">${esc(n.title)}</h4>
            <p class="text-secondary text-xs mt-1">${esc(n.message)}</p>
            <p class="text-secondary text-xs mt-2">${formatDate.toIndonesian(n.created_at)}</p>
          </div>
          ${
            !n.is_read
              ? `<button onclick="markNotifRead(${n.id}, '${type}')" class="text-xs text-primary hover:underline ml-2">✓</button>`
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
