'use server';
// src/features/ai/actions.ts
// All Gemini Server Actions for the LMS:
//   1. generateCurriculum   — admin: generate full topic JSON from title+level
//   2. explainQuizAnswer    — student: deeper explanation for a wrong quiz answer
//   3. draftProgressReport  — teacher: draft session progress report
//   4. chatWithTutor        — student: topic-aware AI tutor message

import { geminiFlash, geminiPro } from '@/features/ai/gemini';
import { requireAdmin } from '@/lib/auth';
import { getAuthUser } from '@/lib/auth';

export type AiResult<T = string> =
  | { success: true;  data: T }
  | { success: false; error: string };

// ── 1. generateCurriculum ─────────────────────────────────────────────────────
// Generates a single-topic JSON payload (nodes + quiz + challenge) ready to
// paste into the Module Builder import textarea.

export async function generateCurriculum(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const topicTitle = (formData.get('topic_title') as string | null)?.trim();
  const level      = (formData.get('level')       as string | null)?.trim() ?? 'beginner';
  const moduleTitle = (formData.get('module_title') as string | null)?.trim() ?? 'Modul';
  const lang       = 'Bahasa Indonesia';

  if (!topicTitle) return { success: false, error: 'Judul topik wajib diisi.' };

  const prompt = `
You are an expert educational content creator for a kids & teens coding LMS called Bits2Bytes.
Generate a complete curriculum topic JSON for the following:

Topic Title: "${topicTitle}"
Module: "${moduleTitle}"
Level: ${level}
Language: ${lang}

Return ONLY valid JSON matching this exact schema (no markdown, no code block):
{
  "module_title": "${moduleTitle}",
  "module_order": 0,
  "level": "${level}",
  "gamification_type": "mimo",
  "topics": [
    {
      "topic_title": "${topicTitle}",
      "topic_order": 0,
      "description": "<2-3 sentence topic overview in ${lang}>",
      "nodes": [
        {
          "node_id": "node-01",
          "order": 0,
          "type": "lesson",
          "title": "<lesson node title>",
          "content": "<explanation paragraph, 3-5 sentences, in ${lang}>",
          "xp": 10
        },
        {
          "node_id": "node-02",
          "order": 1,
          "type": "code",
          "title": "<code example title>",
          "content": "<brief intro text>",
          "code_content": "<sample code snippet>",
          "code_language": "text",
          "xp": 10
        },
        {
          "node_id": "node-03",
          "order": 2,
          "type": "practice",
          "title": "<MCQ practice title>",
          "instructions": "<question text>",
          "options": ["option A", "option B", "option C", "option D"],
          "correct_option": "option A",
          "xp": 15
        },
        {
          "node_id": "node-04",
          "order": 3,
          "type": "lesson",
          "title": "<second concept title>",
          "content": "<deeper explanation, 3-4 sentences>",
          "xp": 10
        },
        {
          "node_id": "node-05",
          "order": 4,
          "type": "challenge",
          "title": "Challenge: <task name>",
          "instructions": "<clear step-by-step task instructions in ${lang}>",
          "xp": 20
        }
      ],
      "quiz": [
        {
          "question": "<quiz question 1>",
          "options": ["A","B","C","D"],
          "answer_index": 0,
          "explanation": "<why this answer is correct, in ${lang}>"
        },
        {
          "question": "<quiz question 2>",
          "options": ["A","B","C","D"],
          "answer_index": 1,
          "explanation": "<explanation>"
        },
        {
          "question": "<quiz question 3>",
          "options": ["A","B","C","D"],
          "answer_index": 2,
          "explanation": "<explanation>"
        },
        {
          "question": "<quiz question 4>",
          "options": ["A","B","C","D"],
          "answer_index": 0,
          "explanation": "<explanation>"
        },
        {
          "question": "<quiz question 5>",
          "options": ["A","B","C","D"],
          "answer_index": 3,
          "explanation": "<explanation>"
        }
      ],
      "challenge": {
        "title": "${topicTitle} Challenge",
        "instructions": "<practical hands-on task, 2-3 steps>",
        "submission_type": "link",
        "xp": 30
      }
    }
  ]
}

Make the content engaging, age-appropriate (10-16 years old), and educational.
All text must be in ${lang}.
Return ONLY the JSON object, nothing else.
`.trim();

  try {
    const result = await geminiFlash.generateContent(prompt);
    const text   = result.response.text().trim();

    // Strip any markdown code block wrapping if present
    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Validate it's parseable JSON
    JSON.parse(clean);
    return { success: true, data: clean };
  } catch (err) {
    console.error('[generateCurriculum]', err);
    return { success: false, error: 'Gagal menghasilkan konten. Coba lagi.' };
  }
}

// ── 2. explainQuizAnswer ──────────────────────────────────────────────────────
// Returns a richer, conversational explanation for a quiz question the student
// got wrong. No auth restriction — student role check via getAuthUser.

