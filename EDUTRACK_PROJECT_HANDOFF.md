# EduTrack LMS — Project Handoff Document

> **Purpose:** This document provides a complete technical and functional specification of the EduTrack LMS, intended to enable another developer or LLM to rebuild the project faithfully on a different platform (e.g., Supabase + Next.js, Firebase, or any other stack). All design decisions, data models, business logic, and UI behaviour are documented here.

---

## 1. Project Overview

**EduTrack LMS** is a gradebook and homework tracking system for independent teachers, with admin oversight. It is a single-tenant web application where teachers manage their own classes and an admin can oversee all classes school-wide.

**Live URL:** https://edutrack.manus.space  
**Current stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + MySQL (Drizzle ORM)  
**Auth:** Custom email/password with bcrypt + JWT session cookie (30-day expiry)  
**File storage:** S3-compatible object storage (for PDF test papers)  
**Test suite:** Vitest — 48 tests passing across 2 test files

---

## 2. User Roles & Permissions

The system has two independent role dimensions:

| Field | Values | Purpose |
|-------|--------|---------|
| `role` | `user`, `admin` | System-level role (controls admin procedures) |
| `eduRole` | `teacher`, `admin` | App-level role (controls UI and data access) |

In practice, an admin user has both `role = "admin"` and `eduRole = "admin"`. A teacher has `role = "user"` and `eduRole = "teacher"`. All permission checks in procedures use `ctx.user.role !== "admin" && ctx.user.eduRole !== "admin"` to identify admin users.

**Account lifecycle:** New teacher registrations start with `accountStatus = "pending"`. An admin must approve the account before the teacher can log in. Rejected accounts receive a clear error message. Only accounts with `accountStatus = "approved"` can log in.

---

## 3. Database Schema

The database uses MySQL with Drizzle ORM. All timestamps are UTC. The following tables exist:

### 3.1 `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `openId` | VARCHAR(64) UNIQUE | Unique identifier; for email/password users, prefixed with `email_` + nanoid(24) |
| `name` | TEXT | |
| `email` | VARCHAR(320) | |
| `loginMethod` | VARCHAR(64) | e.g. `"email"` |
| `role` | ENUM(`user`, `admin`) | Default `user` |
| `eduRole` | ENUM(`teacher`, `admin`) | Default `teacher` |
| `avatarInitials` | VARCHAR(4) | Derived from name on registration |
| `passwordHash` | VARCHAR(256) | bcrypt hash (12 rounds) |
| `accountStatus` | ENUM(`pending`, `approved`, `rejected`) | Default `pending` |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | Auto-updated |
| `lastSignedIn` | TIMESTAMP | Updated on each successful login |

### 3.2 `classes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `teacherId` | INT | FK → `users.id` |
| `subjectName` | VARCHAR(128) | e.g. "Mathematics" |
| `gradeLevel` | VARCHAR(32) | e.g. "Grade 10" |
| `section` | VARCHAR(32) | e.g. "10A" |
| `academicYear` | VARCHAR(16) | e.g. "2024-2025" |
| `term` | VARCHAR(32) | e.g. "Term 1", "Semester 2" |
| `alertThreshold` | INT | Default 60 (percentage below which students are flagged) |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | Auto-updated |

**Business rule:** Teachers can create a maximum of 3 classes. Admins have no limit.

### 3.3 `students`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `classId` | INT | FK → `classes.id` |
| `studentId` | VARCHAR(32) | Auto-generated code (e.g. `10A0001`); customisable by teacher |
| `name` | VARCHAR(128) | |
| `email` | VARCHAR(320) | Optional |
| `shareToken` | VARCHAR(32) | Unique token for parent-facing read-only link; nullable |
| `createdAt` | TIMESTAMP | |

**Student ID generation:** `generateStudentId(classSection, index)` takes the class section (e.g. `"10A"`), strips spaces, uppercases, takes first 3 chars as prefix, then pads the index to 4 digits: `10A0001`. Teachers can override this via the edit dialog. Uniqueness is enforced per class.

