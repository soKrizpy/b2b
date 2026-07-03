let allStudents = [];
let allSchedules = [];
let allRequests = [];
let calendar = null;
let selectedStudentId = "";

async function checkAuth() {
  const user = await initUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const profile = await apiHandler.handle(
    sbClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  );

  if (!profile) {
    toast(
      "Profil belum tersedia. Silakan masuk kembali setelah beberapa saat.",
      "error",
    );
    window.location.href = "index.html";
    return;
  }

  if (profile.role !== "admin") {
    window.location.href = "student.html";
    return;
  }

  currentUser = user;
  await loadDashboardData();
}
document.addEventListener("DOMContentLoaded", checkAuth);

async function loadDashboardData() {
  await Promise.all([
    loadStudents(),
    loadSchedules(),
    loadRequests(),
    loadNotifications("admin"),
  ]);
  renderStudentList();
  renderOverview();
  renderCalendar();
  refreshIcons();
}

async function logout() {
  if (await showConfirm("Logout", "Yakin ingin keluar?")) {
    await sbClient.auth.signOut();
    window.location.href = "index.html";
  }
}

function switchAdminTab(tabName) {
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

  if (tabName === "calendar" && calendar) {
    setTimeout(() => calendar.render(), 50);
  }
  refreshIcons();
}

function statusLabel(status) {
  const labels = {
    upcoming: ["Akan Datang", "status-info"],
    completed: ["Selesai", "status-success"],
    cancelled: ["Dibatalkan", "status-danger"],
    pending: ["Pending", "status-warning"],
    attended: ["Hadir", "status-success"],
    missed: ["Tidak Hadir", "status-danger"],
    rescheduled: ["Reschedule", "status-info"],
    approved: ["Disetujui", "status-success"],
    rejected: ["Ditolak", "status-danger"],
  };
  return labels[status] || [status || "-", "status-info"];
}

function pill(status) {
  const [text, className] = statusLabel(status);
  return `<span class="status-pill ${className}">${esc(text)}</span>`;
}

// --- STUDENTS ---
async function loadStudents() {
  const data = await apiHandler.handle(
    sbClient
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("full_name"),
  );
  if (!data) return;

  allStudents = data;
  document.getElementById("totalStudents").textContent = data.length;

  if (
    !selectedStudentId ||
    !data.some((student) => student.id === selectedStudentId)
  ) {
    selectedStudentId = data[0]?.id || "";
  }

  const studentSelect = document.getElementById("studentSelect");
  const scheduleStudent = document.getElementById("scheduleStudent");
  const notifRecipient = document.getElementById("notifRecipient");

  studentSelect.innerHTML = '<option value="">Pilih siswa</option>';
  scheduleStudent.innerHTML = '<option value="">Pilih siswa</option>';
  notifRecipient.innerHTML = '<option value="all">Semua siswa</option>';

  data.forEach((student) => {
    const option = `<option value="${student.id}">${esc(student.full_name)}</option>`;
    studentSelect.innerHTML += option;
    scheduleStudent.innerHTML += option;
    notifRecipient.innerHTML += option;
  });

  renderStudentList();
  if (!selectedStudentId && data[0]) selectedStudentId = data[0].id;
  renderStudentDetail();
}

function getPriorityStudents() {
  const prioritized = allStudents
    .map((student) => {
      const studentSchedules = allSchedules.filter(
        (schedule) => schedule.student_id === student.id,
      );
      const pendingRequests = allRequests.filter(
        (request) =>
          request.student_id === student.id && request.status === "pending",
      ).length;
      const missedAttendances = studentSchedules.filter(
        (schedule) => schedule.attendance_status === "missed",
      ).length;
      const upcomingSchedules = studentSchedules.filter(
        (schedule) => schedule.status === "upcoming",
      ).length;

      return {
        student,
        pendingRequests,
        missedAttendances,
        upcomingSchedules,
      };
    })
    .filter(
      ({ pendingRequests, missedAttendances, upcomingSchedules }) =>
        pendingRequests > 0 || missedAttendances > 0 || upcomingSchedules === 0,
    )
    .sort((a, b) => {
      if (b.pendingRequests !== a.pendingRequests) {
        return b.pendingRequests - a.pendingRequests;
      }
      if (b.missedAttendances !== a.missedAttendances) {
        return b.missedAttendances - a.missedAttendances;
      }
      if (b.upcomingSchedules !== a.upcomingSchedules) {
        return b.upcomingSchedules - a.upcomingSchedules;
      }
      return a.student.full_name.localeCompare(b.student.full_name);
    });

  return prioritized.length ? prioritized.slice(0, 4) : allStudents.slice(0, 4);
}

