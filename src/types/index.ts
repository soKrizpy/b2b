// Central barrel file for all type exports
// Allows clean imports like: @/types instead of @/types/database

// Re-export role type
export type { UserRole } from '@/types/roles';

// Re-export session types
export type {
  Session,
  SessionStudent,
  SessionWithStudents,
  CreateSessionPayload,
  UpdateSessionPayload,
} from '@/types/sessions';

// Re-export database types
export type {
  Json,
  ProfileRow,
  StudentRow,
  StudentInsert,
  StudentUpdate,
  ModuleRow,
  ModuleInsert,
  ModuleUpdate,
  TopicRow,
  TopicInsert,
  TopicUpdate,
  StudentModuleRow,
  StudentModuleInsert,
  StudentModuleUpdate,
  MeetingRow,
  MeetingInsert,
  MeetingUpdate,
  MeetingStudentRow,
  QuizRow,
  QuizQuestionRow,
  QuizAttemptRow,
  TopicProgressRow,
  StudentPetRow,
  StudentPetInsert,
  StudentPetUpdate,
  StudentBadgeRow,
  ParentLinkRow,
  ParentLinkInsert,
  AnnouncementRow,
  ModuleAssessmentRow,
  ModuleAssessmentQuestionRow,
  ModuleAssessmentAttemptRow,
  InvoiceRow,
  QuizAnswer,
  TopicQuizAttemptRow,
  CertificateTier,
  CertificateRow,
  CertificateInsert,
  ChallengeRow,
  ChallengeInsert,
  ChallengeUpdate,
  SubmissionStatus,
  SubmissionRow,
  SubmissionInsert,
  SubmissionUpdate,
} from '@/types/database';