**CSV bulk import:** Teachers can upload a CSV/XLSX file. The import wizard has 3 steps: (1) Upload, (2) Map columns (match CSV headers to `name`, `email`, `studentId` fields), (3) Preview & confirm. The server creates students in bulk via `createStudentsBulk`.

### 3.4 `assignments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `classId` | INT | FK → `classes.id` |
| `name` | VARCHAR(128) | |
| `dueDate` | DATE | Optional |
| `weekNumber` | INT | Used for week-based grouping in homework grid |
| `weekLabel` | VARCHAR(32) | e.g. "Week 12" |
| `points` | INT | Default 10; 0 means ungraded |
| `createdAt` | TIMESTAMP | |

### 3.5 `submissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `studentId` | INT | FK → `students.id` |
| `assignmentId` | INT | FK → `assignments.id` |
| `status` | ENUM(`submitted`, `late`, `missing`, `pending`) | Default `pending` |
| `submittedAt` | TIMESTAMP | Optional |
| `updatedAt` | TIMESTAMP | Auto-updated |

**Unique constraint:** `uq_submission` on `(studentId, assignmentId)` — enforces one row per student per assignment. The upsert uses `INSERT ... ON DUPLICATE KEY UPDATE`.

**Status cycle:** Clicking a cell in the homework grid cycles through: `pending` → `submitted` → `late` → `missing` → `pending`.

### 3.6 `assessments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `classId` | INT | FK → `classes.id` |
| `name` | VARCHAR(128) | |
| `dateTaken` | DATE | Optional |
| `type` | ENUM(`quiz`, `exam`, `project`, `activity`, `other`) | Default `quiz` |
| `maxScore` | INT | Default 100 |
| `description` | TEXT | Free-form notes for the assessment |
| `filePath` | TEXT | S3 key for uploaded PDF test paper |
| `fileUrl` | TEXT | S3 public URL for the PDF |
| `fileName` | TEXT | Original filename |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | Auto-updated |

### 3.7 `grades`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `studentId` | INT | FK → `students.id` |
| `assessmentId` | INT | FK → `assessments.id` |
| `score` | FLOAT | Nullable (not yet graded) |
| `updatedAt` | TIMESTAMP | Auto-updated |

**Unique constraint:** `uq_grade` on `(studentId, assessmentId)` — enforces one row per student per assessment. The upsert uses `INSERT ... ON DUPLICATE KEY UPDATE`.

**Score colour coding:** Green ≥ 90% of maxScore, Amber 60–89%, Red < 60%.

### 3.8 `teacherNotes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `classId` | INT UNIQUE | FK → `classes.id` (one note per class) |
| `notes` | TEXT | Free-form class-level notes |
| `updatedAt` | TIMESTAMP | Auto-updated |

---

## 4. API / tRPC Procedures

All procedures are served at `/api/trpc`. The router is structured as nested sub-routers. `protectedProcedure` requires a valid session cookie; `publicProcedure` does not.

### 4.1 `auth`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `auth.me` | query | public | Returns current user or null |
| `auth.register` | mutation | public | Creates user with `pending` status; bcrypt hash (12 rounds) |
| `auth.login` | mutation | public | Verifies password; blocks non-approved accounts; issues 30-day JWT cookie |
| `auth.logout` | mutation | public | Clears session cookie |
| `auth.changePassword` | mutation | protected | Verifies current password; updates bcrypt hash |

### 4.2 `classes`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `classes.list` | query | protected | Teachers see own classes; admins see all |
| `classes.get` | query | protected | Returns single class; enforces ownership |
| `classes.create` | mutation | protected | Max 3 classes for teachers |
| `classes.update` | mutation | protected | Updates any field; enforces ownership |
| `classes.delete` | mutation | protected | Cascades deletes via DB helpers |