// Student list rendering
function renderStudentList() {
  const list = document.getElementById("studentList");
  const mini = document.getElementById("studentMiniList");

  const html = allStudents.length
    ? allStudents
        .map(
          (s) => `
          <div class="item-row clickable ${s.id === selectedStudentId ? "active" : ""}" onclick="selectStudent('${s.id}')">
            <div class="flex justify-between items-center gap-3">
              <div>
                <h3 class="font-bold text-primary">${esc(s.full_name)}</h3>
                <p class="text-secondary text-sm mt-1">${esc(s.id.slice(0, 8))}</p>
              </div>
              ${icon("chevron-right")}
            </div>
          </div>`,
        )
        .join("")
    : `<div class="empty-state">${icon("users", "icon-lg")}<h3>Belum ada siswa</h3></div>`;

  list.innerHTML = html;
  refreshIcons();

  const priorityStudents = getPriorityStudents();
  mini.innerHTML = priorityStudents.length
    ? priorityStudents
        .map(
          ({
            student,
            pendingRequests,
            missedAttendances,
            upcomingSchedules,
          }) => {
            const summary = pendingRequests
              ? `${pendingRequests} request tertunda`
              : missedAttendances
                ? `${missedAttendances} belum hadir`
                : `${upcomingSchedules} jadwal mendatang`;

            return `
          <div class="item-row clickable" onclick="selectStudent('${student.id}'); switchAdminTab('students')">
            <div class="flex justify-between items-center gap-3">
              <div>
                <h3 class="font-bold text-primary">${esc(student.full_name)}</h3>
                <p class="text-secondary text-sm mt-1">${esc(summary)}</p>
              </div>
              <div class="flex items-center gap-2">
                ${pendingRequests ? pill("pending") : missedAttendances ? pill("missed") : ""}
                ${icon("chevron-right")}
              </div>
            </div>
          </div>`;
          },
        )
        .join("")
    : `<div class="empty-state">${icon("users", "icon-lg")}<h3>Belum ada siswa</h3></div>`;
  refreshIcons();
}

function selectStudent(studentId) {
  selectedStudentId = studentId;
  document.getElementById("studentSelect").value = studentId;
  renderStudentList();
  renderStudentDetail();
  loadLearningPath();
}

function renderStudentDetail() {
  const detail = document.getElementById("studentDetail");
  const student = allStudents.find((s) => s.id === selectedStudentId);

  if (!student) {
    detail.innerHTML = `<div class="empty-state">${icon("user-round", "icon-lg")}<h3>Pilih siswa</h3></div>`;
    refreshIcons();
    return;
  }

  const studentSchedules = allSchedules.filter(
    (s) => s.student_id === student.id,
  );
  const next = studentSchedules
    .filter(
      (s) => s.status === "upcoming" && new Date(s.start_time) >= new Date(),
    )
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
  const completed = studentSchedules.filter(
    (s) => s.status === "completed",
  ).length;
  const missed = studentSchedules.filter(
    (s) => s.attendance_status === "missed",
  ).length;

  detail.innerHTML = `
    <div class="item-row">
      <h3 class="font-bold text-primary text-lg">${esc(student.full_name)}</h3>
      <div class="meta-line">
        <span>${icon("book-check")} ${completed} selesai</span>
        <span>${icon("calendar-clock")} ${studentSchedules.length} jadwal</span>
        <span>${icon("circle-x")} ${missed} tidak hadir</span>
      </div>
    </div>
    <div class="divider"></div>
    <h3 class="font-bold text-primary mb-3">Jadwal berikutnya</h3>
    ${
      next
        ? renderScheduleCard(next, { compact: true })
        : `<div class="empty-state">${icon("calendar-x", "icon-lg")}<h3>Belum ada jadwal</h3></div>`
    }
    <div class="divider"></div>
    <button onclick="openScheduleModal(null, '${student.id}')" class="btn btn-primary px-4 py-3 rounded-lg font-semibold w-full">
      ${icon("plus")} Tambah jadwal untuk siswa ini
    </button>
  `;
  refreshIcons();
}

