// =========================================
// MODULE MANAGER
// Admin utilities: create/edit modules,
// topics, quiz questions, and enrollments
// Depends on: sbClient (from supabase.js)
//             toast, showConfirm (from helpers.js / shared-ui.js)
// =========================================

// =========================================
// MODULE LIBRARY (admin view)
// =========================================
async function loadModuleLibrary() {
  const list = document.getElementById("moduleLibraryList");
  if (!list) return;

  const { data: modules, error } = await sbClient
    .from("modules")
    .select("id, title, description")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error loading modules:", error);
    list.innerHTML = `<p class="text-secondary text-center">Gagal memuat modul.</p>`;
    return;
  }

  if (!modules || modules.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i data-lucide="book-open" class="icon-lg"></i>
        <h3>Belum ada modul</h3>
        <p>Buat modul pertama Anda</p>
      </div>`;
    refreshIcons();
    return;
  }

  list.innerHTML = modules.map(m => `
    <div class="glass p-4 rounded-lg">
      <div class="flex justify-between items-start gap-3 flex-wrap">
        <div style="flex:1">
          <h3 class="font-bold text-primary">${escHtml(m.title)}</h3>
          ${m.description ? `<p class="text-secondary text-sm mt-1">${escHtml(m.description)}</p>` : ''}
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="openQuizModal('module_exam','${m.id}')" class="btn glass px-3 py-2 rounded-lg text-sm">
            <i data-lucide="file-question" class="icon-sm"></i> Soal Ujian
          </button>
          <button onclick="openModuleModal('${m.id}')" class="btn btn-primary px-3 py-2 rounded-lg text-sm">
            <i data-lucide="pencil" class="icon-sm"></i> Edit
          </button>
          <button onclick="deleteModule('${m.id}')" class="btn btn-danger px-3 py-2 rounded-lg text-sm">
            <i data-lucide="trash-2" class="icon-sm"></i>
          </button>
        </div>
      </div>
      <div id="topicList-${m.id}" class="mt-3 space-y-2"></div>
      <button onclick="loadModuleTopics('${m.id}')" class="btn glass px-3 py-2 rounded-lg text-sm mt-2">
        <i data-lucide="list" class="icon-sm"></i> Lihat Topik
      </button>
    </div>`).join("");

  refreshIcons();
}

// =========================================
// TOPIC LIST (inline under module)
// =========================================
async function loadModuleTopics(moduleId) {
  const container = document.getElementById(`topicList-${moduleId}`);
  if (!container) return;

  const { data: topics, error } = await sbClient
    .from("topics")
    .select("id, title, order_index, content_url")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) { console.error(error); return; }

  if (!topics || topics.length === 0) {
    container.innerHTML = `<p class="text-secondary text-sm">Belum ada topik.</p>`;
    return;
  }

  container.innerHTML = topics.map(t => `
    <div class="glass p-3 rounded-lg flex justify-between items-center gap-2">
      <span class="text-sm text-primary">${t.order_index}. ${escHtml(t.title)}</span>
      <button onclick="openQuizModal('topic_quiz','${t.id}')" class="btn glass px-2 py-1 rounded text-xs">
        Kuis
      </button>
    </div>`).join("");
}

// =========================================
// MODULE MODAL (create / edit)
// =========================================
function openModuleModal(moduleId = null) {
  const modal = document.getElementById("moduleModal");
  if (!modal) return;

  document.getElementById("editModuleId").value = moduleId || "";
  document.getElementById("moduleName").value = "";
  document.getElementById("moduleDescription").value = "";
  document.getElementById("topicInputs").innerHTML = "";

  if (moduleId) {
    loadModuleForEdit(moduleId);
  } else {
    // Add one empty topic row by default
    addTopicField();
  }

  openModal("moduleModal");
}

async function loadModuleForEdit(moduleId) {
  const { data: mod, error: modErr } = await sbClient
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (modErr || !mod) return;

  document.getElementById("moduleName").value = mod.title;
  document.getElementById("moduleDescription").value = mod.description || "";

  const { data: topics } = await sbClient
    .from("topics")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  (topics || []).forEach(t => addTopicField(t.title, t.content_url, t.id));
}

function addTopicField(title = "", contentUrl = "", topicId = "") {
  const inputs = document.getElementById("topicInputs");
  if (!inputs) return;

  const count = inputs.children.length + 1;
  if (count > 12) { toast("Maksimal 12 topik per modul", "error"); return; }

  const div = document.createElement("div");
  div.className = "flex gap-2 items-center";
  div.innerHTML = `
    <span class="text-secondary text-sm w-5 shrink-0">${count}.</span>
    <input type="hidden" class="topic-id" value="${escHtml(topicId)}"/>
    <input type="text" class="topic-title input-field px-3 py-2 rounded-lg flex-1 text-sm" placeholder="Judul topik" value="${escHtml(title)}"/>
    <input type="url" class="topic-url input-field px-3 py-2 rounded-lg flex-1 text-sm" placeholder="URL materi (opsional)" value="${escHtml(contentUrl)}"/>
    <button type="button" onclick="this.parentElement.remove()" class="btn btn-danger px-2 py-2 rounded-lg text-xs">✕</button>`;
  inputs.appendChild(div);
}

async function saveModule() {
  const btn = document.getElementById("saveModuleBtn");
  const moduleId = document.getElementById("editModuleId").value;
  const title = document.getElementById("moduleName").value.trim();
  const description = document.getElementById("moduleDescription").value.trim();

  if (!title) { toast("Nama modul wajib diisi", "error"); return; }

  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    let finalModuleId = moduleId;

    if (moduleId) {
      // Update existing
      const { error } = await sbClient
        .from("modules")
        .update({ title, description: description || null })
        .eq("id", moduleId);
      if (error) throw error;
    } else {
      // Insert new
      const { data, error } = await sbClient
        .from("modules")
        .insert([{ title, description: description || null }])
        .select();
      if (error) throw error;
      finalModuleId = data[0].id;
    }

    // Save topics
    const topicRows = document.querySelectorAll("#topicInputs > div");
    for (let i = 0; i < topicRows.length; i++) {
      const row = topicRows[i];
      const topicId = row.querySelector(".topic-id")?.value;
      const topicTitle = row.querySelector(".topic-title")?.value.trim();
      const topicUrl = row.querySelector(".topic-url")?.value.trim() || null;
      if (!topicTitle) continue;

      if (topicId) {
        await sbClient.from("topics")
          .update({ title: topicTitle, content_url: topicUrl, order_index: i + 1 })
          .eq("id", topicId);
      } else {
        await sbClient.from("topics")
          .insert([{ module_id: finalModuleId, title: topicTitle, content_url: topicUrl, order_index: i + 1 }]);
      }
    }

    toast(moduleId ? "Modul berhasil diperbarui" : "Modul berhasil dibuat", "success");
    closeModal("moduleModal");
    await loadModuleLibrary();
    await loadStudentModuleProgress();
  } catch (err) {
    console.error(err);
    toast(err.message || "Gagal menyimpan modul", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="save" class="icon-sm"></i> Simpan Modul`;
    refreshIcons();
  }
}