### 4.3 `students`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `students.list` | query | protected | Returns students for a class |
| `students.create` | mutation | protected | Auto-generates studentId if not provided |
| `students.bulkCreate` | mutation | protected | Creates multiple students at once (CSV import) |
| `students.update` | mutation | protected | Updates name, email, studentId; checks uniqueness of studentId within class |
| `students.delete` | mutation | protected | Removes student and all related submissions/grades |

### 4.4 `assignments`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `assignments.list` | query | protected | Returns all assignments for a class |
| `assignments.create` | mutation | protected | Creates assignment with optional dueDate and points |
| `assignments.update` | mutation | protected | Updates name, points, dueDate |
| `assignments.delete` | mutation | protected | Removes assignment and related submissions |

### 4.5 `submissions`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `submissions.listByClass` | query | protected | Returns all submissions for a class |
| `submissions.upsert` | mutation | protected | Inserts or updates submission status |

### 4.6 `assessments`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `assessments.list` | query | protected | Returns all assessments for a class |
| `assessments.create` | mutation | protected | Creates assessment |
| `assessments.update` | mutation | protected | Updates any field |
| `assessments.delete` | mutation | protected | Removes assessment and related grades |
| `assessments.uploadFile` | mutation | protected | Encodes PDF as base64, uploads to S3, stores key/url/filename |
| `assessments.removeFile` | mutation | protected | Clears filePath, fileUrl, fileName |

### 4.7 `grades`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `grades.listByClass` | query | protected | Returns all grades for a class |
| `grades.listByStudent` | query | protected | Returns all grades for a student |
| `grades.upsert` | mutation | protected | Inserts or updates a single grade |
| `grades.bulkUpsert` | mutation | protected | Inserts or updates multiple grades at once |
| `grades.bulkImportFromCSV` | mutation | protected | Matches students by name or studentId, validates scores against maxScore, bulk upserts |

### 4.8 `teacherNotes`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `teacherNotes.get` | query | protected | Returns notes for a class, or `null` if none |
| `teacherNotes.upsert` | mutation | protected | Creates or updates class notes |

### 4.9 `admin`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `admin.listUsers` | query | admin only | Returns all users |
| `admin.updateUserRole` | mutation | admin only | Changes `eduRole` between `teacher` and `admin` |
| `admin.updateAccountStatus` | mutation | admin only | Approves, rejects, or re-pends teacher accounts |

### 4.10 `shareLinks`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `shareLinks.generate` | mutation | protected | Generates a nanoid(16) share token for a student |
| `shareLinks.revoke` | mutation | protected | Sets shareToken to null |

### 4.11 `parentView`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `parentView.getByToken` | query | public | Returns student name, class info, grade summary, homework summary, and term average by share token |

---

## 5. Frontend Pages & Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/login` | `Login.tsx` | Public | Email/password login form |
| `/register` | `Register.tsx` | Public | Registration form; shows success screen after submit |
| `/parent/:token` | `ParentView.tsx` | Public | Read-only student progress view for parents |
| `/` | `Dashboard.tsx` | Protected | Teacher: My Classes cards + alerts. Admin: school-wide overview |
| `/classes` | `Classes.tsx` | Protected | Class list with create/edit/delete |
| `/classes/:classId` | `ClassDetail.tsx` | Protected | Three-tab view: Students, Homework, Assessments |
| `/students` | `Students.tsx` | Protected | Cross-class student list (admin view) |
| `/analytics` | `Analytics.tsx` | Protected | Charts and performance analytics |
| `/reports` | `Reports.tsx` | Protected | CSV export for gradebook and homework |
| `/settings` | `Settings.tsx` | Protected | Profile, password change, alert threshold, admin user management |

All protected routes are wrapped in `DashboardLayout`, which redirects unauthenticated users to `/login`.

---

## 6. Key UI Components & Behaviour

### 6.1 ClassDetail — Three-Tab Navigation