async function addStudent() {
  const name = document.getElementById("newName").value.trim();
  let username = document.getElementById("newUsername").value.trim();
  const mpin = document.getElementById("newMpin").value.trim();
  const btn = document.getElementById("addStudentBtn");

  if (!validators.required(name) || !validators.required(username)) {
    toast("Nama dan username wajib diisi", "error");
    return;
  }
  if (!validators.mpin(mpin)) {
    toast("MPIN harus 6 digit angka", "error");
    return;
  }

  if (validators.phone(username)) username += "@kelas-coding.com";

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mendaftarkan...';

  const { data, error } = await sbClient.auth.signUp({
    email: username,
    password: mpin,
    options: { data: { full_name: name } },
  });

  if (error) {
    btn.disabled = false;
    btn.innerHTML = `${icon("user-plus")} Tambah Siswa`;
    refreshIcons();
    toast(error.message, "error");
    return;
  }

  if (!data.user) {
    btn.disabled = false;
    btn.innerHTML = `${icon("user-plus")} Tambah Siswa`;
    refreshIcons();
    toast("Pendaftaran berhasil! Minta siswa cek email konfirmasi.", "success");
    document.getElementById("newName").value = "";
    document.getElementById("newUsername").value = "";
    document.getElementById("newMpin").value = "";
    return;
  }

  // 🔥 WAJIB TAMBAH INI
  await sbClient.from("profiles").insert([
    {
      id: data.user.id,
      full_name: name,
      role: "student",
    },
  ]);

  btn.disabled = false;
  btn.innerHTML = `${icon("user-plus")} Tambah Siswa`;
  refreshIcons();

  toast(`${name} berhasil didaftarkan`, "success");
  document.getElementById("newName").value = "";
  document.getElementById("newUsername").value = "";
  document.getElementById("newMpin").value = "";
  selectedStudentId = data.user.id;
  await loadStudents();
  const freshlyCreatedStudent = document.getElementById("studentSelect");
  if (freshlyCreatedStudent) {
    freshlyCreatedStudent.value = selectedStudentId;
  }
  renderStudentList();
  renderStudentDetail();
  loadLearningPath();
}

// --- SCHEDULES + CALENDAR ---
async function loadSchedules() {
  const data = await apiHandler.handle(
    sbClient
      .from("schedules")
      .select("*, profiles:student_id(full_name)")
      .order("start_time", { ascending: true }),
  );
  if (!data) return;
  allSchedules = data;
  renderOverview();
  renderCalendar();
}

function renderOverview() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySchedules = allSchedules.filter((s) => {
    const date = new Date(s.start_time);
    return date >= today && date < tomorrow;
  });

  document.getElementById("todaySchedules").textContent = todaySchedules.length;
  document.getElementById("pendingRequests").textContent = allRequests.filter(
    (r) => r.status === "pending",
  ).length;

  const list = document.getElementById("todayFocusList");
  list.innerHTML = todaySchedules.length
    ? todaySchedules
        .map((s) => renderScheduleCard(s, { compact: true }))
        .join("")
    : `<div class="empty-state">${icon("calendar-x", "icon-lg")}<h3>Tidak ada kelas hari ini</h3></div>`;

  renderStudentDetail();
  refreshIcons();
}

function renderCalendar() {
  const el = document.getElementById("calendar");
  if (!el || !window.FullCalendar) return;

  const events = allSchedules.map((schedule) => ({
    id: String(schedule.id),
    title: `${schedule.title} - ${schedule.profiles?.full_name || "Siswa"}`,
    start: schedule.start_time,
    classNames: [`status-${schedule.status}`],
  }));

  if (!calendar) {
    calendar = new FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      height: "auto",
      selectable: true,
      nowIndicator: true,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      dateClick(info) {
        openScheduleModal(null, "", `${info.dateStr}T09:00`);
      },
      eventClick(info) {
        editSchedule(info.event.id);
      },
      events,
    });
    calendar.render();
    return;
  }

  calendar.removeAllEvents();
  events.forEach((event) => calendar.addEvent(event));
}

