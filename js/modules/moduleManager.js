// js/modules/moduleManager.js
// Minimal utilities for admin to manage Modules, Topics, and Quizzes

import { sbClient } from "../services/supabase.js";

// Create a new module
export async function createModule(title, description) {
  const { data, error } = await sbClient
    .from("modules")
    .insert([{ title, description }])
    .select();
  if (error) throw error;
  return data[0];
}

// Add a topic to a module (max 12 topics per module is enforced by UI)
export async function addTopic(moduleId, title, contentUrl, orderIndex) {
  const { data, error } = await sbClient
    .from("topics")
    .insert([
      {
        module_id: moduleId,
        title,
        content_url: contentUrl,
        order_index: orderIndex,
      },
    ])
    .select();
  if (error) throw error;
  return data[0];
}

// Create quiz questions for a topic or a module exam
export async function createQuiz(parentType, parentId, questions) {
  // parentType: "topic_quiz" or "module_exam"
  // questions: [{question_text, options: ["A","B","C","D"], correct_index}]
  const inserts = questions.map((q) => ({
    parent_type: parentType,
    parent_id: parentId,
    question_text: q.question_text,
    options: JSON.stringify(q.options),
    correct_index: q.correct_index,
  }));
  const { data, error } = await sbClient.from("questions").insert(inserts);
  if (error) throw error;
  return data;
}

// Enroll a student in a module
export async function enrollStudent(studentId, moduleId) {
  const { data, error } = await sbClient
    .from("module_enrollments")
    .insert([{ student_id: studentId, module_id: moduleId }])
    .select();
  if (error) throw error;
  return data[0];
}
