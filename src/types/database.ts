// src/types/database.ts
// Hand-authored types that mirror the existing production Supabase schema.
// Covers every table that the rebuild reads or writes.
// NEVER destructively alter the corresponding production tables.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Row types ────────────────────────────────────────────────────────────────
// Each "Row" type is the shape returned by SELECT *.
// "Insert" omits server-generated fields; "Update" makes all fields optional.

// public.profiles  (role lives here — NOT in public.users / auth.users metadata)
export interface ProfileRow {
  id: string;           // uuid — matches auth.users.id
  role: 'admin' | 'teacher' | 'student';
  full_name: string | null;
  created_at: string | null;
}

// public.students
export interface StudentRow {
  id: string;                    // uuid — matches auth.users.id
  email_or_phone: string;
  full_name: string;
  grade: string | null;
  bio: string | null;
  mpin: string;
  avatar_id: string | null;
  title_id: string | null;
  coins: number;
  total_xp: number;
  equipped_hat_id: string | null;
  inventory: string[];
  created_at: string | null;
}
export type StudentInsert = Omit<StudentRow, 'coins' | 'inventory' | 'created_at'> & {
  coins?: number;
  inventory?: string[];
};
export type StudentUpdate = Partial<Omit<StudentRow, 'id' | 'created_at'>>;

// public.modules
export interface ModuleRow {
  id: number;
  title: string | null;
  description: string | null;
  level: string | null;
  gamification_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
}
export type ModuleInsert = Omit<ModuleRow, 'id' | 'created_at'>;
export type ModuleUpdate = Partial<ModuleInsert>;

// public.topics
export interface TopicRow {
  id: number;
  module_id: number;
  title: string;
  order_index: number;
  description: string | null;
  project_link: string | null;
  topic_link: string | null;
  engine_topic_id: string | null;
  lesson_content: Json | null;
  status: 'draft' | 'published' | null;
  published_at: string | null;
  created_at: string | null;
}
export type TopicInsert = Omit<TopicRow, 'id' | 'published_at' | 'created_at'>;
export type TopicUpdate = Partial<Omit<TopicRow, 'id' | 'created_at'>>;

// public.student_modules
export interface StudentModuleRow {
  student_id: string;
  module_id: number;
  status: 'active' | 'paused';
}
export type StudentModuleInsert = StudentModuleRow;
export type StudentModuleUpdate = Pick<StudentModuleRow, 'status'>;

// public.meetings  (the production table name — not "sessions")
export interface MeetingRow {
  id: number;
  title: string;
  meeting_date: string;         // timestamptz as ISO string
  link_url: string;
  notes: string | null;
  session_count: number;
  session_number: number;
  series_id: string | null;
  is_completed: boolean;
  completion_status: string | null;
  progress_report: string | null;
  created_at: string | null;
}
// MeetingInsert — matches the real production meetings table insert shape.
// No teacher_id column exists in this table — teachers are not directly linked.
// series_id is generated server-side; session_number defaults to 1.
export type MeetingInsert = {
  title: string;
  meeting_date: string;       // ISO 8601
  link_url: string | null;
  notes: string | null;
  session_count: number;
  session_number: number;
  series_id: string | null;
  is_completed?: boolean;
};
export type MeetingUpdate = Partial<Omit<MeetingRow, 'id' | 'created_at'>>;

// public.meeting_students  (join table — maps meetings to students)
export interface MeetingStudentRow {
  meeting_id: number;
  student_id: string;
  has_joined: boolean;
}

// public.quizzes
export interface QuizRow {
  id: number;
  topic_id: number;
  title: string | null;
  source: 'manual' | 'csv' | 'engine' | null;
  created_at: string | null;
}

// public.quiz_questions
export interface QuizQuestionRow {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  created_at: string | null;
}

// public.quiz_attempts
export interface QuizAttemptRow {
  id: number;
  student_id: string;
  quiz_id: number;
  score: number;
  total_questions: number;
  attempts_count: number;
  created_at: string;
}

// public.topic_progress  (engine lesson completions)
export interface TopicProgressRow {
  id: number;
  student_id: string;
  topic_id: number;
  engine_topic_id: string;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}

// public.student_pets  (Cyber Pet companion)
export interface StudentPetRow {
  id: number;
  student_id: string;
  pet_name: string | null;
  species_id: string | null;
  stage: 'EGG' | 'READY_TO_HATCH' | 'BABY_PET';
  hatch_progress: number;        // 0–100
  logic_data: number;
  creative_data: number;
  spatial_data: number;
  created_at: string | null;
}
export type StudentPetInsert = Omit<StudentPetRow, 'id' | 'created_at'>;
export type StudentPetUpdate = Partial<Omit<StudentPetRow, 'id' | 'student_id' | 'created_at'>>;

// public.student_badges
export interface StudentBadgeRow {
  id: number;
  student_id: string;
  badge_id: string;
  earned_at: string;
}

// public.parent_links
export interface ParentLinkRow {
  id: string;           // uuid
  token: string;        // unique random token
  student_id: string;
  expires_at: string;   // timestamptz
  created_at: string | null;
}
export type ParentLinkInsert = Omit<ParentLinkRow, 'created_at'>;

// public.announcements
export interface AnnouncementRow {
  id: number;
  content: string;
  expires_at: string;
  created_at: string | null;
}

// public.module_assessments
export interface ModuleAssessmentRow {
  id: number;
  module_id: number;
  title: string;
  created_at: string;
}

