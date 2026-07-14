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
  if (data) {
    allSlots = data;
  }
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

  // Add available slots
  allSlots.forEach((slot) => {
    if (slot.status === "available") {
      events.push({
        id: `slot-${slot.id}`,
        title: `[Slot Kosong]`,
        start: slot.start_time,
        color: "#10b981", // Beautiful emerald green
        classNames: ["status-upcoming"],
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


// =============================================================
// --- MODULE MANAGEMENT (Admin) ---
// =============================================================

let allModules = []; // cached module library

async function loadModuleLibrary() {
  const data = await apiHandler.handle(
    sbClient.from('modules').select('*, topics(id, title, order_index)').order('created_at', { ascending: true }),
  );
  if (data === null) return;
  allModules = data;

  const list = document.getElementById('moduleLibraryList');
  if (!list) return;

  if (!allModules.length) {
    list.innerHTML = `<div class="empty-state">${icon('book-open', 'icon-lg')}<h3>Belum ada modul</h3><p>Klik "Buat Modul" untuk memulai</p></div>`;
    refreshIcons();
    return;
  }

  list.innerHTML = allModules.map(m => {
    const topicCount = m.topics?.length || 0;
    const topicList = (m.topics || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(t => `
        <div class="flex justify-between items-center py-1 px-2 rounded" style="background:var(--glass-bg)">
          <span class="text-sm text-secondary">${esc(t.title)}</span>
          <button onclick="openQuizModal('topic_quiz','${t.id}','${esc(t.title)}')" class="btn glass px-2 py-1 rounded text-xs">
            ${icon('help-circle')} Kuis
          </button>
        </div>`).join('');

    return `
      <div class="item-row">
        <div class="flex justify-between items-start gap-3 flex-wrap">
          <div style="flex:1;min-width:0">
            <h3 class="font-bold text-primary">${esc(m.title)}</h3>
            ${m.description ? `<p class="text-secondary text-sm mt-1">${esc(m.description)}</p>` : ''}
            <div class="meta-line mt-2">
              <span>${icon('layers')} ${topicCount}/12 topik</span>
              ${topicCount >= 12 ? `<span class="text-success">${icon('check-circle')} Lengkap</span>` : `<span class="text-warning">${icon('alert-circle')} Belum lengkap</span>`}
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button onclick="openQuizModal('module_exam','${m.id}','${esc(m.title)} — Ujian')" class="btn btn-warning px-3 py-2 rounded-lg text-sm">
              ${icon('file-check')} Ujian
            </button>
            <button onclick="deleteModuleById('${m.id}')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">
              ${icon('trash-2')} Hapus
            </button>
          </div>
        </div>
        ${topicList ? `<div class="mt-3 space-y-1">${topicList}</div>` : ''}
      </div>`;
  }).join('');
  refreshIcons();
}

function openModuleModal() {
  document.getElementById('editModuleId').value = '';
  document.getElementById('moduleName').value = '';
  document.getElementById('moduleDescription').value = '';
  const topicContainer = document.getElementById('topicInputs');
  if (topicContainer) topicContainer.innerHTML = '';
  // Pre-populate 12 blank topic rows
  for (let i = 0; i < 12; i++) addTopicField();
  openModal('moduleModal');
  refreshIcons();
}

function addTopicField() {
  const container = document.getElementById('topicInputs');
  if (!container) return;
  const current = container.querySelectorAll('.topic-group').length;
  if (current >= 12) { toast('Maksimal 12 topik per modul', 'error'); return; }
  const idx = current + 1;
  const div = document.createElement('div');
  div.className = 'topic-group flex gap-2 items-center';
  div.innerHTML = `
    <span class="text-secondary text-sm font-bold" style="min-width:22px">${idx}.</span>
    <input class="topic-title input-field flex-1 px-3 py-2 rounded-lg text-sm" placeholder="Judul Topik ${idx}" />
    <input class="topic-url input-field flex-1 px-3 py-2 rounded-lg text-sm" placeholder="URL Materi (opsional)" />
    <button type="button" onclick="this.closest('.topic-group').remove()" class="btn btn-danger px-2 py-2 rounded-lg text-xs">${icon('x')}</button>
  `;
  container.appendChild(div);
  refreshIcons();
}

async function saveModule() {
  const title = document.getElementById('moduleName').value.trim();
  const description = document.getElementById('moduleDescription').value.trim();
  if (!title) { toast('Nama modul wajib diisi', 'error'); return; }

  const topicGroups = document.querySelectorAll('#topicInputs .topic-group');
  const topics = [];
  topicGroups.forEach((group, idx) => {
    const tTitle = group.querySelector('.topic-title')?.value.trim();
    const tUrl = group.querySelector('.topic-url')?.value.trim();
    if (tTitle) topics.push({ title: tTitle, content_url: tUrl || null, order_index: idx + 1 });
  });

  if (topics.length === 0) { toast('Tambahkan minimal 1 topik', 'error'); return; }
  if (topics.length > 12) { toast('Maksimal 12 topik per modul', 'error'); return; }

  const btn = document.getElementById('saveModuleBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; }

  try {
    const { data: modData, error: modError } = await sbClient
      .from('modules')
      .insert([{ title, description: description || null }])
      .select();
    if (modError) throw modError;
    const newModule = modData[0];

    const topicInserts = topics.map(t => ({ module_id: newModule.id, ...t }));
    const { error: topicError } = await sbClient.from('topics').insert(topicInserts);
    if (topicError) throw topicError;

    toast('Modul berhasil dibuat! Tambahkan kuis untuk setiap topik.', 'success');
    closeModal('moduleModal');
    await loadModuleLibrary();
  } catch (e) {
    console.error(e);
    toast(e.message || 'Gagal menyimpan modul', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `${icon('save')} Simpan Modul`; refreshIcons(); }
  }
}

async function deleteModuleById(moduleId) {
  if (await showConfirm('Hapus Modul', 'Yakin hapus modul ini beserta semua topik dan kuisnya?', 'danger')) {
    await apiHandler.handle(
      sbClient.from('modules').delete().eq('id', moduleId),
      async () => { toast('Modul dihapus', 'success'); await loadModuleLibrary(); },
    );
  }
}

// =============================================================
// --- QUIZ & EXAM MANAGEMENT ---
// =============================================================

function openQuizModal(parentType, parentId, label) {
  document.getElementById('quizParentType').value = parentType;
  document.getElementById('quizParentId').value = parentId;
  document.getElementById('quizModalTitle').textContent =
    parentType === 'module_exam' ? `Soal Ujian: ${label}` : `Kuis Topik: ${label}`;
  document.getElementById('quizModalSubtitle').textContent =
    parentType === 'module_exam'
      ? 'Pertanyaan ujian modul. Ujian terbuka setelah siswa menyelesaikan 12 topik.'
      : 'Pertanyaan kuis untuk topik ini. Siswa harus mengerjakan kuis untuk menyelesaikan topik.';
  document.getElementById('quizQuestions').innerHTML = '';
  addQuestionField(); // start with one blank question
  openModal('quizModal');
  refreshIcons();
}

function addQuestionField() {
  const container = document.getElementById('quizQuestions');
  if (!container) return;
  const qNum = container.querySelectorAll('.question-block').length + 1;
  const div = document.createElement('div');
  div.className = 'question-block item-row';
  div.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-primary text-sm">Soal ${qNum}</span>
      <button type="button" onclick="this.closest('.question-block').remove()" class="btn btn-danger px-2 py-1 rounded text-xs">${icon('trash-2')} Hapus</button>
    </div>
    <input class="q-text input-field w-full px-3 py-2 rounded-lg text-sm mb-2" placeholder="Teks pertanyaan..." />
    <div class="space-y-1 q-options">
      ${['A','B','C','D'].map((letter, i) => `
        <div class="flex items-center gap-2">
          <input type="radio" name="correct_q${qNum}" value="${i}" class="q-correct" />
          <span class="text-secondary text-sm font-bold">${letter}.</span>
          <input class="opt-input input-field flex-1 px-3 py-2 rounded-lg text-sm" placeholder="Jawaban ${letter}" />
        </div>`).join('')}
    </div>
    <p class="text-secondary text-xs mt-2">${icon('info')} Pilih radio button di kiri untuk menandai jawaban benar</p>
  `;
  container.appendChild(div);
  refreshIcons();
}

async function saveQuizQuestions() {
  const parentType = document.getElementById('quizParentType').value;
  const parentId = document.getElementById('quizParentId').value;
  const blocks = document.querySelectorAll('#quizQuestions .question-block');

  if (!blocks.length) { toast('Tambahkan minimal 1 pertanyaan', 'error'); return; }

  const inserts = [];
  let valid = true;
  blocks.forEach((block, idx) => {
    const qText = block.querySelector('.q-text')?.value.trim();
    const optInputs = block.querySelectorAll('.opt-input');
    const options = Array.from(optInputs).map(el => el.value.trim());
    const correctRadio = block.querySelector('.q-correct:checked');

    if (!qText || options.some(o => !o) || !correctRadio) {
      toast(`Soal ${idx + 1}: Isi pertanyaan, semua opsi, dan pilih jawaban benar`, 'error');
      valid = false;
      return;
    }
    inserts.push({
      parent_type: parentType,
      parent_id: parentId,
      question_text: qText,
      options: JSON.stringify(options),
      correct_index: parseInt(correctRadio.value, 10),
    });
  });

  if (!valid) return;

  await apiHandler.handle(
    sbClient.from('questions').insert(inserts),
    () => {
      toast(`${inserts.length} pertanyaan berhasil disimpan`, 'success');
      closeModal('quizModal');
    },
  );
}

// =============================================================
// --- STUDENT MODULE PROGRESS ---
// =============================================================

async function loadStudentModuleProgress() {
  const studentId = document.getElementById('studentSelect').value;
  const container = document.getElementById('studentModuleProgress');
  if (!container) return;

  if (!studentId) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><h3>Pilih siswa</h3><p>Pilih siswa untuk melihat progress modul mereka</p></div>`;
    return;
  }

  const data = await apiHandler.handle(
    sbClient
      .from('module_enrollments')
      .select('id, status, enrolled_at, modules(id, title, description), topic_progress(id, is_completed, topic_id)')
      .eq('student_id', studentId),
  );

  // Also get all available modules for enrollment
  const allMods = allModules.length ? allModules : await apiHandler.handle(
    sbClient.from('modules').select('id, title'),
  ) || [];

  if (!data || data.length === 0) {
    // Show enrollment options
    const enrollOptions = allMods.map(m => `
      <div class="item-row flex justify-between items-center">
        <span class="font-bold text-primary">${esc(m.title)}</span>
        <button onclick="enrollStudentInModule('${studentId}','${m.id}')" class="btn btn-success px-3 py-2 rounded-lg text-sm">
          ${icon('user-plus')} Enroll
        </button>
      </div>`).join('');
    container.innerHTML = `
      <p class="text-secondary text-sm mb-3">Siswa belum terdaftar di modul manapun. Pilih modul untuk di-enroll:</p>
      ${enrollOptions || `<div class="empty-state">${icon('book-open','icon-lg')}<h3>Belum ada modul</h3></div>`}`;
    refreshIcons();
    return;
  }

  // Render enrolled modules with progress
  const enrolledModuleIds = data.map(e => e.modules?.id).filter(Boolean);
  const unenrolledMods = allMods.filter(m => !enrolledModuleIds.includes(m.id));

  const enrolledHtml = data.map(enrollment => {
    const completed = enrollment.topic_progress?.filter(tp => tp.is_completed).length || 0;
    const totalTopics = 12;
    const pct = Math.round((completed / totalTopics) * 100);
    const allDone = completed >= totalTopics;

    return `
      <div class="item-row">
        <div class="flex justify-between items-start gap-3">
          <div style="flex:1">
            <h3 class="font-bold text-primary">${esc(enrollment.modules?.title || 'Modul')}</h3>
            <div class="meta-line mt-1">
              <span>${icon('layers')} ${completed}/${totalTopics} topik selesai</span>
              ${allDone ? `<span class="text-success">${icon('award')} Ujian terbuka</span>` : ''}
            </div>
            <div class="progress-bar mt-2" style="height:6px;background:var(--glass-border);border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:3px;transition:width 0.5s ease"></div>
            </div>
            <p class="text-secondary text-xs mt-1">${pct}% selesai</p>
          </div>
          <span class="status-pill ${enrollment.status === 'completed' ? 'status-success' : 'status-info'}">${enrollment.status}</span>
        </div>
      </div>`;
  }).join('');

  const unenrolledHtml = unenrolledMods.length ? `
    <div class="divider"></div>
    <p class="text-secondary text-sm mb-2">Modul belum di-enroll:</p>
    ${unenrolledMods.map(m => `
      <div class="item-row flex justify-between items-center">
        <span class="font-bold text-primary">${esc(m.title)}</span>
        <button onclick="enrollStudentInModule('${studentId}','${m.id}')" class="btn btn-success px-3 py-2 rounded-lg text-sm">
          ${icon('user-plus')} Enroll
        </button>
      </div>`).join('')}` : '';

  container.innerHTML = enrolledHtml + unenrolledHtml;
  refreshIcons();
}

async function enrollStudentInModule(studentId, moduleId) {
  await apiHandler.handle(
    sbClient.from('module_enrollments').insert([{ student_id: studentId, module_id: moduleId }]),
    async () => {
      toast('Siswa berhasil di-enroll ke modul', 'success');
      await loadStudentModuleProgress();
    },
  );
}

// =============================================================
// --- BACKWARD-COMPAT: loadLearningPath (no-op for admin tab) ---
// =============================================================
async function loadLearningPath() {
  // In the new schema the admin "Materi" tab uses loadModuleLibrary + loadStudentModuleProgress.
  // This shim keeps any lingering call-sites from throwing ReferenceErrors.
  await loadModuleLibrary();
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
              ? `<p class="text-warning text-xs mt-2">${icon("alert-triangle")} Waktu tidak spesifik — jadwal tidak akan berubah otomatis jika disetujui.</p>`
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

  // ── CASE 1: Approve with schedule_id + requested_time ──────────────────────
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
      "Jadwal berhasil dipindahkan ✅",
      `Permintaan reschedule kelas "${scheduleTitle}" disetujui. Jadwal baru: ${newTime}.`,
    );
    toast("Jadwal otomatis diperbarui & notifikasi terkirim", "success");
    await Promise.all([loadRequests(), loadSchedules(), loadAvailableSlots()]);
    return;
  }

  // ── CASE 2: Approve with schedule_id but NO requested_time ─────────────────
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
        toast("Request disetujui — ingat ubah jadwal secara manual", "success");
        await Promise.all([loadRequests(), loadSchedules()]);
      },
    );
    return;
  }

  // ── CASE 3: Approve with NO schedule_id ────────────────────────────────────
  // Student is requesting a brand-new class (no existing schedule linked).
  // Mark request approved, then open the schedule creation modal pre-filled.
  if (status === "approved" && !request.schedule_id) {
    const confirmed = await showConfirm(
      "Setujui Permintaan Jadwal Baru",
      `${studentName} meminta jadwal baru.${
        request.requested_time
          ? `\nWaktu yang diminta: ${formatDate.toIndonesian(request.requested_time)}.`
          : ""
      }\n\nForm tambah jadwal akan terbuka — lengkapi dan simpan untuk membuat jadwal.`,
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
          "Request disetujui — buka form jadwal untuk melengkapi",
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

  // ── CASE 4: Reject (any scenario) ──────────────────────────────────────────
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
        await Promise.all([loadRequests(), loadSchedules()]);
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

