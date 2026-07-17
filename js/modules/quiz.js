// =========================================
// QUIZ / EXAM / TOPIC MODULE
// Handles: module navigation, topic list,
//          topic quiz, and module final exam
// Depends on: sbClient, currentProfile (from supabase.js)
//             escHtml, toast, refreshIcons (from helpers.js)
//             allEnrollments (declared in student.js)
// NOTE: loadLearningPath() lives in student.js — do not redeclare here.
// =========================================

// ---- Quiz-specific state (separate from student.js globals) ----
let selectedModule = null;
let allTopics = [];
let completedTopicIds = new Set();
let topicProgressMap = {};
let currentEnrollmentId = null;

// =========================================
// MODULE VIEW
// =========================================
window.openModule = async function (moduleId) {
  const enrollment = allEnrollments.find(e => String(e.modules?.id) === String(moduleId));
  if (!enrollment || !enrollment.modules) return;

  selectedModule = enrollment.modules;
  currentEnrollmentId = enrollment.id;

  document.getElementById("moduleTitle").textContent = selectedModule.title;
  document.getElementById("learningPathSection").classList.add("hidden");
  document.getElementById("topicSection").classList.remove("hidden");
  document.getElementById("examSection").classList.add("hidden");
  document.getElementById("quizSection").classList.add("hidden");

  await loadTopics();
  await loadProgress();
};

window.backToModules = function () {
  document.getElementById("learningPathSection").classList.remove("hidden");
  document.getElementById("topicSection").classList.add("hidden");
  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("examSection").classList.add("hidden");
};

// =========================================
// TOPICS
// =========================================
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
    list.innerHTML = `<p class="text-secondary text-center">Topik belum tersedia.</p>`;
    return;
  }

  list.innerHTML = allTopics.map((t) => {
    const prog = topicProgressMap[t.id] || {};
    const done = !!prog.is_completed;
    const locked = !prog.is_unlocked;

    return `
      <div class="glass p-4 rounded-lg ${done ? 'opacity-70' : ''} ${locked ? 'opacity-40' : ''}">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-xs" style="color:var(--text-secondary)">
              ${done ? '✅ Selesai' : locked ? '🔒 Terkunci (Hadir kelas untuk buka)' : '📖 Tersedia'}
            </span>
            <h4 class="text-md font-semibold text-primary mt-1">${escHtml(t.title)}</h4>
            ${t.content_url && !locked
              ? `<a href="${escHtml(t.content_url)}" target="_blank" rel="noopener" class="text-xs underline text-secondary">Buka materi →</a>`
              : ''}
          </div>
          <button
            class="btn btn-primary mt-2 text-sm px-3 py-2 rounded-lg"
            onclick="openTopic('${t.id}')"
            ${locked ? 'disabled title="Hadir kelas untuk membuka topik ini"' : ''}
            style="${locked ? 'opacity:0.5;cursor:not-allowed' : ''}"
          >${done ? 'Kuis Lagi' : 'Mulai Kuis'}</button>
        </div>
      </div>`;
  }).join("");
}

// =========================================
// TOPIC PROGRESS
// =========================================
async function loadProgress() {
  const { data, error } = await sbClient
    .from("topic_progress")
    .select("topic_id, is_completed, is_unlocked")
    .eq("enrollment_id", currentEnrollmentId);

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

  const fill = document.getElementById("moduleProgressFill");
  const text = document.getElementById("moduleProgressText");
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}% (${completed}/${total} topik)`;

  const examSection = document.getElementById("examSection");
  if (examSection) {
    examSection.classList.toggle("hidden", completed < 12);
  }
  renderTopics();
}

async function markTopicCompleted(topicId) {
  await sbClient.from("topic_progress").upsert(
    [{
      enrollment_id: currentEnrollmentId,
      topic_id: topicId,
      is_completed: true,
      completed_at: new Date().toISOString(),
      is_unlocked: true,
      unlocked_at: new Date().toISOString(),
    }],
    { onConflict: "enrollment_id,topic_id" }
  );
}

// =========================================
// QUIZ
// =========================================
window.openTopic = async function (topicId) {
  const topic = allTopics.find(t => t.id === topicId);
  if (!topic) return;
  document.getElementById("quizTopicTitle").textContent = topic.title;
  await loadQuiz(topicId);
};

async function loadQuiz(topicId) {
  const { data, error } = await sbClient
    .from("questions")
    .select("*")
    .eq("parent_type", "topic_quiz")
    .eq("parent_id", topicId);

  if (error) { console.error(error); return; }

  if (!data || data.length === 0) {
    // No questions — mark completed automatically
    await markTopicCompleted(topicId);
    await loadProgress();
    toast("Topik selesai! (belum ada kuis)", "success");
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
      <label class="block mb-2 cursor-pointer text-secondary">
        <input type="radio" name="q${idx}" value="${i}" class="mr-2"/>
        ${escHtml(opt)}
      </label>`).join("");
    return `
      <div class="mb-5">
        <p class="font-medium text-primary mb-2">${idx + 1}. ${escHtml(q.question_text)}</p>
        ${optHtml}
      </div>`;
  }).join("");

  container.innerHTML = `
    <form id="quizForm" onsubmit="submitQuiz(event, '${topicId}')">
      ${qHtml}
      <button type="submit" class="btn btn-success px-4 py-2 rounded-lg font-semibold mt-4">Kirim Jawaban</button>
    </form>`;

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

  if (!allAnswered) { toast("Jawab semua pertanyaan terlebih dahulu", "error"); return; }

  const score = Math.round((correctCount / questions.length) * 100);

  const { error: attemptErr } = await sbClient
    .from("quiz_attempts")
    .insert([{ student_id: currentProfile.id, topic_id: topicId, score }]);
  if (attemptErr) console.error("quiz attempt error:", attemptErr);

  toast(`Skor kuis: ${score}% (${correctCount}/${questions.length} benar) 🎉`, score >= 60 ? "success" : "error");

  await markTopicCompleted(topicId);
  document.getElementById("quizSection").classList.add("hidden");
  await loadProgress();
};