The class detail page has three prominent tabs rendered as large buttons (blue background when active, white text):

- **Students tab** — Student roster with search bar (filters by name or student ID). Each row shows avatar initials, name, student ID badge, email. Actions: Edit (opens dialog with name, email, student ID fields), Delete, Share Link (generates/revokes parent link).
- **Homework tab** — Weekly submission matrix. Week selector dropdown + search bar (filters assignment columns by name). Grid: rows = students, columns = assignments. Each cell cycles through 4 statuses on click. Column headers show assignment name, due date, points. Summary stats bar shows submission rate, missing count, late count.
- **Assessments tab** — Scoreboard grid. Search bar filters students. Rows = students with avatar, name, student ID. Columns = assessments with name, date, type, max score. Last column = term average with colour-coded progress bar. Bottom row = class average. Inline score entry (click cell to type). Quick Entry mode (tab-through). Points/Percentage toggle. Assessment Details button (info icon) opens dialog with description and PDF upload.

### 6.2 Homework Grid — Status Colours

| Status | Colour | Icon |
|--------|--------|------|
| `submitted` | Green | ✅ |
| `late` | Amber/Yellow | ⏰ |
| `missing` | Red | ❌ |
| `pending` | Grey | ⚪ |

### 6.3 Score Colour Coding

| Range | Colour |
|-------|--------|
| ≥ 90% of maxScore | Green |
| 60–89% | Amber |
| < 60% | Red |
| No score | Grey/blank |

### 6.4 Student Alerts

Students whose term average falls below the class `alertThreshold` (default 60%) are flagged with a warning icon on the assessment scoreboard and on the dashboard.

### 6.5 Teacher Notes Card

Located in the Assessment Scoreboard summary cards area. Displays class-level notes. Clicking the card opens an edit dialog with a textarea. Saves via `teacherNotes.upsert`.

### 6.6 Assessment Details Dialog

Opened via the info icon on each assessment column header. Contains:
- Read-only summary (name, date, type, max score)
- Free-form description textarea (editable)
- PDF test paper upload (max 10MB, stored in S3 under `test-papers/{assessmentId}/{suffix}-{filename}`)
- View, Replace, and Remove options for existing PDF

### 6.7 Parent View (`/parent/:token`)

A public, read-only page accessible via a unique share link generated by the teacher. Shows:
- Student name and class info
- Grade summary table (assessment name, score, max score, percentage)
- Term average with colour coding
- Homework summary (assignment name, week, due date, status)
- Submission rate

### 6.8 Analytics Page

- Per-class view with summary cards (class average, submission rate)
- Average Score Trend line chart (score over time by assessment date)
- Grade Distribution donut chart (percentage of students in each colour band)
- Student performance bar chart
- Top Performers list
- Students Needing Support list (below alert threshold)
- Admin view: aggregated analytics across all classes

### 6.9 Reports Page

- Filter by class
- Export gradebook as CSV (student name, student ID, assessment scores, term average)
- Export homework submission data as CSV (student name, assignment name, week, status)

### 6.10 AI-Generated Reports

- Individual student narrative report (LLM-generated based on grades and submissions)
- Full class summary report (LLM-generated)
- Output as plain text download

---

## 7. Authentication Flow

1. Teacher visits `/register`, submits name + email + password.
2. Server hashes password with bcrypt (12 rounds), creates user with `accountStatus = "pending"`.
3. Admin logs in, navigates to Settings → User Management, approves the teacher.
4. Teacher visits `/login`, submits email + password.
5. Server verifies bcrypt hash, checks `accountStatus === "approved"`, issues a 30-day JWT session cookie.
6. All subsequent requests to `/api/trpc` include the cookie; server validates it and attaches `ctx.user`.
7. On logout, the cookie is cleared.

**Admin account setup:** The first admin account must be created directly in the database (set `role = "admin"`, `eduRole = "admin"`, `accountStatus = "approved"`).

