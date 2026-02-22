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
