// src/app/student/dashboard/page.tsx
// Student dashboard — passes all server-fetched data to the client-side
// StudentDashboardShell for 2-column layout, tab navigation, and micro-interactions.
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForStudent, getUpcomingMeetingForStudent } from "@/features/sessions/queries";
import { getStudentGamificationData } from "@/features/pet/lib/petQueries";
import { getStudentCertificates } from "@/features/certificates/queries";
import { getStudentInvoices } from "@/features/invoices/queries";
import { getStudentModulesWithTopics, getStudentCompletedTopics } from "@/features/curriculum/queries";
import { getQuestMapData } from "@/features/quiz/questMapQueries";
import { isUpcoming } from "@/lib/formatDate";
import { StudentDashboardShell } from "@/features/dashboard/student/StudentDashboardShell";

export const metadata: Metadata = { title: "Dasbor Siswa — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const studentName: string =
    user.user_metadata?.full_name?.split(" ")[0] ?? "Kamu";

  const [meetings, gamData, certificates, townSquareMeeting, invoices, allModules, completedTopics] = await Promise.all([
    getSessionsForStudent(user.id),
    getStudentGamificationData(user.id),
    getStudentCertificates(user.id),
    getUpcomingMeetingForStudent(user.id),
    getStudentInvoices(user.id),
    getStudentModulesWithTopics(user.id),
    getStudentCompletedTopics(user.id),
  ]);

  // Derive NEEDS_QUIZ topics and active quest map nodes from the active module
  const activeMod = allModules[0] ?? null;
  const needsQuizTopics: Array<{ id: number; title: string }> = [];
  let questNodes: import("@/features/quiz/questMapQueries").QuestTopicNode[] = [];

  if (activeMod) {
    const questData = await getQuestMapData(user.id, activeMod);
    questNodes = questData.nodes;
    for (const node of questData.needsQuizTopics) {
      needsQuizTopics.push({ id: node.topic.id, title: node.topic.title });
    }
  }

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );

  // Full past list — StudentDashboardShell handles slicing to 4 for preview
  const past = meetings
    .filter((m) => m.is_completed || !isUpcoming(m.meeting_date));

  return (
    <StudentDashboardShell
      studentId={user.id}
      studentName={studentName}
      gamData={gamData}
      certificates={certificates}
      townSquareMeeting={townSquareMeeting}
      invoices={invoices}
      upcoming={upcoming}
      past={past}
      needsQuizTopics={needsQuizTopics}
      completedTopics={completedTopics}
      allModules={allModules}
      questNodes={questNodes}
      activeModuleName={activeMod?.title ?? ''}
    />
  );
}