---

## 8. File Storage

PDF test papers are stored in S3-compatible object storage. The key format is:

```
test-papers/{assessmentId}/{nanoid(8)}-{originalFileName}
```

Files are uploaded as base64-encoded strings via the `assessments.uploadFile` tRPC procedure. The server decodes the base64, uploads to S3 via `storagePut`, and stores the resulting `key`, `url`, and `fileName` on the assessment record.

---

## 9. Design System

- **Primary colour:** Blue `#2563EB` (Tailwind `blue-600`)
- **Background:** White / light grey
- **Theme:** Light mode only
- **Typography:** System font stack (Tailwind default)
- **Component library:** shadcn/ui (Radix UI primitives + Tailwind)
- **Charts:** Recharts
- **Layout:** DashboardLayout with persistent left sidebar for all authenticated pages
- **Sidebar nav items:** Dashboard, Classes, Students, Analytics, Reports, Settings

---

## 10. Business Rules Summary

1. Teachers can create a maximum of **3 classes**.
2. New teacher accounts start as **pending** and require admin approval before login.
3. Only accounts with `accountStatus = "approved"` can log in.
4. Student IDs are auto-generated as `{SECTION_PREFIX}{INDEX:04d}` (e.g. `10A0001`) but can be customised; uniqueness is enforced per class.
5. Submissions are unique per `(studentId, assignmentId)` — upsert on conflict.
6. Grades are unique per `(studentId, assessmentId)` — upsert on conflict.
7. Submission rate = (submitted + late) / (total students × total assignments) × 100, capped at 100%.
8. Term average = mean of (score / maxScore × 100) across all graded assessments for a student.
9. Students below the class `alertThreshold` (default 60%) are flagged with a warning icon.
10. Share tokens for parent view are nanoid(16) strings stored on the student record; they can be regenerated or revoked.
11. PDF test papers are stored in S3; the database stores only the key, URL, and filename.
12. Admin users can view all classes, all students, and all analytics across all teachers.

---

## 11. Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session cookie signing secret |
| S3 credentials | For file storage (bucket, key, secret, endpoint) |

---

## 12. Rebuild Recommendations

When rebuilding on another platform, the following decisions should be preserved:

**Database:** The unique constraints on `submissions(studentId, assignmentId)` and `grades(studentId, assessmentId)` are critical — without them, submission rates will exceed 100% and chart scores will show null. Use `INSERT ... ON CONFLICT DO UPDATE` (PostgreSQL) or equivalent upsert semantics.

**Auth:** The account approval workflow (pending → approved) is a core feature. Ensure the login endpoint blocks any account that is not explicitly `approved`.

**Student ID:** The auto-generation logic (`generateStudentId`) should be preserved. The uniqueness check must query existing students in the same class before accepting a custom ID.

**Submission status cycle:** The 4-state cycle (`pending → submitted → late → missing → pending`) is the core UX of the homework tracker. Implement this as a client-side cycle with an immediate optimistic update.

**Score entry:** Inline score entry in the assessment grid should support both click-to-edit (single cell) and Quick Entry mode (tab-through all students for one assessment column).

**Parent view:** The `/parent/:token` route must be fully public (no auth). The share token must be validated server-side on every request.

---

## 13. Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| Submission rate >100% | Added `UNIQUE INDEX uq_submission` on `(studentId, assignmentId)` |
| Assessment score showing null on chart | Added `UNIQUE INDEX uq_grade` on `(studentId, assessmentId)` |
| Pending users could log in | Changed login check from `=== "rejected"` to `!== "approved"` |
| Debug logs leaking PII | Removed `console.log` statements logging email and bcrypt result |
| `teacherNotes.get` returning undefined | Changed return type to `null` when no row exists |
| Empty `Select.Item` value crash | Replaced empty string with `__none__` sentinel in CSV import wizard |

---

*Document generated: March 2026. EduTrack LMS v1.0 MVP.*
