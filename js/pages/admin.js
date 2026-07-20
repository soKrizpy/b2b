let allStudents = [];
let allSchedules = [];
let allRequests = [];
let allSlots = []; // Global available slots
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

async function loadAvailableSlots() {
  const data = await apiHandler.handle(
    sbClient
      .from("available_slots")
      .select("*")
      .order("start_time", { ascending: true }),
  );
  if (data) allSlots = data;
}

async function loadDashboardData() {
  await Promise.all([
    loadStudents(),
    loadSchedules(),
    loadRequests(),
    loadAvailableSlots(),
    loadNotifications("admin"),
    loadModuleLibrary(),
  ]);
  renderStudentList();
  renderOverview();
  renderCalendar();

  // Mount timezone widget
  const tzEl = document.getElementById("adminTzWidget");
  if (tzEl) {
    tzEl.innerHTML = renderTimezoneWidget("adminTzBtn");
    refreshIcons();
  }

  refreshIcons();
}

// Re-render all date-dependent views when timezone changes
document.addEventListener("timezone-changed", () => {
  renderOverview();
  renderCalendar();
  renderStudentDetail();
  refreshIcons();
});

async function logout() {
  if (await showConfirm("Logout", "Yakin ingin keluar?")) {
    await sbClient.auth.signOut();
    window.location.href = "index.html";
  }
}