async function deleteModule(moduleId) {
  if (!await showConfirm("Hapus Modul", "Yakin hapus modul ini beserta semua topiknya?", "danger")) return;

  const { error } = await sbClient.from("modules").delete().eq("id", moduleId);
  if (error) { toast(error.message, "error"); return; }

  toast("Modul dihapus", "success");
  await loadModuleLibrary();
}

// =========================================
// QUIZ / EXAM QUESTION MODAL (admin)
// =========================================
function openQuizModal(parentType, parentId) {
  document.getElementById("quizParentType").value = parentType;
  document.getElementById("quizParentId").value = parentId;
  document.getElementById("quizQuestions").innerHTML = "";
  document.getElementById("quizModalSubtitle").textContent =
    parentType === "module_exam" ? "Soal Ujian Akhir Modul" : "Soal Kuis Topik";
  loadExistingQuizQuestions(parentType, parentId);
  openModal("quizModal");
}

async function loadExistingQuizQuestions(parentType, parentId) {
  const { data, error } = await sbClient
    .from("questions")
    .select("*")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId);

  if (error) return;
  (data || []).forEach(q => addQuestionField(q));
}

function addQuestionField(existing = null) {
  const container = document.getElementById("quizQuestions");
  if (!container) return;

  const idx = container.children.length;
  const opts = existing?.options
    ? (typeof existing.options === "string" ? JSON.parse(existing.options) : existing.options)
    : ["", "", "", ""];

  const optInputs = opts.map((o, i) => `
    <div class="flex items-center gap-2">
      <input type="radio" name="correct-${idx}" value="${i}"
        ${existing?.correct_index === i ? "checked" : ""}
        class="w-4 h-4"/>
      <input type="text" class="option-text input-field px-3 py-2 rounded-lg flex-1 text-sm"
        placeholder="Pilihan ${String.fromCharCode(65 + i)}" value="${escHtml(o)}"/>
    </div>`).join("");

  const div = document.createElement("div");
  div.className = "glass p-4 rounded-lg space-y-3";
  div.innerHTML = `
    <input type="hidden" class="question-id" value="${existing?.id || ''}"/>
    <div class="flex justify-between items-center">
      <span class="text-sm font-semibold text-primary">Soal ${idx + 1}</span>
      <button type="button" onclick="this.closest('.glass').remove()" class="btn btn-danger px-2 py-1 rounded text-xs">✕</button>
    </div>
    <textarea class="question-text input-field w-full px-3 py-2 rounded-lg text-sm" rows="2"
      placeholder="Teks pertanyaan">${escHtml(existing?.question_text || '')}</textarea>
    <div class="space-y-2">
      <p class="text-xs text-secondary">Pilih jawaban benar (radio):</p>
      ${optInputs}
    </div>`;
  container.appendChild(div);
}