// =========================================
// FINAL EXAM
// =========================================
window.startExam = async function (moduleId) {
  if (moduleId) {
    const enrollment = allEnrollments.find(e => String(e.modules?.id) === String(moduleId));
    if (enrollment && enrollment.modules) {
      selectedModule = enrollment.modules;
      currentEnrollmentId = enrollment.id;
    }
  }

  document.getElementById("learningPathSection").classList.add("hidden");
  document.getElementById("topicSection").classList.add("hidden");
  document.getElementById("quizSection").classList.add("hidden");

  const { data, error } = await sbClient
    .from("questions")
    .select("*")
    .eq("parent_type", "module_exam")
    .eq("parent_id", selectedModule.id);

  if (error) { console.error(error); toast("Gagal memuat soal ujian", "error"); return; }

  if (!data || data.length === 0) {
    toast("Soal ujian belum tersedia. Hubungi guru kamu.", "error");
    return;
  }

  document.getElementById("examSection").classList.remove("hidden");
  renderExam(data);
};

function renderExam(questions) {
  const section = document.getElementById("examSection");
  const qHtml = questions.map((q, idx) => {
    const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    const optHtml = opts.map((opt, i) => `
      <label class="block mb-2 cursor-pointer text-secondary text-left">
        <input type="radio" name="eq${idx}" value="${i}" class="mr-2"/>
        ${escHtml(opt)}
      </label>`).join("");
    return `
      <div class="mb-5 text-left bg-black/20 p-4 rounded-lg">
        <p class="font-medium text-primary mb-3">${idx + 1}. ${escHtml(q.question_text)}</p>
        ${optHtml}
      </div>`;
  }).join("");

  section.innerHTML = `
    <div class="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
      <button onclick="backToModules()" class="btn glass px-3 py-2 rounded-lg text-sm">
        <i data-lucide="arrow-left" class="icon-sm"></i> Kembali
      </button>
      <h2 class="text-xl font-semibold text-primary">🎓 Ujian Modul: ${escHtml(selectedModule.title)}</h2>
    </div>
    <form id="examForm" onsubmit="submitExam(event)">
      ${qHtml}
      <button type="submit" class="btn btn-primary px-8 py-4 rounded-lg font-bold mt-6 w-full md:w-auto">
        Kumpulkan Ujian
      </button>
    </form>`;

  section.dataset.questions = JSON.stringify(questions);
  section.scrollIntoView({ behavior: "smooth" });
  refreshIcons();
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

  if (!allAnswered) { toast("Jawab semua soal terlebih dahulu", "error"); return; }

  const score = Math.round((correctCount / questions.length) * 100);

  const { error: examErr } = await sbClient
    .from("exam_attempts")
    .insert([{ student_id: currentProfile.id, module_id: selectedModule.id, score }]);
  if (examErr) console.error("exam attempt error:", examErr);

  section.innerHTML = `
    <div class="glass p-8 rounded-xl text-center">
      <div class="text-6xl mb-6">${score >= 70 ? '🏆' : '📝'}</div>
      <h2 class="text-3xl font-bold text-primary mb-3">${score >= 70 ? 'Selamat!' : 'Coba Lagi'}</h2>
      <p class="text-secondary text-xl">Nilai ujian kamu: <strong class="text-primary text-2xl">${score}%</strong></p>
      <p class="text-secondary mt-3">${correctCount} dari ${questions.length} soal benar</p>
      ${score >= 70
        ? '<p class="text-green-400 mt-6 font-semibold">✅ Modul ini berhasil kamu selesaikan!</p>'
        : '<p class="text-yellow-400 mt-6">Nilai minimum kelulusan 70%. Pelajari kembali materi dan coba lagi.</p>'}
      <button onclick="backToModules()" class="btn btn-primary mt-8 px-6 py-3 rounded-lg font-bold">
        Kembali ke Modul
      </button>
    </div>`;
};