function switchAdminTab(tabName) {
  requestAnimationFrame(() => {
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
  });
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

  const optionsHtml = data
    .map((student) => `<option value="${student.id}">${esc(student.full_name)}</option>`)
    .join("");
  studentSelect.innerHTML += optionsHtml;
  scheduleStudent.innerHTML += optionsHtml;
  notifRecipient.innerHTML += optionsHtml;

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
  requestAnimationFrame(() => refreshIcons());

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
  requestAnimationFrame(() => refreshIcons());
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

  const events = [];

  // Add student schedules
  allSchedules.forEach((schedule) => {
    events.push({
      id: String(schedule.id),
      title: schedule.profiles?.full_name || "Siswa",
      start: schedule.start_time,
      classNames: [`status-${schedule.status}`],
    });
  });

  // Add available slots — green = free slot
  allSlots.forEach((slot) => {
    if (slot.status === "available") {
      events.push({
        id: `slot-${slot.id}`,
        title: `[Slot Kosong]`,
        start: slot.start_time,
        color: "#10b981",
        classNames: ["status-upcoming"],
      });
    } else if (slot.status === "reserved") {
      // Show reserved slots in amber — student name shown if available
      const name = slot.profiles?.full_name || slot.reserved_by ? "Siswa (pending)" : "Reserved";
      events.push({
        id: `slot-${slot.id}`,
        title: `[${name}]`,
        start: slot.start_time,
        color: "#f59e0b",
        classNames: ["status-warning"],
      });
    }
  });

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
      eventTimeFormat: {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      slotLabelFormat: {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      dateClick(info) {
        openAvailableSlotModal(null, `${info.dateStr}T09:00`);
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

function toggleScheduleTypeFields() {
  const type = document.getElementById("scheduleType").value;
  const isSlot = type === "slot";
  const isEditing = !!document.getElementById("editScheduleId").value;

  document.getElementById("scheduleStudentGroup").style.display = isSlot
    ? "none"
    : "block";
  document.getElementById("scheduleTitleGroup").style.display = isSlot
    ? "none"
    : "block";
  document.getElementById("scheduleLinkGroup").style.display = isSlot
    ? "none"
    : "block";
  document.getElementById("scheduleAttendanceGroup").style.display = isSlot
    ? "none"
    : "block";
  document.getElementById("scheduleNoteGroup").style.display = isSlot
    ? "none"
    : "block";
  document.getElementById("slotRepeatGroup").style.display =
    isSlot && !isEditing ? "block" : "none";
  document.getElementById("slotRepeatGroup").classList.toggle("hidden", !(isSlot && !isEditing));
  
  const scopeGroup = document.getElementById("slotEditScopeGroup");
  if (scopeGroup) {
    const showScope = isSlot && isEditing;
    scopeGroup.style.display = showScope ? "block" : "none";
    scopeGroup.classList.toggle("hidden", !showScope);
  }

  document.getElementById("scheduleModalTitle").textContent = isSlot
    ? isEditing
      ? "Edit Slot Kosong"
      : "Slot Kosong Rutinan"
    : isEditing
      ? "Edit Sesi 1-on-1"
      : "Sesi 1-on-1 Baru";
}

function toggleSlotRepeatOptions() {
  // Always shown now
}

function openClassScheduleModal(scheduleId = null, studentId = "", startTime = "") {
  openScheduleModal(scheduleId, studentId, startTime, "class");
}

function openAvailableSlotModal(slotId = null, startTime = "") {
  const id = slotId ? `slot-${slotId}` : null;
  openScheduleModal(id, "", startTime, "slot");
}

function openScheduleModal(
  scheduleId = null,
  studentId = "",
  startTime = "",
  scheduleType = null,
) {
  document.getElementById("editScheduleId").value = scheduleId || "";
  document.getElementById("scheduleStudent").value = studentId || "";
  document.getElementById("scheduleTitle").value = "";
  document.getElementById("scheduleTime").value = startTime || "";
  document.getElementById("scheduleLink").value = "";
  document.getElementById("scheduleAttendance").value = "pending";
  document.getElementById("scheduleNote").value = "";
  
  const repeatIntervalEl = document.getElementById("slotRepeatInterval");
  if (repeatIntervalEl) repeatIntervalEl.value = "weekly";
  
  const repeatCountEl = document.getElementById("slotRepeatCount");
  if (repeatCountEl) repeatCountEl.value = "4";

  // Reset edit scope radio to 'single'
  const singleRadio = document.querySelector('input[name="slotEditScope"][value="single"]');
  if (singleRadio) singleRadio.checked = true;

  const isEditing = !!scheduleId;
  const btnDelete = document.getElementById("btnDeleteSchedule");
  if (btnDelete) {
    if (isEditing) {
      btnDelete.classList.remove("hidden");
    } else {
      btnDelete.classList.add("hidden");
    }
  }

  const typeSelector = document.getElementById("scheduleType");
  if (scheduleType) {
    typeSelector.value = scheduleType;
  } else if (scheduleId && scheduleId.startsWith("slot-")) {
    typeSelector.value = "slot";
  } else {
    typeSelector.value = "class";
  }

  toggleScheduleTypeFields();
  openModal("scheduleModal");
}

async function saveSchedule() {
  const id = document.getElementById("editScheduleId").value;
  const type = document.getElementById("scheduleType").value;
  const time = document.getElementById("scheduleTime").value;

  if (!validators.required(time)) {
    toast("Waktu wajib diisi", "error");
    return;
  }

  const formattedTime = new Date(time).toISOString();

  // If slot kosong (available slot)
  if (type === "slot") {
    if (id && id.startsWith("slot-")) {
      const slotUuid = id.substring(5); // remove 'slot-'
      const scope = document.querySelector('input[name="slotEditScope"]:checked')?.value || "single";
      
      if (scope === "future") {
        const originalSlot = allSlots.find((s) => s.id === slotUuid);
        if (originalSlot) {
            const origDate = new Date(originalSlot.start_time);
            const origDay = origDate.getDay();
            const origHour = origDate.getHours();
            const origMin = origDate.getMinutes();
            
            const slotsToUpdate = allSlots.filter((s) => {
                const d = new Date(s.start_time);
                return s.status === 'available' && 
                       d >= origDate &&
                       d.getDay() === origDay &&
                       d.getHours() === origHour &&
                       d.getMinutes() === origMin;
            });
            
            const newDate = new Date(formattedTime);
            const diffMs = newDate.getTime() - origDate.getTime();
            
            const updatePromises = slotsToUpdate.map((slot) => {
               const slotDate = new Date(slot.start_time);
               const updatedSlotTime = new Date(slotDate.getTime() + diffMs);
               
               return sbClient
                 .from("available_slots")
                 .update({ start_time: updatedSlotTime.toISOString(), status: "available" })
                 .eq("id", slot.id);
            });
            
            await Promise.all(updatePromises);
            toast("Semua slot rutinan berhasil diperbarui", "success");
            closeModal("scheduleModal");
            await Promise.all([loadSchedules(), loadAvailableSlots()]);
            renderCalendar();
            return;
        }
      }

      await apiHandler.handle(
        sbClient
          .from("available_slots")
          .update({ start_time: formattedTime, status: "available" })
          .eq("id", slotUuid),
        async () => {
          toast("Slot kosong berhasil diperbarui", "success");
          closeModal("scheduleModal");
          await Promise.all([loadSchedules(), loadAvailableSlots()]);
          renderCalendar();
        },
      );
      return;
    }

    const repeatInterval = "weekly";
    const repeatCount = 52;

    const intervalDays = 7;
    const slotRows = Array.from({ length: repeatCount }, (_, index) => {
      const slotTime = new Date(time);
      slotTime.setDate(slotTime.getDate() + index * intervalDays);
      return {
        start_time: slotTime.toISOString(),
        status: "available",
      };
    });

    await apiHandler.handle(
      sbClient.from("available_slots").insert(slotRows),
      async () => {
        toast(
          repeatCount === 1
            ? "Slot kosong berhasil dibuat"
            : `${repeatCount} slot kosong berhasil dibuat`,
          "success",
        );
        closeModal("scheduleModal");
        await Promise.all([loadSchedules(), loadAvailableSlots()]);
        renderCalendar();
      },
    );
    return;
  }

  // Otherwise, standard student class schedule
  const studentId = document.getElementById("scheduleStudent").value;
  const title = document.getElementById("scheduleTitle").value.trim();
  const link = document.getElementById("scheduleLink").value.trim();
  const attendance = document.getElementById("scheduleAttendance").value;
  const note = document.getElementById("scheduleNote").value.trim();

  if (
    !validators.required(studentId) ||
    !validators.required(title) ||
    !validators.required(link)
  ) {
    toast(
      "Siswa, judul, dan link Zoom/Meet wajib diisi untuk jadwal kelas",
      "error",
    );
    return;
  }

  const scheduleData = {
    student_id: studentId,
    title,
    start_time: formattedTime,
    meeting_link: link,
    attendance_status: attendance,
    teacher_note: note || null,
  };

  if (id && !id.startsWith("slot-")) {
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
      // Delete any available slot at this time since it is now booked as a class
      await sbClient
        .from("available_slots")
        .delete()
        .eq("start_time", formattedTime);

      toast("Jadwal dibuat", "success");
      closeModal("scheduleModal");
      await Promise.all([loadSchedules(), loadAvailableSlots()]);
      renderCalendar();
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
  if (id && id.startsWith("slot-")) {
    const slotUuid = id.substring(5);
    const slot = allSlots.find((s) => s.id === slotUuid);
    if (!slot) return;
    openScheduleModal(id, "", formatDate.toDateTimeLocal(slot.start_time), "slot");
    return;
  }

  const data = await apiHandler.handle(
    sbClient.from("schedules").select("*").eq("id", id).single(),
  );
  if (!data) return;

  openScheduleModal(
    data.id,
    data.student_id,
    formatDate.toDateTimeLocal(data.start_time),
  );

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
}

async function deleteSchedule(id) {
  if (id && id.startsWith("slot-")) {
    const slotUuid = id.substring(5);
    const scope = document.querySelector('input[name="slotEditScope"]:checked')?.value || "single";
    
    if (scope === "future") {
      if (await showConfirm("Hapus Rutinan", "Yakin hapus slot ini dan SEMUA rutinan setelahnya?", "danger")) {
        const originalSlot = allSlots.find(s => s.id === slotUuid);
        if (originalSlot) {
            const origDate = new Date(originalSlot.start_time);
            const origDay = origDate.getDay();
            const origHour = origDate.getHours();
            const origMin = origDate.getMinutes();
            
            const slotsToDelete = allSlots.filter(s => {
                const d = new Date(s.start_time);
                return s.status === 'available' && 
                       d >= origDate &&
                       d.getDay() === origDay &&
                       d.getHours() === origHour &&
                       d.getMinutes() === origMin;
            });
            
            const idsToDelete = slotsToDelete.map(s => s.id);
            
            await apiHandler.handle(
                sbClient.from("available_slots").delete().in('id', idsToDelete),
                async () => {
                    toast(`${idsToDelete.length} slot dihapus`, "success");
                    await Promise.all([loadSchedules(), loadAvailableSlots()]);
                    renderCalendar();
                    closeModal("scheduleModal");
                }
            );
        }
      }
      return;
    }

    if (
      await showConfirm(
        "Hapus Slot Kosong",
        "Yakin hapus slot kosong ini?",
        "danger",
      )
    ) {
      await apiHandler.handle(
        sbClient.from("available_slots").delete().eq("id", slotUuid),
        async () => {
          toast("Slot kosong dihapus", "success");
          await Promise.all([loadSchedules(), loadAvailableSlots()]);
          renderCalendar();
          closeModal("scheduleModal");
        },
      );
    }
    return;
  }

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

async function deleteCurrentScheduleOrSlot() {
  const id = document.getElementById("editScheduleId").value;
  if (!id) return;
  await deleteSchedule(id);
  closeModal("scheduleModal");
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

// Filter state for requests tab
let requestFilter = "pending";

function setRequestFilter(filter) {
  requestFilter = filter;
  document.querySelectorAll(".req-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderRequests();
}

function renderRequests() {
  const list = document.getElementById("requestList");

  // Filter buttons HTML
  const filterBar = `
    <div class="flex gap-2 flex-wrap mb-4">
      <button class="req-filter-btn btn glass px-3 py-2 rounded-lg text-sm ${requestFilter === "pending" ? "active" : ""}" data-filter="pending" onclick="setRequestFilter('pending')">
        ${icon("clock")} Pending
      </button>
      <button class="req-filter-btn btn glass px-3 py-2 rounded-lg text-sm ${requestFilter === "all" ? "active" : ""}" data-filter="all" onclick="setRequestFilter('all')">
        ${icon("list")} Semua
      </button>
      <button class="req-filter-btn btn glass px-3 py-2 rounded-lg text-sm ${requestFilter === "approved" ? "active" : ""}" data-filter="approved" onclick="setRequestFilter('approved')">
        ${icon("check-circle")} Disetujui
      </button>
      <button class="req-filter-btn btn glass px-3 py-2 rounded-lg text-sm ${requestFilter === "rejected" ? "active" : ""}" data-filter="rejected" onclick="setRequestFilter('rejected')">
        ${icon("x-circle")} Ditolak
      </button>
    </div>`;

  const filtered =
    requestFilter === "all"
      ? allRequests
      : allRequests.filter((r) => r.status === requestFilter);

  if (!filtered.length) {
    list.innerHTML =
      filterBar +
      `<div class="empty-state">${icon("repeat-2", "icon-lg")}<h3>${requestFilter === "pending" ? "Tidak ada request pending" : "Belum ada request"}</h3></div>`;
    refreshIcons();
    return;
  }

  list.innerHTML =
    filterBar +
    filtered
      .map((request) => {
        const originalTime = request.schedules?.start_time
          ? `<span class="text-secondary text-sm">${icon("calendar-clock")} Jadwal asal: ${formatDate.toIndonesian(request.schedules.start_time)}</span>`
          : "";

        const requestedTimeLabel = request.requested_time
          ? `<span class="text-accent text-sm font-semibold">${icon("calendar-check")} Waktu diminta: ${formatDate.toIndonesian(request.requested_time)}</span>`
          : `<span class="text-secondary text-sm">${icon("help-circle")} Waktu: Fleksibel (tidak spesifik)</span>`;

        const scheduleContext = request.schedule_id
          ? `<span>${icon("book-open")} ${esc(request.schedules?.title || "Jadwal")}</span>`
          : `<span class="text-warning">${icon("plus-circle")} Permintaan jadwal baru</span>`;

        const autoApplyHint =
          request.status === "pending" &&
          request.schedule_id &&
          request.requested_time
            ? `<p class="text-success text-xs mt-2">${icon("zap")} Menyetujui akan otomatis memindahkan jadwal ke waktu yang diminta.</p>`
            : request.status === "pending" &&
                request.schedule_id &&
                !request.requested_time
              ? `<p class="text-warning text-xs mt-2">${icon("alert-triangle")} Waktu tidak spesifik ΓÇö jadwal tidak akan berubah otomatis jika disetujui.</p>`
              : request.status === "pending" && !request.schedule_id
                ? `<p class="text-info text-xs mt-2">${icon("info")} Menyetujui akan membuka form untuk membuat jadwal baru untuk siswa ini.</p>`
                : "";

        const adminNoteDisplay = request.admin_note
          ? `<p class="text-secondary text-xs mt-2 italic">${icon("message-square")} Catatan guru: ${esc(request.admin_note)}</p>`
          : "";

        return `
        <div class="item-row request-card" id="request-${request.id}">
          <div class="flex justify-between items-start gap-3 flex-wrap">
            <div style="flex:1;min-width:0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="font-bold text-primary">${esc(request.profiles?.full_name || "Siswa")}</h3>
                ${pill(request.status)}
              </div>
              <div class="meta-line flex-col" style="gap:4px;align-items:flex-start;">
                ${scheduleContext}
                ${originalTime}
                ${requestedTimeLabel}
              </div>
              <p class="text-secondary text-sm mt-2">${icon("message-circle")} ${esc(request.reason)}</p>
              ${autoApplyHint}
              ${adminNoteDisplay}
              <p class="text-secondary text-xs mt-2">${icon("clock")} Dikirim: ${formatDate.toIndonesian(request.created_at)}</p>
            </div>
            ${
              request.status === "pending"
                ? `<div class="flex flex-col gap-2" style="min-width:200px">
                    <input type="text" id="admin-note-${request.id}" placeholder="Catatan (opsional)" class="input-field px-3 py-2 rounded-lg text-sm" />
                    <button onclick="resolveRequest('${request.id}', 'approved')" class="btn btn-success px-3 py-2 rounded-lg text-sm">${icon("check")} Setuju &amp; Terapkan</button>
                    <button onclick="resolveRequest('${request.id}', 'rejected')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">${icon("x")} Tolak</button>
                  </div>`
                : `<div class="text-secondary text-sm">${icon("check-circle")} Sudah diproses</div>`
            }
          </div>
        </div>`;
      })
      .join("");
  refreshIcons();
}

async function resolveRequest(id, status) {
  // Fetch full request data with joined schedule info
  const request = await apiHandler.handle(
    sbClient
      .from("reschedule_requests")
      .select(
        "*, profiles:student_id(full_name), schedules:schedule_id(title, start_time, meeting_link)",
      )
      .eq("id", id)
      .single(),
  );
  if (!request) return;

  // Read optional admin note from the inline input
  const adminNoteInput = document.getElementById(`admin-note-${id}`);
  const adminNote = adminNoteInput?.value.trim() || null;

  const studentName = request.profiles?.full_name || "siswa";
  const scheduleTitle = request.schedules?.title || "kelas";

  // ΓöÇΓöÇ CASE 1: Approve with schedule_id + requested_time ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // This is the primary auto-apply path: update the existing schedule's time.
  if (status === "approved" && request.schedule_id && request.requested_time) {
    const originalTime = request.schedules?.start_time
      ? formatDate.toIndonesian(request.schedules.start_time)
      : "waktu asal";
    const newTime = formatDate.toIndonesian(request.requested_time);

    const confirmed = await showConfirm(
      "Setujui & Terapkan Reschedule",
      `Jadwal "${scheduleTitle}" untuk ${studentName} akan dipindahkan:\n\n` +
        `Dari: ${originalTime}\nKe:   ${newTime}\n\nLanjutkan?`,
      "warning",
    );
    if (!confirmed) return;

    // Auto-update the schedule row
    const updatedSchedule = await apiHandler.handle(
      sbClient
        .from("schedules")
        .update({
          start_time: request.requested_time,
          status: "upcoming",
          attendance_status: "rescheduled",
          teacher_note: adminNote || request.reason,
        })
        .eq("id", request.schedule_id)
        .select()
        .single(),
    );
    if (!updatedSchedule) return; // Error already shown by apiHandler

    // Delete the booked slot
    if (request.slot_id) {
      await sbClient.from("available_slots").delete().eq("id", request.slot_id);
    } else if (request.requested_time) {
      await sbClient
        .from("available_slots")
        .delete()
        .eq("start_time", request.requested_time);
    }

    // Persist request status + admin note
    await apiHandler.handle(
      sbClient
        .from("reschedule_requests")
        .update({
          status: "approved",
          admin_note: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
    );

    await sendNotificationToStudent(
      request.student_id,
      "Jadwal berhasil dipindahkan Γ£à",
      `Permintaan reschedule kelas "${scheduleTitle}" disetujui. Jadwal baru: ${newTime}.`,
    );
    toast("Jadwal otomatis diperbarui & notifikasi terkirim", "success");
    await Promise.all([loadRequests(), loadSchedules(), loadAvailableSlots()]);
    return;
  }

  // ΓöÇΓöÇ CASE 2: Approve with schedule_id but NO requested_time ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Student wants to reschedule but didn't specify a time.
  // Approve the request but warn admin that schedule is NOT auto-changed.
  if (status === "approved" && request.schedule_id && !request.requested_time) {
    const confirmed = await showConfirm(
      "Setujui Request (Tanpa Waktu Baru)",
      `Siswa ${studentName} tidak mencantumkan waktu baru.\n\n` +
        `Request akan disetujui tetapi jadwal "${scheduleTitle}" TIDAK berubah otomatis. ` +
        `Ubah jadwal secara manual setelah ini jika diperlukan.`,
      "warning",
    );
    if (!confirmed) return;

    await apiHandler.handle(
      sbClient
        .from("reschedule_requests")
        .update({
          status: "approved",
          admin_note: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
      async () => {
        await sendNotificationToStudent(
          request.student_id,
          "Request reschedule disetujui",
          `Permintaan untuk kelas "${scheduleTitle}" disetujui. Guru akan menghubungi kamu untuk jadwal baru.`,
        );
        toast("Request disetujui ΓÇö ingat ubah jadwal secara manual", "success");
        await Promise.all([loadRequests(), loadSchedules()]);
      },
    );
    return;
  }

  // ΓöÇΓöÇ CASE 3: Approve with NO schedule_id ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Student is requesting a brand-new class (no existing schedule linked).
  // Mark request approved, then open the schedule creation modal pre-filled.
  if (status === "approved" && !request.schedule_id) {
    const confirmed = await showConfirm(
      "Setujui Permintaan Jadwal Baru",
      `${studentName} meminta jadwal baru.${
        request.requested_time
          ? `\nWaktu yang diminta: ${formatDate.toIndonesian(request.requested_time)}.`
          : ""
      }\n\nForm tambah jadwal akan terbuka ΓÇö lengkapi dan simpan untuk membuat jadwal.`,
      "warning",
    );
    if (!confirmed) return;

    await apiHandler.handle(
      sbClient
        .from("reschedule_requests")
        .update({
          status: "approved",
          admin_note: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
      async () => {
        await sendNotificationToStudent(
          request.student_id,
          "Permintaan jadwal disetujui",
          `Guru sedang membuatkan jadwal untukmu.${
            request.requested_time
              ? ` Waktu yang diminta (${formatDate.toIndonesian(request.requested_time)}) sedang diproses.`
              : ""
          }`,
        );
        toast(
          "Request disetujui ΓÇö buka form jadwal untuk melengkapi",
          "success",
        );
        await loadRequests();
      },
    );

    // Open schedule modal pre-filled with student + requested time
    openScheduleModal(
      null,
      request.student_id,
      request.requested_time
        ? formatDate.toDateTimeLocal(request.requested_time)
        : "",
    );
    return;
  }

  // ΓöÇΓöÇ CASE 4: Reject (any scenario) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (status === "rejected") {
    const confirmed = await showConfirm(
      "Tolak Request",
      `Tolak permintaan reschedule dari ${studentName} untuk "${scheduleTitle}"?`,
      "danger",
    );
    if (!confirmed) return;

    await apiHandler.handle(
      sbClient
        .from("reschedule_requests")
        .update({
          status: "rejected",
          admin_note: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
      async () => {
        // Revert reserved slot back to available so other students can pick it
        if (request.slot_id) {
          await sbClient
            .from("available_slots")
            .update({ status: "available", reserved_by: null, reserved_at: null })
            .eq("id", request.slot_id);
        }
        await sendNotificationToStudent(
          request.student_id,
          "Request reschedule ditolak",
          `Permintaan untuk kelas "${scheduleTitle}" ditolak.${
            adminNote
              ? ` Catatan guru: ${adminNote}`
              : " Silakan hubungi guru jika perlu jadwal lain."
          }`,
        );
        toast("Request ditolak", "success");
        await Promise.all([loadRequests(), loadSchedules(), loadAvailableSlots()]);
      },
    );
    return;
  }
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


// --- SHIMS: module functions called from student selection ---
// loadLearningPath in admin context = reload module progress for selected student
async function loadLearningPath() {
  await loadStudentModuleProgress();
}

async function enrollStudentInModule(studentId, moduleId) {
  await apiHandler.handle(
    sbClient.from("module_enrollments").insert([{ student_id: studentId, module_id: moduleId }]),
    async () => {
      toast("Siswa berhasil di-enroll ke modul", "success");
      await loadStudentModuleProgress();
    },
  );
}