// public.module_assessment_questions
export interface ModuleAssessmentQuestionRow {
  id: number;
  assessment_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  order_index: number;
  created_at: string;
}

// public.module_assessment_attempts
export interface ModuleAssessmentAttemptRow {
  id: number;
  student_id: string;
  assessment_id: number;
  attempt_number: 1 | 2;
  score: number;
  best_score: number;
  total_questions: number;
  correct_count: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  submitted_at: string;
}

// ── Phase 2: Challenges & Submissions (new tables — additive) ────────────────

// public.challenges
// Challenges belong to a topic and describe a task the student must complete.
export interface ChallengeRow {
  id: number;
  topic_id: number;           // FK → topics(id)
  title: string;
  instructions: string | null;
  order_index: number;
  allows_file_upload: boolean; // true = accepts file; false = URL-only
  created_at: string | null;
}
export type ChallengeInsert = Omit<ChallengeRow, 'id' | 'created_at'>;
export type ChallengeUpdate = Partial<Omit<ChallengeRow, 'id' | 'created_at'>>;

// public.challenge_submissions
export type SubmissionStatus = 'pending' | 'approved' | 'needs_revision';

export interface SubmissionRow {
  id: number;
  challenge_id: number;         // FK → challenges(id)
  student_id: string;           // FK → auth.users(id)
  submission_url: string | null; // URL proof (link or uploaded file URL)
  submission_note: string | null;
  status: SubmissionStatus;
  review_note: string | null;   // teacher feedback on rejection/revision
  reviewed_by: string | null;   // teacher user id
  reviewed_at: string | null;
  submitted_at: string;
  created_at: string | null;
}
export type SubmissionInsert = Omit<SubmissionRow,
  'id' | 'status' | 'review_note' | 'reviewed_by' | 'reviewed_at' | 'created_at'
> & { status?: SubmissionStatus };
export type SubmissionUpdate = Partial<Omit<SubmissionRow, 'id' | 'student_id' | 'challenge_id' | 'created_at'>>;

// ── Supabase Database generic type ───────────────────────────────────────────
// Used to parameterise the Supabase client — enables typed .from() calls.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at'>;
        Update: Partial<Omit<ProfileRow, 'id'>>;
      };
      students: {
        Row: StudentRow;
        Insert: StudentInsert;
        Update: StudentUpdate;
      };
      modules: {
        Row: ModuleRow;
        Insert: ModuleInsert;
        Update: ModuleUpdate;
      };
      topics: {
        Row: TopicRow;
        Insert: TopicInsert;
        Update: TopicUpdate;
      };
      student_modules: {
        Row: StudentModuleRow;
        Insert: StudentModuleInsert;
        Update: StudentModuleUpdate;
      };
      meetings: {
        Row: MeetingRow;
        Insert: MeetingInsert;
        Update: MeetingUpdate;
      };
      meeting_students: {
        Row: MeetingStudentRow;
        Insert: MeetingStudentRow;
        Update: Partial<Pick<MeetingStudentRow, 'has_joined'>>;
      };
      quizzes: {
        Row: QuizRow;
        Insert: Omit<QuizRow, 'id' | 'created_at'>;
        Update: Partial<Omit<QuizRow, 'id' | 'created_at'>>;
      };
      quiz_questions: {
        Row: QuizQuestionRow;
        Insert: Omit<QuizQuestionRow, 'id' | 'created_at'>;
        Update: Partial<Omit<QuizQuestionRow, 'id' | 'created_at'>>;
      };
      quiz_attempts: {
        Row: QuizAttemptRow;
        Insert: Omit<QuizAttemptRow, 'id'>;
        Update: Partial<Omit<QuizAttemptRow, 'id' | 'student_id'>>;
      };
      topic_progress: {
        Row: TopicProgressRow;
        Insert: Omit<TopicProgressRow, 'id'>;
        Update: Partial<Omit<TopicProgressRow, 'id' | 'student_id'>>;
      };
      student_pets: {
        Row: StudentPetRow;
        Insert: StudentPetInsert;
        Update: StudentPetUpdate;
      };
      student_badges: {
        Row: StudentBadgeRow;
        Insert: Omit<StudentBadgeRow, 'id'>;
        Update: never;
      };
      parent_links: {
        Row: ParentLinkRow;
        Insert: ParentLinkInsert;
        Update: never;
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Omit<AnnouncementRow, 'id' | 'created_at'>;
        Update: Partial<Omit<AnnouncementRow, 'id' | 'created_at'>>;
      };
      module_assessments: {
        Row: ModuleAssessmentRow;
        Insert: Omit<ModuleAssessmentRow, 'id' | 'created_at'>;
        Update: Partial<Omit<ModuleAssessmentRow, 'id' | 'created_at'>>;
      };
      module_assessment_questions: {
        Row: ModuleAssessmentQuestionRow;
        Insert: Omit<ModuleAssessmentQuestionRow, 'id' | 'created_at'>;
        Update: Partial<Omit<ModuleAssessmentQuestionRow, 'id' | 'created_at'>>;
      };
      module_assessment_attempts: {
        Row: ModuleAssessmentAttemptRow;
        Insert: Omit<ModuleAssessmentAttemptRow, 'id'>;
        Update: never;
      };
      challenges: {
        Row: ChallengeRow;
        Insert: ChallengeInsert;
        Update: ChallengeUpdate;
      };
      challenge_submissions: {
        Row: SubmissionRow;
        Insert: SubmissionInsert;
        Update: SubmissionUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}




