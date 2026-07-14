// js/pages/materi.js
// Premium student view for LMS modules, topics, quizzes, and exam unlock

let currentUser = null;
let enrollmentId = null;
let allModules = [];
let selectedModule = null;
let allTopics = [];
let completedTopicIds = new Set();
let topicProgressMap = {};

// ---------- Initialization ----------
async function initStudent() {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) { window.location.href = "index.html"; return; }
  currentUser = user;
  await loadModules();
}

document.addEventListener("DOMContentLoaded", initStudent);

// ---------- Module handling ----------
async function loadModules() {
  const { data, error } = await sbClient
    .from("modules")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error(error); showToast("Gagal memuat modul: " + error.message, "error"); return; }
  allModules = data || [];
  renderModules();
}

function renderModules() {
  const container = document.getElementById("moduleList");
  if (!container) return;
  if (!allModules.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📚</div><h3>Belum ada modul</h3><p>Guru belum menambahkan modul pembelajaran</p></div>`;
    return;
  }
  container.innerHTML = allModules.map(m => `
    <div class="module-card glass p-4 rounded-lg cursor-pointer" onclick="selectModule('${m.id}')">
      <h3 class="text-lg font-bold text-white">${esc(m.title)}</h3>
      <p class="text-sm text-gray-200 mt-1">${esc(m.description || "")}</p>
      <p class="text-xs mt-2" style="color:rgba(255,255,255,0.6)">Klik untuk mulai belajar →</p>
    </div>
  `).join("");
}

window.selectModule = async function (moduleId) {
  selectedModule = allModules.find(m => m.id === moduleId);
  if (!selectedModule) return;
  document.getElementById("moduleTitle").textContent = selectedModule.title;
  document.getElementById("moduleSection").classList.add("hidden");
  document.getElementById("topicSection").classList.remove("hidden");
  document.getElementById("examSection").classList.add("hidden");
  document.getElementById("quizSection").classList.add("hidden");
  await ensureEnrollment();
  await loadTopics();
  await loadProgress();
};

async function ensureEnrollment() {
  const { data, error } = await sbClient
    .from("module_enrollments")
    .select("id")
    .eq("student_id", currentUser.id)
    .eq("module_id", selectedModule.id)
    .maybeSingle();

  if (data && data.id) {
    enrollmentId = data.id;
  } else {
    const { data: ins, error: err } = await sbClient
      .from("module_enrollments")
      .insert([{ student_id: currentUser.id, module_id: selectedModule.id }])
      .select();
    if (err) { console.error(err); showToast("Gagal mendaftar ke modul", "error"); return; }
    enrollmentId = ins[0].id;
  }
}

// ---------- Topic handling ----------
async function loadTopics() {
  const { data, error } = await sbClient
    .from("topics")
    .select("*")
    .eq("module_id", selectedModule.id)
    .order("order_index", { ascending: true });
  if (error) { console.error(error); return; }
  allTopics = data || [];
  renderTopics();
}

function renderTopics() {
  const list = document.getElementById("topicList");
  if (!list) return;
  if (!allTopics.length) {
    list.innerHTML = `<p class="text-white text-center">Topik belum tersedia.</p>`;
    return;
  }
  list.innerHTML = allTopics.map((t, idx) => {
    const prog = topicProgressMap[t.id] || {};
    const done = !!prog.is_completed;
    const locked = !prog.is_unlocked;
    
    return `
      <div class="topic-card glass p-4 rounded-lg ${done ? 'opacity-70' : ''} ${locked ? 'opacity-40' : ''}">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-xs" style="color:rgba(255,255,255,0.6)">${done ? '✅ Selesai' : locked ? '🔒 Terkunci (Hadir kelas untuk buka)' : '📖 Tersedia'}</span>
            <h4 class="text-md font-semibold text-white mt-1">${esc(t.title)}</h4>
            ${t.content_url && !locked ? `<a href="${esc(t.content_url)}" target="_blank" rel="noopener" class="text-xs underline" style="color:rgba(255,255,255,0.7)">Buka materi →</a>` : ''}
          </div>
          <button
            class="btn btn-primary mt-2 text-sm"
            onclick="openTopic('${t.id}')"
            ${locked ? 'disabled title="Hadir kelas untuk membuka topik ini"' : ''}
            style="${locked ? 'opacity:0.5;cursor:not-allowed' : ''}"
          >${done ? 'Kuis Lagi' : 'Mulai Kuis'}</button>
        </div>
      </div>`;
  }).join("");
}

window.openTopic = async function (topicId) {
  const topic = allTopics.find(t => t.id === topicId);
  if (!topic) return;
  document.getElementById("quizTopicTitle").textContent = topic.title;
  await loadQuiz(topicId);
};

// ---------- Progress ----------
async function loadProgress() {
  const { data, error } = await sbClient
    .from("topic_progress")
    .select("topic_id, is_completed, is_unlocked")
    .eq("enrollment_id", enrollmentId);
    
  if (!error && data) {
    topicProgressMap = {};
    completedTopicIds = new Set();
    data.forEach(r => {
      topicProgressMap[r.topic_id] = r;
      if (r.is_completed) completedTopicIds.add(r.topic_id);
    });
  }
  updateProgressUI();
}

function updateProgressUI() {
  const total = allTopics.length;
  const completed = completedTopicIds.size;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}% (${completed}/${total} topik)`;

  const examSection = document.getElementById("examSection");
  if (examSection) {
    // Exam unlocked only when at least 12 topics completed (as requested)
    if (completed >= 12) {
      examSection.classList.remove("hidden");
    } else {
      examSection.classList.add("hidden");
    }
  }
  renderTopics();
}

// ---------- Quiz ----------
async function loadQuiz(topicId) {
  const { data, error } = await sbClient
    .from("questions")
    .select("*")
    .eq("parent_type", "topic_quiz")
    .eq("parent_id", topicId);

  if (error) { console.error(error); return; }

  if (!data || data.length === 0) {
    // No quiz for this topic — mark completed immediately
    await markTopicCompleted(topicId);
    await loadProgress();
    showToast("Topik selesai! (belum ada kuis)", "success");
    return;
  }
  renderQuiz(data, topicId);
}

function renderQuiz(questions, topicId) {
  const container = document.getElementById("quizContent");
  if (!container) return;

  const qHtml = questions.map((q, idx) => {
    const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    const optHtml = opts.map((opt, i) => `
      <label class="block mb-2 cursor-pointer">
        <input type="radio" name="q${idx}" value="${i}" class="mr-2"/>
        ${esc(opt)}
      </label>`).join("");
    return `
      <div class="mb-5">
        <p class="font-medium text-white mb-2">${idx + 1}. ${esc(q.question_text)}</p>
        ${optHtml}
      </div>`;
  }).join("");

  container.innerHTML = `
    <form id="quizForm" onsubmit="submitQuiz(event, '${topicId}')">
      ${qHtml}
      <button type="submit" class="btn btn-success mt-4">Kirim Jawaban</button>
    </form>`;

  // Store questions data for score calculation
  container.dataset.questions = JSON.stringify(questions);
  document.getElementById("quizSection").classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth" });
}

window.submitQuiz = async function (e, topicId) {
  e.preventDefault();
  const container = document.getElementById("quizContent");
  const questions = JSON.parse(container.dataset.questions || "[]");
  const form = e.target;

  let correctCount = 0;
  let allAnswered = true;

  questions.forEach((q, idx) => {
    const selected = form[`q${idx}`]?.value;
    if (selected === undefined || selected === "") { allAnswered = false; return; }
    if (parseInt(selected, 10) === q.correct_index) correctCount++;
  });

  if (!allAnswered) { showToast("Jawab semua pertanyaan terlebih dahulu", "error"); return; }

  const score = Math.round((correctCount / questions.length) * 100);

  // Insert quiz attempt with correct schema (student_id, topic_id, score)
  const { error: attemptErr } = await sbClient
    .from("quiz_attempts")
    .insert([{ student_id: currentUser.id, topic_id: topicId, score }]);
  if (attemptErr) console.error("quiz attempt error:", attemptErr);

  showToast(`Skor kuis: ${score}% (${correctCount}/${questions.length} benar) 🎉`, score >= 60 ? "success" : "error");

  // Mark topic as completed regardless of score (can adjust pass threshold later)
  await markTopicCompleted(topicId);
  document.getElementById("quizSection").classList.add("hidden");
  await loadProgress();
};

async function markTopicCompleted(topicId) {
  // Upsert to avoid duplicate key errors
  await sbClient.from("topic_progress").upsert(
    [{ enrollment_id: enrollmentId, topic_id: topicId, is_completed: true, completed_at: new Date().toISOString(), is_unlocked: true, unlocked_at: new Date().toISOString() }],
    { onConflict: "enrollment_id,topic_id" }
  );
}

// ---------- Exam ----------
window.startExam = async function () {
  const { data, error } = await sbClient
    .from("questions")
    .select("*")
    .eq("parent_type", "module_exam")
    .eq("parent_id", selectedModule.id);

  if (error) { console.error(error); showToast("Gagal memuat soal ujian", "error"); return; }

  if (!data || data.length === 0) {
    showToast("Soal ujian belum tersedia. Hubungi guru kamu.", "error");
    return;
  }

  renderExam(data);
};

function renderExam(questions) {
  const section = document.getElementById("examSection");
  const qHtml = questions.map((q, idx) => {
    const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    const optHtml = opts.map((opt, i) => `
      <label class="block mb-2 cursor-pointer">
        <input type="radio" name="eq${idx}" value="${i}" class="mr-2"/>
        ${esc(opt)}
      </label>`).join("");
    return `
      <div class="mb-5">
        <p class="font-medium text-white mb-2">${idx + 1}. ${esc(q.question_text)}</p>
        ${optHtml}
      </div>`;
  }).join("");

  section.innerHTML = `
    <h2 class="text-xl font-semibold text-white mb-4">🎓 Ujian Modul: ${esc(selectedModule.title)}</h2>
    <form id="examForm" onsubmit="submitExam(event)">
      ${qHtml}
      <button type="submit" class="btn btn-primary px-6 py-3 rounded-lg font-bold mt-4">Kumpulkan Ujian</button>
    </form>`;
  section.dataset.questions = JSON.stringify(questions);
  section.scrollIntoView({ behavior: "smooth" });
}

window.submitExam = async function (e) {
  e.preventDefault();
  const section = document.getElementById("examSection");
  const questions = JSON.parse(section.dataset.questions || "[]");
  const form = e.target;

  let correctCount = 0;
  let allAnswered = true;

  questions.forEach((q, idx) => {
    const selected = form[`eq${idx}`]?.value;
    if (selected === undefined || selected === "") { allAnswered = false; return; }
    if (parseInt(selected, 10) === q.correct_index) correctCount++;
  });

  if (!allAnswered) { showToast("Jawab semua soal terlebih dahulu", "error"); return; }

  const score = Math.round((correctCount / questions.length) * 100);

  const { error: examErr } = await sbClient
    .from("exam_attempts")
    .insert([{ student_id: currentUser.id, module_id: selectedModule.id, score }]);
  if (examErr) console.error("exam attempt error:", examErr);

  section.innerHTML = `
    <div class="glass p-8 rounded-xl text-center">
      <div class="text-5xl mb-4">${score >= 70 ? '🏆' : '📝'}</div>
      <h2 class="text-2xl font-bold text-white mb-2">${score >= 70 ? 'Selamat!' : 'Coba Lagi'}</h2>
      <p class="text-white text-lg">Nilai ujian kamu: <strong>${score}%</strong></p>
      <p class="text-gray-200 mt-2">${correctCount} dari ${questions.length} soal benar</p>
      ${score >= 70 ? '<p class="text-green-300 mt-4">✅ Modul ini berhasil kamu selesaikan!</p>' : '<p class="text-yellow-300 mt-4">Nilai minimum kelulusan 70%. Pelajari kembali materi dan coba lagi.</p>'}
      <button onclick="window.location.reload()" class="btn btn-primary mt-6 px-6 py-3 rounded-lg">Kembali ke Modul</button>
    </div>`;
};

// ---------- Utilities ----------
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showToast(msg, type = "info") {
  // Use shared helpers.js toast if available, else fallback
  if (typeof toast === "function") { toast(msg, type); return; }
  const container = document.querySelector(".toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "toast-container";
    document.body.appendChild(el);
    return el;
  })();
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 4000);
}

async function logout() {
  await sbClient.auth.signOut();
  window.location.href = "index.html";
}
