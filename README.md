# Kelas Coding - B2B Web Simple Dashboard

This is the main repository for the **Kelas Coding** dashboard system, allowing admins to manage students, class schedules, reschedule requests, and learning materials, while allowing students to view their upcoming classes, access materials, and submit reschedule requests.

## 🔗 Environment Links
- **GitHub Repository**: [https://github.com/soKrizpy/b2b](https://github.com/soKrizpy/b2b)
- **Live Deployment (Vercel)**: [https://bits2bytes.vercel.app/](https://bits2bytes.vercel.app/)
- **Supabase Backend**: [lxrwkbobosdmaqrmlvpd.supabase.co](https://lxrwkbobosdmaqrmlvpd.supabase.co) (Pass: `54tu54mp4112@,@`)

## 🏗️ Architecture & Technology
The project is intentionally built using **Vanilla HTML, CSS, and JS** without heavy frontend frameworks to keep the payload extremely light and fast. 
It uses **Supabase** for Authentication and Database directly via the official Supabase JS Client.

### Directory Structure
*   **HTML Files** (Root):
    *   `index.html`: Login and entry point.
    *   `admin.html`: Dashboard for admins (teachers).
    *   `student.html`: Dashboard for students.
*   **CSS Files** (`/css/`):
    *   `shared.css`: Contains CSS variables, typography, glassmorphism UI components, utility classes (`.text-success`, etc.), and global styles.
    *   `admin.css` / `student.css`: Specific layout overrides for their respective dashboards.
*   **JS Files** (`/js/`):
    *   `shared.js`: Initializes Supabase client, icon rendering (`lucide`), API wrapper (`apiHandler`), formatting, and skeleton loaders. Loaded *before* other scripts.
    *   `index.js`: Handles authentication and redirect routing based on user roles.
    *   `admin.js` / `student.js`: Specific logic, DOM manipulation, tab switching, and Supabase data fetching for their respective dashboards.
*   **External Libraries Used**:
    *   **Lucide**: Lightweight icon library (`<i data-lucide="icon-name"></i>`).
    *   **FullCalendar**: Interactive calendar library (used in `admin.html`).

## 🚀 Performance & UI Guidelines (Crucial)
1. **INP (Interaction to Next Paint) Optimization**: 
   - Tab switching or layout shifts MUST be wrapped in `requestAnimationFrame()` to yield to the browser paint thread. 
   - `lucide.createIcons()` (`refreshIcons()`) is a heavy DOM operation and should be deferred using `requestAnimationFrame` when called after a click event or inside list rendering loops.
2. **DOM Thrashing**: 
   - When rendering lists (e.g., student lists or requests), always build the full HTML string in memory first and assign to `.innerHTML` exactly once. Do *not* append `innerHTML` inside a `.forEach` loop.
3. **Form Autofill Freezes**: 
   - All complex inputs should explicitly define `autocomplete` attributes (`autocomplete="off"`, `username`, `current-password`) to prevent browser password managers from causing synchronous UI hangs.
4. **Console Security**:
   - Do not use `console.log()` to dump user profile objects or session tokens into the production browser console. Use `console.error()` strictly for errors.

## 📝 Recent Work & Optimization History
- **Student Attendance**: Implemented a self-join marking system ("Masuk Kelas") allowing students to securely confirm their own attendance and mark class sessions as completed using new Supabase Row Level Security (RLS) policies.
- **Timezone Management**: Added auto-detect and manual timezone selection with global UI widget. Upgraded FullCalendar and schedule views to render times accurately in 24-hour format across timezones.
- **Schedule Management**: Implemented smart "Slot Kosong" logic to auto-generate 52 weeks of available slots. Added scoped editing (this slot only vs this and future slots) for rutinan schedules.
- **UI Polish**: Updated calendar events to display student names instead of class titles for better at-a-glance readability. Fixed text contrast issues on light mode calendar events.
- Applied a new Neon UI aesthetic across the platform, featuring Purple Neon borders for Dark Mode and Blue Neon borders for Light Mode.
- Centralized all `js/` and `css/` files to their respective folders. Removed redundant root files.
- Fixed severe INP performance issues related to synchronous tab switching and icon rendering loops.
- Re-implemented missing color utility classes (`.text-success`, `.text-warning`, `.text-info`) into `shared.css` that were actively used in JS template literals.

## 🔮 Future Feature Suggestions
Here are some highly recommended features to implement next to improve the platform for both teachers and students:

### For Admins (Teachers)
- **Analytics & Reporting Dashboard**: A visual overview showing total hours taught, student attendance rates, and revenue/package tracking.
- **Batch Operations**: The ability to approve/reject multiple reschedule requests at once, or assign the same material to a group of students simultaneously.
- **Payment & Invoice Tracking**: A tab to monitor which students have paid for their current package and flag those who are overdue.
- **Multi-Teacher Support**: If the platform grows, add Row Level Security (RLS) and filters so multiple teachers can log in and only see their assigned students.

### For Students
- **Homework Submission System**: Allow students to submit links (e.g., GitHub, Replit) or upload files directly on the material cards, and receive teacher feedback/grades.
- **Visual Learning Roadmap**: Instead of a flat list of materials, present a visual path/tree showing what they have mastered and what comes next.
- **Profile Management**: Allow students to update their own contact information, passwords, and profile pictures.

### System & Technical Enhancements
- **Push Notifications & Reminders**: Implement Supabase Edge Functions or a simple CRON job to automatically send WhatsApp or Email reminders 1 hour before a scheduled class.
- **Real-time Data Sync**: Utilize **Supabase Realtime** so that when an admin updates a schedule, the student's screen updates instantly without needing a manual refresh.
- **Progressive Web App (PWA)**: Add a `manifest.json` and a Service Worker so students and teachers can install the dashboard as a native-feeling app on their iOS/Android devices.