function renderScheduleCard(schedule, options = {}) {
  return `
    <div class="item-row">
      <div class="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h3 class="font-bold text-primary">${esc(schedule.title)}</h3>
          <div class="meta-line">
            <span>${icon("user-round")} ${esc(schedule.profiles?.full_name || "-")}</span>
            <span>${icon("clock")} ${formatDate.toIndonesian(schedule.start_time)}</span>
          </div>
          <div class="meta-line">
            ${pill(schedule.status)}
            ${pill(schedule.attendance_status || "pending")}
          </div>
          ${schedule.teacher_note ? `<p class="text-secondary text-sm mt-2">${esc(schedule.teacher_note)}</p>` : ""}
        </div>
        <div class="flex gap-2 flex-wrap">
          ${
            schedule.status === "upcoming"
              ? `
              <button onclick="markSchedule('${schedule.id}', 'completed')" class="btn btn-success px-3 py-2 rounded-lg text-sm">${icon("check")} Selesai</button>
              <button onclick="markSchedule('${schedule.id}', 'cancelled')" class="btn btn-warning px-3 py-2 rounded-lg text-sm">${icon("ban")} Batal</button>`
              : ""
          }
          <button onclick="editSchedule('${schedule.id}')" class="btn btn-primary px-3 py-2 rounded-lg text-sm">${icon("pencil")} Edit</button>
          ${options.compact ? "" : `<button onclick="deleteSchedule('${schedule.id}')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">${icon("trash-2")} Hapus</button>`}
        </div>
      </div>
    </div>`;
}

function openScheduleModal(scheduleId = null, studentId = "", startTime = "") {
  document.getElementById("editScheduleId").value = scheduleId || "";
  document.getElementById("scheduleStudent").value = studentId || "";
  document.getElementById("scheduleTitle").value = "";
  document.getElementById("scheduleTime").value = startTime || "";
  document.getElementById("scheduleLink").value = "";
  document.getElementById("scheduleAttendance").value = "pending";
  document.getElementById("scheduleNote").value = "";
  openModal("scheduleModal");
}

async function saveSchedule() {
  const id = document.getElementById("editScheduleId").value;
  const studentId = document.getElementById("scheduleStudent").value;
  const title = document.getElementById("scheduleTitle").value.trim();
  const time = document.getElementById("scheduleTime").value;
  const link = document.getElementById("scheduleLink").value.trim();
  const attendance = document.getElementById("scheduleAttendance").value;
  const note = document.getElementById("scheduleNote").value.trim();

  if (
    !validators.required(studentId) ||
    !validators.required(title) ||
    !validators.required(time) ||
    !validators.required(link)
  ) {
    toast("Siswa, judul, waktu, dan link wajib diisi", "error");
    return;
  }

  const scheduleData = {
    student_id: studentId,
    title,
    start_time: new Date(time).toISOString(),
    meeting_link: link,
    attendance_status: attendance,
    teacher_note: note || null,
  };

  if (id) {
    await apiHandler.handle(
      sbClient.from("schedules").update(scheduleData).eq("id", id),
      async () => {
        toast("Jadwal diupdate", "success");
        closeModal("scheduleModal");
        await loadSchedules();
      },
    );
    return;
  }

  const inserted = await apiHandler.handle(
    sbClient.from("schedules").insert([scheduleData]).select(),
    async () => {
      toast("Jadwal dibuat", "success");
      closeModal("scheduleModal");
      await loadSchedules();
    },
  );

  if (inserted?.[0]) {
    await sendNotificationToStudent(
      studentId,
      "Jadwal kelas baru",
      `Kelas "${title}" dijadwalkan pada ${formatDate.toIndonesian(time)}`,
    );
  }
}

async function editSchedule(id) {
  const data = await apiHandler.handle(
    sbClient.from("schedules").select("*").eq("id", id).single(),
  );
  if (!data) return;

  document.getElementById("editScheduleId").value = data.id;
  document.getElementById("scheduleStudent").value = data.student_id;
  document.getElementById("scheduleTitle").value = data.title;
  document.getElementById("scheduleTime").value = formatDate.toDateTimeLocal(
    data.start_time,
  );
  document.getElementById("scheduleLink").value = data.meeting_link;
  document.getElementById("scheduleAttendance").value =
    data.attendance_status || "pending";
  document.getElementById("scheduleNote").value = data.teacher_note || "";
  openModal("scheduleModal");
}

