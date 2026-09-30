import { redirect } from "next/navigation";

// Root route — redirect to /login.
// The middleware handles role-based routing after sign-in.
export default function RootPage() {
  redirect("/login");
}
