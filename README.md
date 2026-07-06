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
- Centralized all `js/` and `css/` files to their respective folders. Removed redundant root files.
- Added `.gitignore` to prevent IDE artifacts from being tracked.
- Fixed severe INP performance issues related to synchronous tab switching and icon rendering loops.
- Re-implemented missing color utility classes (`.text-success`, `.text-warning`, `.text-info`) into `shared.css` that were actively used in JS template literals.
