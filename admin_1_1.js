// js/modules/moduleManager.js - FIXED
// Now uses global sbClient from supabase.js, no ES imports (works with your <script> tags)

async function createModule(title, description) {
  const { data, error } = await sbClient.from("modules").insert([{ title, description }]).select();
  if (error) throw error;
  return data[0];
}

async function addTopic(moduleId, title, contentUrl, orderIndex) {
  const { data, error } = await sbClient.from("topics").insert([{
    module_id: moduleId, title, content_url: contentUrl, order_index: orderIndex,
  }]).select();
  if (error) throw error;
  return data[0];
}

async function createQuiz(parentType, parentId, questions) {
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

async function enrollStudent(studentId, moduleId) {
  const { data, error } = await sbClient.from("module_enrollments").insert([{ student_id: studentId, module_id: moduleId }]).select();
  if (error) throw error;
  return data[0];
}

// expose globally for non-module usage
window.moduleManager = { createModule, addTopic, createQuiz, enrollStudent };
