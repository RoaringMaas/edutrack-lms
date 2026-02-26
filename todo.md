# EduTrack LMS — TODO

## Phase 2: Database & Dependencies
- [x] Define full database schema (classes, students, assignments, submissions, assessments, grades, teacher_notes)
- [x] Run db:push to apply migrations
- [x] Install additional dependencies (papaparse for CSV)

## Phase 3: Core Layout & Auth
- [x] Global theming (blue accent #2563EB, clean white, sidebar layout)
- [x] DashboardLayout customization with EduTrack branding and nav items
- [x] Auth-gated routing (redirect to login if unauthenticated)
- [x] Role-based nav (Teacher vs Admin views)

## Phase 4: Dashboard
- [x] Teacher dashboard: My Classes cards with student count, assessment count
- [x] Admin dashboard: school-wide overview across all teachers
- [x] Summary stats cards: total students, upcoming assessments, average scores
- [x] Student alerts: flagged students below alert threshold with warning badges

## Phase 5: Class Management & Student Roster
- [x] Class list page with create/edit/delete class
- [x] Create class dialog (subject, grade, section, academic year, term)
- [x] Student roster page (per class, in ClassDetail tabs)
- [x] Manual student entry form (name, auto-generated student ID)
- [x] CSV bulk import wizard: Step 1 Upload, Step 2 Preview, Step 3 Confirm & Import

## Phase 6: Homework Submission Tracker
- [x] Weekly matrix grid (students × assignments)
- [x] 4-status toggle per cell: Submitted / Late / Missing / Pending
- [x] Week selector dropdown
- [x] Add Assignment column button
- [x] Summary stats: submission rate, missing count, late count
- [x] Export homework data as CSV (in Reports page)

## Phase 7: Assessment Scoreboard
- [x] Scoreboard grid (students × assessments)
- [x] Inline score entry (click cell to type)
- [x] Bulk/Quick Entry mode (tab-through scoring)
- [x] Color-coded scores: green >90%, amber 60-89%, red <60%
- [x] Term average column with progress bar
- [x] Class average row at bottom
- [x] Student alert warning icons for below-threshold averages
- [x] Points / Percentage toggle
- [x] Search and filter students
- [x] Add Assessment dialog (name, date, type, max score)
- [x] Assessment Details dialog (info, notes, PDF upload/view/replace/remove)
- [x] Summary cards: Top Performer, Class Distribution, Teacher Notes

## Phase 8: Analytics Dashboard
- [x] Class average and submission rate summary cards
- [x] Average Score Trend line chart (recharts)
- [x] Grade Distribution donut chart (recharts)
- [x] Student performance bar chart
- [x] Top Performers list
- [x] Students Needing Support list (tied to alert threshold)
- [x] Admin: aggregated analytics across all classes

## Phase 9: Reports & Settings
- [x] Reports page: filter by class
- [x] Export gradebook as CSV
- [x] Export submission data as CSV
- [x] Settings: alert threshold configuration per class
- [x] Settings: teacher profile view (name, email, role)
- [x] Admin settings: view all user accounts and assign roles

## Phase 10: PDF Progress Reports
- [x] Individual student AI-generated narrative report
- [x] Full class AI-generated summary report
- [x] LLM-generated narrative insights (via invokeLLM)
- [x] Download report as text file

## Phase 11: Tests & Polish
- [x] Vitest unit tests for key procedures (21 tests, 2 test files)
- [x] Empty state handling for all pages
- [x] Loading skeleton states
- [x] Save checkpoint and deliver

## Parent-Facing View (Shareable Read-Only Links)
- [x] Add shareToken column to students table in schema
- [x] Add DB helpers: getStudentByShareToken, setStudentShareToken
- [x] Add public tRPC procedure (parentView.getByToken) to fetch student data by share token (no auth)
- [x] Add tRPC procedures for teachers to generate/revoke share links (shareLinks.generate, shareLinks.revoke)
- [x] Build public /parent/:token page with read-only homework + grade summary
- [x] Add share link button/dialog in teacher's student roster (ClassDetail)
- [x] Add copy-to-clipboard, regenerate, and revoke functionality
- [x] Write vitest tests for share token procedures (7 new tests, 28 total)

## Email/Password Authentication (Replace Manus OAuth)
- [x] Add passwordHash and accountStatus (pending/approved/rejected) columns to users table
- [x] Push schema migration (pnpm db:push)
- [x] Add auth DB helpers: createUserWithPassword, getUserByEmail, updateUserAccountStatus, updateUserLastSignedIn
- [x] tRPC auth.register: hash password with bcrypt, create user with pending status
- [x] tRPC auth.login: verify bcrypt password, issue 30-day JWT session cookie
- [x] tRPC admin.updateAccountStatus: approve/reject teacher accounts
- [x] Build /login page (email/password form, show pending state after login)
- [x] Build /register page (name, email, password, confirm password, success screen)
- [x] Update client/src/const.ts: getLoginUrl() returns /login
- [x] Update DashboardLayout: redirect unauthenticated to /login, show pending approval screen
- [x] Add /login and /register routes to App.tsx
- [x] Admin approval queue in Settings: pending teachers list with Approve/Reject buttons
- [x] Active user management: re-approve rejected teachers, change roles
- [x] Vitest tests: auth.register (3), auth.login (3), admin.updateAccountStatus (3) — 37 total tests passing

## Bug Fixes
- [x] Fix "Invalid or expired link" error on /parent/:token page — guard against unresolved :token placeholder in preview mode, strip query params from token segment

## Change Password Feature
- [x] DB helper: updateUserPassword(userId, newHash)
- [x] tRPC: auth.changePassword (protected) — verify current password, hash new password, update DB
- [x] Settings page: Change Password section (current password, new password, confirm new password, show/hide toggles)
- [x] Vitest tests for auth.changePassword (3 tests) — 40 total tests passing

## CSV Score Import Feature
- [x] tRPC: grades.bulkImportFromCSV — accept array of {identifier, scoreRaw}, match by name or studentId
- [x] CSV score import wizard in AssessmentScoreboard (upload → map columns → preview → import)
- [x] Auto-match students by name (case-insensitive) or studentId code
- [x] Show unmatched/invalid/skip status per row in preview step
- [x] Vitest tests for grades.bulkImportFromCSV (3 tests) — 43 total tests passing

## Bug Fixes (Round 2)
- [x] Fix empty Select.Item value crash in CSV student import wizard (column mapping step) — replaced empty string value with __none__ sentinel
- [x] Fix "Invalid email or password" error on /login page — wrong bcrypt hash was stored for admin account during initial setup; corrected hash for EduTrack2026

## Homework Assignment Form Improvements
- [x] Make points field optional — empty value defaults to 0 (no points required)
- [x] dueDate column already existed in schema (no migration needed)
- [x] assignments.create router already accepted dueDate (no change needed)
- [x] Updated HomeworkTracker UI: points field is now optional with placeholder "0"
- [x] Added date picker for due date in the Add Assignment form
- [x] Display due date below assignment title in the homework grid column headers
- [x] Points label hidden when 0 (no pts shown for ungraded assignments)

## Edit Homework Assignment Feature
- [x] Add assignments.update tRPC procedure (name, points, dueDate)
- [x] Add edit button/icon next to delete button in assignment column header
- [x] Add edit dialog with name, points, due date fields pre-populated
- [x] Update assignment on submit
- [x] Vitest tests for assignments.update (2 tests) — 45 total tests passing

## Bug Fixes (Round 3)
- [x] Fix submission rate >100%: added unique index uq_submission on (studentId, assignmentId); deleted 39 duplicate rows
- [x] Fix Algebra score missing from chart: added unique index uq_grade on (studentId, assessmentId); deleted 11 duplicate null-score rows
- [x] Clean up existing duplicate submission and grade rows in the database

## Customizable Student ID
- [x] Add studentId (string code) field to students.update tRPC procedure with uniqueness check per class
- [x] Add Student ID input field to the Edit Student dialog in ClassDetail (pre-populated with current value)
- [x] Show the student ID code in the student list table (already shown as badge)
- [x] Vitest tests for students.update (3 tests) — 48 total tests passing

## Bug Fixes (Round 4)
- [x] Fix Bug #1: Pending users can log in — changed accountStatus check from === "rejected" to !== "approved"; also removed pending approval flow from frontend
- [x] Fix Bug #2: Debug console.log statements leak PII — removed two console.log lines from auth.login procedure

## UI Enhancements
- [x] Make Students, Homework, Assessments navigation buttons bigger and more prominent (larger text, padding, icons) — increased font size to base, padding to px-6 py-3, icon size to h-5 w-5, added gap between buttons

- [x] Highlight the currently active tab (Students/Homework/Assessments) with prominent background color and styling — added blue-600 background, white text, rounded corners, and smooth transition on active state

## Search & Filter Feature
- [x] Add search bar to Students tab (filter by name or student ID) — already implemented
- [x] Add search bar to Homework tab (filter by assignment name) — added search input to filter assignments by name
- [x] Add search bar to Assessments tab (filter by assessment name or student name) — already implemented