async function deleteSchedule(id) {
  if (await showConfirm("Hapus Jadwal", "Yakin hapus jadwal ini?", "danger")) {
    await apiHandler.handle(
      sbClient.from("schedules").delete().eq("id", id),
      async () => {
        toast("Jadwal dihapus", "success");
        await loadSchedules();
      },
    );
  }
}

async function markSchedule(id, status) {
  const attendance = status === "completed" ? "attended" : "pending";
  await apiHandler.handle(
    sbClient
      .from("schedules")
      .update({ status, attendance_status: attendance })
      .eq("id", id),
    async () => {
      toast("Status jadwal diperbarui", "success");
      await loadSchedules();
    },
  );
}

// Backward-compatible names for existing inline references.
const markAsCompleted = (id) => markSchedule(id, "completed");
const markAsCancelled = (id) => markSchedule(id, "cancelled");

// --- LEARNING PATH ---
async function loadLearningPath() {
  const studentId =
    document.getElementById("studentSelect").value || selectedStudentId;
  const list = document.getElementById("learningPathList");
  const progressSection = document.getElementById("progressSection");
  const addModuleSection = document.getElementById("addModuleSection");

  selectedStudentId = studentId;

  if (!studentId) {
    list.innerHTML = `<div class="empty-state">${icon("user-round", "icon-lg")}<h3>Pilih siswa</h3></div>`;
    progressSection.classList.add("hidden");
    addModuleSection.classList.add("hidden");
    refreshIcons();
    return;
  }

  document.getElementById("studentSelect").value = studentId;
  progressSection.classList.remove("hidden");
  addModuleSection.classList.remove("hidden");

  const data = await apiHandler.handle(
    sbClient
      .from("learning_paths")
      .select("*")
      .eq("student_id", studentId)
      .order("order_index", { ascending: true }),
  );

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="empty-state">${icon("book-open", "icon-lg")}<h3>Belum ada materi</h3></div>`;
    document.getElementById("progressFill").style.width = "0%";
    document.getElementById("progressText").textContent = "0% selesai";
    refreshIcons();
    return;
  }

  const completed = data.filter((m) => m.is_completed).length;
  const percentage = Math.round((completed / data.length) * 100);
  document.getElementById("progressFill").style.width = `${percentage}%`;
  document.getElementById("progressText").textContent =
    `${percentage}% selesai (${completed}/${data.length} materi)`;

  list.innerHTML = data
    .map(
      (m, i) => `
      <div class="item-row">
        <div class="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div class="meta-line"><span>${i + 1}.</span> ${pill(m.is_completed ? "completed" : "pending")} ${m.homework_done ? pill("attended") : ""}</div>
            <h3 class="font-bold text-primary mt-2 ${m.is_completed ? "line-through opacity-50" : ""}">${esc(m.module_name)}</h3>
            ${m.resource_url ? `<a class="meta-line" href="${esc(m.resource_url)}" target="_blank" rel="noopener">${icon("link")} Resource</a>` : ""}
            ${m.homework_text ? `<p class="text-secondary text-sm mt-2">${icon("clipboard-check")} ${esc(m.homework_text)}</p>` : ""}
          </div>
          <div class="flex gap-2 flex-wrap">
            <button onclick="toggleModule('${m.id}', ${!m.is_completed})" class="btn btn-success px-3 py-2 rounded-lg text-sm">${icon("check")} ${m.is_completed ? "Buka" : "Selesai"}</button>
            <button onclick="editModule('${m.id}')" class="btn btn-primary px-3 py-2 rounded-lg text-sm">${icon("pencil")} Edit</button>
            <button onclick="deleteModule('${m.id}')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">${icon("trash-2")} Hapus</button>
          </div>
        </div>
      </div>`,
    )
    .join("");
  refreshIcons();
}

function openModuleModal() {
  document.getElementById("editModuleId").value = "";
  document.getElementById("moduleName").value = "";
  document.getElementById("moduleResource").value = "";
  document.getElementById("moduleHomework").value = "";
  openModal("moduleModal");
}

async function saveModule() {
  const studentId =
    document.getElementById("studentSelect").value || selectedStudentId;
  const id = document.getElementById("editModuleId").value;
  const moduleName = document.getElementById("moduleName").value.trim();
  const resourceUrl = document.getElementById("moduleResource").value.trim();
  const homeworkText = document.getElementById("moduleHomework").value.trim();

  if (!studentId) {
    toast("Pilih siswa dulu", "error");
    return;
  }
  if (!validators.required(moduleName)) {
    toast("Nama materi wajib diisi", "error");
    return;
  }

  const payload = {
    module_name: moduleName,
    resource_url: resourceUrl || null,
    homework_text: homeworkText || null,
  };

  if (id) {
    await apiHandler.handle(
      sbClient.from("learning_paths").update(payload).eq("id", id),
      async () => {
        toast("Materi diupdate", "success");
        closeModal("moduleModal");
        await loadLearningPath();
      },
    );
    return;
  }

  const existing = await apiHandler.handle(
    sbClient.from("learning_paths").select("id").eq("student_id", studentId),
  );

  await apiHandler.handle(
    sbClient.from("learning_paths").insert([
      {
        student_id: studentId,
        ...payload,
        order_index: (existing?.length || 0) + 1,
      },
    ]),
    async () => {
      toast("Materi ditambahkan", "success");
      closeModal("moduleModal");
      await loadLearningPath();
    },
  );
}

async function editModule(id) {
  const data = await apiHandler.handle(
    sbClient.from("learning_paths").select("*").eq("id", id).single(),
  );
  if (!data) return;
  document.getElementById("editModuleId").value = data.id;
  document.getElementById("moduleName").value = data.module_name;
  document.getElementById("moduleResource").value = data.resource_url || "";
  document.getElementById("moduleHomework").value = data.homework_text || "";
  openModuleModal();
}

async function toggleModule(id, completed) {
  await apiHandler.handle(
    sbClient
      .from("learning_paths")
      .update({ is_completed: completed })
      .eq("id", id),
    async () => loadLearningPath(),
  );
}

async function deleteModule(id) {
  if (await showConfirm("Hapus Materi", "Yakin hapus materi ini?", "danger")) {
    await apiHandler.handle(
      sbClient.from("learning_paths").delete().eq("id", id),
      async () => {
        toast("Materi dihapus", "success");
        await loadLearningPath();
      },
    );
  }
}

// --- REQUESTS ---
async function loadRequests() {
  const data = await apiHandler.handle(
    sbClient
      .from("reschedule_requests")
      .select(
        "*, profiles:student_id(full_name), schedules:schedule_id(title,start_time)",
      )
      .order("created_at", { ascending: false }),
  );
  if (!data) return;
  allRequests = data;
  renderRequests();
  renderOverview();
}

function renderRequests() {
  const list = document.getElementById("requestList");
  if (!allRequests.length) {
    list.innerHTML = `<div class="empty-state">${icon("repeat-2", "icon-lg")}<h3>Belum ada request</h3></div>`;
    refreshIcons();
    return;
  }

  list.innerHTML = allRequests
    .map(
      (request) => `
      <div class="item-row">
        <div class="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h3 class="font-bold text-primary">${esc(request.profiles?.full_name || "Siswa")}</h3>
            <div class="meta-line">
              <span>${icon("calendar")} ${esc(request.schedules?.title || "Jadwal")}</span>
              <span>${icon("clock")} ${request.requested_time ? formatDate.toIndonesian(request.requested_time) : "Waktu fleksibel"}</span>
              ${pill(request.status)}
            </div>
            <p class="text-secondary text-sm mt-2">${esc(request.reason)}</p>
          </div>
          ${
            request.status === "pending"
              ? `<div class="flex gap-2 flex-wrap">
                  <button onclick="resolveRequest('${request.id}', 'approved')" class="btn btn-success px-3 py-2 rounded-lg text-sm">${icon("check")} Setuju</button>
                  <button onclick="resolveRequest('${request.id}', 'rejected')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">${icon("x")} Tolak</button>
                </div>`
              : ""
          }
        </div>
      </div>`,
    )
    .join("");
  refreshIcons();
}

async function resolveRequest(id, status) {
  const request = await apiHandler.handle(
    sbClient
      .from("reschedule_requests")
      .select("*, schedules:schedule_id(title, start_time)")
      .eq("id", id)
      .single(),
  );
  if (!request) return;

  if (status === "approved" && request.schedule_id && request.requested_time) {
    const updatedSchedule = await apiHandler.handle(
      sbClient
        .from("schedules")
        .update({
          start_time: request.requested_time,
          status: "upcoming",
          attendance_status: "rescheduled",
          teacher_note: request.reason,
        })
        .eq("id", request.schedule_id)
        .select()
        .single(),
    );
    if (!updatedSchedule) return;
  }

  await apiHandler.handle(
    sbClient
      .from("reschedule_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id),
    async () => {
      const title =
        status === "approved" ? "Request reschedule disetujui" : "Request reschedule ditolak";
      const message =
        status === "approved"
          ? request.requested_time
            ? `Jadwal "${request.schedules?.title || "kelas"}" dipindahkan ke ${formatDate.toIndonesian(request.requested_time)}.`
            : `Request untuk "${request.schedules?.title || "kelas"}" disetujui.`
          : `Request untuk "${request.schedules?.title || "kelas"}" ditolak. Silakan hubungi guru jika perlu jadwal lain.`;

      await sendNotificationToStudent(request.student_id, title, message);
      toast("Request diperbarui", "success");
      await Promise.all([loadRequests(), loadSchedules()]);
    },
  );
}

// --- NOTIFICATIONS ---
function toggleNotifPanel(panelId) {
  const panel = document.getElementById(panelId);
  const isActive = panel.classList.contains("active");
  document
    .querySelectorAll(".notification-panel")
    .forEach((p) => p.classList.remove("active"));
  if (!isActive) {
    panel.classList.add("active");
    loadNotifications("admin");
  }
}

async function loadNotifications(type) {
  if (!currentUser) return;
  const data = await apiHandler.handle(
    sbClient
      .from("notifications")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20),
  );
  const list = document.getElementById(`${type}NotifList`);
  const badge = document.getElementById(`${type}NotifBadge`);

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="empty-state">${icon("bell", "icon-lg")}<p>Tidak ada notifikasi</p></div>`;
    badge.classList.add("hidden");
    refreshIcons();
    return;
  }

  const unread = data.filter((n) => !n.is_read).length;
  badge.textContent = unread > 9 ? "9+" : unread;
  unread > 0 ? badge.classList.remove("hidden") : badge.classList.add("hidden");

  list.innerHTML = data
    .map(
      (n) => `
      <div class="notification-item ${!n.is_read ? "unread" : ""} p-3 rounded-lg">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-primary text-sm">${esc(n.title)}</h4>
            <p class="text-secondary text-xs mt-1">${esc(n.message)}</p>
            <p class="text-secondary text-xs mt-2">${formatDate.toIndonesian(n.created_at)}</p>
          </div>
          ${!n.is_read ? `<button onclick="markNotifRead('${n.id}', '${type}')" class="text-xs text-primary hover:underline ml-2">${icon("check")}</button>` : ""}
        </div>
      </div>`,
    )
    .join("");
  refreshIcons();
}