export async function explainQuizAnswer(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };

  const question    = (formData.get('question')     as string | null)?.trim();
  const wrongAnswer = (formData.get('wrong_answer') as string | null)?.trim();
  const rightAnswer = (formData.get('right_answer') as string | null)?.trim();
  const explanation = (formData.get('explanation')  as string | null)?.trim();
  const topicTitle  = (formData.get('topic_title')  as string | null)?.trim() ?? 'topik ini';

  if (!question || !rightAnswer) return { success: false, error: 'Data tidak lengkap.' };

  const prompt = `
Kamu adalah tutor coding yang ramah dan sabar untuk siswa berusia 10-16 tahun di platform Bits2Bytes.

Seorang siswa baru saja menjawab soal quiz tentang "${topicTitle}" dengan salah.

Pertanyaan: "${question}"
Jawaban siswa (salah): "${wrongAnswer}"
Jawaban benar: "${rightAnswer}"
Penjelasan singkat: "${explanation}"

Tolong berikan penjelasan yang lebih panjang dan mudah dipahami dalam Bahasa Indonesia:
- Gunakan analogi atau contoh nyata yang relatable untuk anak muda
- Jelaskan mengapa jawaban siswa salah dengan cara yang tidak menyalahkan
- Perkuat mengapa jawaban yang benar adalah benar
- Berikan tips supaya mereka tidak lupa lagi
- Maksimal 4 paragraf pendek
- Gunakan emoji yang relevan sesekali untuk membuat lebih engaging
- Akhiri dengan kalimat semangat
`.trim();

  try {
    const result = await geminiPro.generateContent(prompt);
    return { success: true, data: result.response.text().trim() };
  } catch (err) {
    console.error('[explainQuizAnswer]', err);
    return { success: false, error: 'Gagal mendapatkan penjelasan.' };
  }
}

// ── 3. draftProgressReport ────────────────────────────────────────────────────
// Drafts a progress report for a teacher to edit before submitting.

export async function draftProgressReport(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };
  if (auth.role !== 'teacher' && auth.role !== 'admin') {
    return { success: false, error: 'Akses ditolak.' };
  }

  const sessionTitle  = (formData.get('session_title') as string | null)?.trim() ?? 'sesi ini';
  const studentNames  = (formData.get('student_names') as string | null)?.trim() ?? 'siswa';
  const topicHint     = (formData.get('topic_hint')    as string | null)?.trim() ?? '';

  const prompt = `
Kamu adalah asisten guru yang membantu menulis laporan perkembangan belajar siswa.

Detail sesi:
- Judul sesi: "${sessionTitle}"
- Nama siswa: "${studentNames}"
${topicHint ? `- Materi/topik: "${topicHint}"` : ''}

Tulis laporan perkembangan dalam Bahasa Indonesia yang:
1. Dimulai dengan ringkasan topik yang dipelajari
2. Menyebutkan poin-poin positif perkembangan siswa
3. Memberikan catatan area yang perlu ditingkatkan (dengan nada positif dan konstruktif)
4. Menyertakan saran untuk latihan di rumah
5. Panjang: 3-4 paragraf
6. Nada: profesional tapi hangat, cocok dibaca orang tua
7. Jangan gunakan nama siswa jika ada lebih dari satu, gunakan "para siswa"

Tulis laporan saja, tanpa judul atau header tambahan.
`.trim();

  try {
    const result = await geminiPro.generateContent(prompt);
    return { success: true, data: result.response.text().trim() };
  } catch (err) {
    console.error('[draftProgressReport]', err);
    return { success: false, error: 'Gagal membuat draf laporan.' };
  }
}

// ── 4. chatWithTutor ──────────────────────────────────────────────────────────
// Topic-aware AI tutor. Receives the topic context + conversation history.

export interface ChatMessage {
  role:    'user' | 'model';
  content: string;
}

export async function chatWithTutor(
  _prev: AiResult | null,
  formData: FormData
): Promise<AiResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: 'Tidak terautentikasi.' };

  const topicTitle   = (formData.get('topic_title')   as string | null)?.trim() ?? 'topik ini';
  const topicContext = (formData.get('topic_context') as string | null)?.trim() ?? '';
  const userMessage  = (formData.get('message')       as string | null)?.trim();
  const historyRaw   = (formData.get('history')       as string | null) ?? '[]';

  if (!userMessage) return { success: false, error: 'Pesan kosong.' };

  let history: ChatMessage[] = [];
  try { history = JSON.parse(historyRaw); } catch { history = []; }

  const systemPrompt = `
Kamu adalah Byte, tutor AI ramah untuk platform belajar coding Bits2Bytes.
Kamu sedang membantu siswa berusia 10-16 tahun belajar tentang: "${topicTitle}".
${topicContext ? `\nKonteks materi:\n${topicContext.slice(0, 1500)}` : ''}

Aturan:
- Jawab dalam Bahasa Indonesia yang santai dan ramah, cocok untuk anak/remaja
- Gunakan analogi yang mudah dipahami
- Jika ada kode, format dengan backtick
- Jangan menjawab topik di luar pelajaran coding/teknologi
- Jawaban maksimal 3 paragraf, ringkas dan langsung ke poin
- Gunakan emoji sesekali untuk semangat 🚀
`.trim();

  // Build conversation history for multi-turn
  const chat = geminiPro.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Halo! Aku Byte, tutor AI kamu. Aku siap bantu belajar tentang ' + topicTitle + '! Ada yang ingin kamu tanyakan? 🚀' }] },
      ...history.map((m) => ({
        role:  m.role as 'user' | 'model',
        parts: [{ text: m.content }],
      })),
    ],
  });

  try {
    const result = await chat.sendMessage(userMessage);
    return { success: true, data: result.response.text().trim() };
  } catch (err) {
    console.error('[chatWithTutor]', err);
    return { success: false, error: 'Byte sedang tidak tersedia. Coba lagi sebentar.' };
  }
}