async function saveQuizQuestions() {
  const parentType = document.getElementById("quizParentType").value;
  const parentId = document.getElementById("quizParentId").value;
  const rows = document.querySelectorAll("#quizQuestions > .glass");

  const upserts = [];
  for (const row of rows) {
    const questionId = row.querySelector(".question-id")?.value;
    const questionText = row.querySelector(".question-text")?.value.trim();
    const optInputs = row.querySelectorAll(".option-text");
    const options = Array.from(optInputs).map(i => i.value.trim());
    const correctRadio = row.querySelector(`input[type="radio"]:checked`);
    const correctIndex = correctRadio ? parseInt(correctRadio.value, 10) : 0;

    if (!questionText) continue;
    upserts.push({
      ...(questionId ? { id: questionId } : {}),
      parent_type: parentType,
      parent_id: parentId,
      question_text: questionText,
      options: JSON.stringify(options),
      correct_index: correctIndex,
    });
  }

  if (!upserts.length) { toast("Tidak ada soal untuk disimpan", "error"); return; }

  const { error } = await sbClient.from("questions").upsert(upserts, { onConflict: "id" });
  if (error) { toast(error.message, "error"); return; }

  toast("Soal berhasil disimpan", "success");
  closeModal("quizModal");
}

// =========================================
// STUDENT MODULE PROGRESS (admin view)
// =========================================
async function loadStudentModuleProgress() {
  const select = document.getElementById("studentSelect");
  const container = document.getElementById("studentModuleProgress");
  if (!select || !container) return;

  const studentId = select.value;
  if (!studentId) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📊</div>
        <h3>Pilih siswa</h3>
        <p>Pilih siswa untuk melihat progress modul mereka</p>
      </div>`;
    return;
  }

  const { data: enrollments, error } = await sbClient
    .from("module_enrollments")
    .select(`
      id, status, enrolled_at,
      modules(id, title),
      topic_progress(id, is_completed)
    `)
    .eq("student_id", studentId);

  if (error) { console.error(error); return; }

  if (!enrollments || enrollments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📚</div>
        <h3>Belum ada enrollment</h3>
        <p>Siswa belum terdaftar ke modul apapun</p>
      </div>
      <button onclick="enrollStudentToModule('${studentId}')" class="btn btn-primary px-4 py-3 rounded-lg font-semibold mt-4 w-full">
        + Daftarkan ke Modul
      </button>`;
    return;
  }

  container.innerHTML = enrollments.map(e => {
    const done = e.topic_progress?.filter(tp => tp.is_completed).length || 0;
    const pct = Math.round((done / 12) * 100);
    return `
      <div class="glass p-4 rounded-lg">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div style="flex:1">
            <h3 class="font-bold text-primary">${escHtml(e.modules?.title || 'Modul')}</h3>
            <div class="flex items-center gap-2 mt-2">
              <div style="flex:1;height:6px;background:var(--glass-border,#333);border-radius:3px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:var(--accent,#6366f1);border-radius:3px;transition:width 0.5s ease"></div>
              </div>
              <span class="text-secondary text-xs">${done}/12 topik</span>
            </div>
          </div>
          <span class="status-pill ${e.status === 'enrolled' ? 'status-success' : 'status-info'}">${e.status}</span>
        </div>
      </div>`;
  }).join("") + `
    <button onclick="enrollStudentToModule('${studentId}')" class="btn btn-primary px-4 py-3 rounded-lg font-semibold mt-4 w-full">
      + Tambah Modul
    </button>`;
}

async function enrollStudentToModule(studentId) {
  // Get all modules
  const { data: modules, error } = await sbClient
    .from("modules")
    .select("id, title")
    .order("title");

  if (error || !modules?.length) {
    toast("Belum ada modul tersedia", "error");
    return;
  }

  // Build a simple select prompt via showConfirm alternative
  // For now: enroll to first unenrolled module
  const { data: existing } = await sbClient
    .from("module_enrollments")
    .select("module_id")
    .eq("student_id", studentId);

  const enrolledIds = new Set((existing || []).map(e => e.module_id));
  const available = modules.filter(m => !enrolledIds.has(m.id));

  if (!available.length) {
    toast("Siswa sudah terdaftar ke semua modul", "error");
    return;
  }

  // Enroll to the first available module
  const target = available[0];
  const { data: enrollment, error: enrollErr } = await sbClient
    .from("module_enrollments")
    .insert([{ student_id: studentId, module_id: target.id, status: "enrolled" }])
    .select();

  if (enrollErr) { toast(enrollErr.message, "error"); return; }

  // Create topic_progress rows for each topic in this module
  const { data: topics } = await sbClient
    .from("topics")
    .select("id, order_index")
    .eq("module_id", target.id)
    .order("order_index");

  if (topics?.length && enrollment?.[0]) {
    const progressRows = topics.map((t, idx) => ({
      enrollment_id: enrollment[0].id,
      topic_id: t.id,
      is_completed: false,
      is_unlocked: idx === 0, // unlock first topic immediately
    }));
    await sbClient.from("topic_progress").insert(progressRows);
  }

  toast(`Siswa berhasil didaftarkan ke modul "${target.title}"`, "success");
  await loadStudentModuleProgress();
}