async function markNotifRead(id, type) {
  await apiHandler.handle(
    sbClient.from("notifications").update({ is_read: true }).eq("id", id),
    () => loadNotifications(type),
  );
}

async function markAllRead(type) {
  await apiHandler.handle(
    sbClient
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUser.id),
    () => loadNotifications(type),
  );
}

function useNotificationTemplate(title, message) {
  document.getElementById("notifTitle").value = title;
  document.getElementById("notifMessage").value = message;
}

async function sendNotification() {
  const recipient = document.getElementById("notifRecipient").value;
  const title = document.getElementById("notifTitle").value.trim();
  const message = document.getElementById("notifMessage").value.trim();

  if (!validators.required(title) || !validators.required(message)) {
    toast("Judul dan pesan wajib diisi", "error");
    return;
  }

  const userIds =
    recipient === "all"
      ? allStudents.map((student) => student.id)
      : [recipient];

  await apiHandler.handle(
    sbClient.from("notifications").insert(
      userIds.map((uid) => ({
        user_id: uid,
        title,
        message,
        type: "system",
      })),
    ),
    () => {
      toast(`Terkirim ke ${userIds.length} siswa`, "success");
      document.getElementById("notifTitle").value = "";
      document.getElementById("notifMessage").value = "";
    },
  );
}

async function sendNotificationToStudent(studentId, title, message) {
  await apiHandler.handle(
    sbClient
      .from("notifications")
      .insert([{ user_id: studentId, title, message, type: "schedule" }]),
  );
}
