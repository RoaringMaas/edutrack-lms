# EduTrack LMS — User Manual for School Administrators

**Version:** 1.0  
**Last Updated:** February 2026  
**Prepared by:** Manus AI

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Getting Started](#getting-started)
3. [Teacher Account Login](#teacher-account-login)
4. [Dashboard Overview](#dashboard-overview)
5. [Core Features & Navigation](#core-features--navigation)
6. [Key Workflows](#key-workflows)
7. [Administrative Oversight](#administrative-oversight)
8. [Benefits for Your School](#benefits-for-your-school)

---

## Executive Summary

**EduTrack LMS** is a modern, cloud-based learning management system designed to streamline homework tracking, assessment management, and student performance monitoring. Built specifically for independent teachers and schools, EduTrack eliminates manual gradebook management, reduces administrative overhead, and provides real-time insights into student progress.

### Why EduTrack?

- **Time-saving**: Automated homework and grade tracking reduces teacher paperwork by up to 70%
- **Real-time visibility**: Administrators can monitor all classes and teacher performance from a single dashboard
- **Data-driven decisions**: Built-in analytics help identify struggling students and track class trends
- **Easy adoption**: Intuitive interface requires minimal training; teachers are productive within minutes
- **Scalable**: Supports multiple classes, subjects, and academic terms without performance degradation

---

## Getting Started

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet**: Stable internet connection required
- **Device**: Desktop, laptop, or tablet
- **Account**: Email address and password for teacher or admin account

### Initial Setup for Your School

1. **Contact the EduTrack team** to set up your school account
2. **Create admin account** — You will receive login credentials for the administrator dashboard
3. **Invite teachers** — Admins can invite teachers via email; they will receive a registration link
4. **Configure settings** — Set academic year, terms, and alert thresholds (see Settings section)
5. **Teachers create classes** — Each teacher sets up their classes and begins adding students

---

## Teacher Account Login

### First-Time Login (Registration)

1. **Receive invitation email** from your school administrator with a registration link
2. **Click the link** in the email to open the EduTrack login page
3. **Enter your details**:
   - Email address (same as invitation)
   - Full name
   - Password (minimum 8 characters, recommended: mix of letters, numbers, symbols)
4. **Click "Register"** to create your account
5. **You are now logged in** and can begin setting up your first class

### Returning Login

1. **Visit the EduTrack login page** (provided by your administrator)
2. **Enter your email address** and password
3. **Click "Sign in"**
4. **You are redirected to your Dashboard** (see Dashboard Overview below)

### Forgot Password?

1. Click **"Forgot Password?"** on the login page
2. Enter your email address
3. Check your email for a password reset link
4. Click the link and create a new password
5. Log in with your new password

---

## Dashboard Overview

After logging in, teachers see the **Dashboard** — a high-level overview of their classes and students.

### Dashboard Components

| Component | Purpose |
|-----------|---------|
| **Total Classes** | Shows the number of active classes you manage |
| **Active Terms** | Displays the current academic year and term |
| **Quick Access** | Links to Analytics & Reports for fast navigation |
| **All Classes** | Grid showing each class with subject, grade, section, student count, assessment count, and class average |
| **Student Alerts** | Highlights students whose average score drops below your configured threshold (default: 60%) |

### Dashboard Actions

- **Click a class card** to open the class detail page and begin managing students, homework, and assessments
- **View All** to see all classes if more than three are displayed
- **Access Analytics** to view school-wide performance trends

---

## Core Features & Navigation

### Main Navigation Menu

The left sidebar provides access to all major features:

| Menu Item | Purpose |
|-----------|---------|
| **Dashboard** | Home page; overview of all classes and alerts |
| **Classes** | Manage class roster, settings, and metadata |
| **Students** | View all students across your classes |
| **Analytics** | View performance trends, grade distribution, and student insights |
| **Reports** | Export gradebook and submission data as CSV |
| **Settings** | Configure account, academic year, alert thresholds |

### Class Management

When you open a class, three large navigation tabs appear at the top:

#### 1. **Students Tab**

The **Students** tab displays your class roster with the following features:

- **Student List**: Each student shows name, auto-generated student ID, and avatar initials
- **Customize Student ID**: Click the edit icon next to any student to change their ID code (e.g., from "10A0001" to a custom value like "S001")
- **Add Student**: Click "+ Add Student" to manually enter a new student's name
- **Bulk Import**: Click "Import from CSV" to upload a spreadsheet with multiple students
  - **Step 1**: Upload a CSV or XLSX file with student data
  - **Step 2**: Map column headers (e.g., "Name" → Student Name, "ID" → Student ID)
  - **Step 3**: Preview the import and confirm
- **Delete Student**: Click the trash icon to remove a student from the class

#### 2. **Homework Tab**

The **Homework** tab is a weekly submission tracking matrix where you monitor which students have submitted assignments.

**How to use:**

- **Columns**: Each column represents a homework assignment (e.g., "Math Problem Set", "Essay Draft")
- **Rows**: Each row represents a student
- **Status indicators**: Click any cell to toggle the submission status:
  - ✅ **Submitted** — Student turned in work on time
  - ⏰ **Late** — Student submitted after the deadline
  - ❌ **Missing** — Student did not submit
  - ⚪ **Pending** — Awaiting submission (default)
- **Add Assignment**: Click "+ Add Assignment" to create a new homework task with:
  - Assignment name (e.g., "Chapter 5 Exercises")
  - Due date
  - Points value (optional)
- **Edit Assignment**: Click the edit icon next to an assignment name to change its name, due date, or points
- **Summary Stats**: At the top, see:
  - **Submission Rate**: Percentage of students who submitted (e.g., "85%")
  - **Missing**: Count of students who did not submit
  - **Late**: Count of students who submitted late
  - **Pending**: Count of students still awaiting submission

#### 3. **Assessments Tab**

The **Assessments** tab is a scoreboard grid for tracking test and quiz scores.

**Grid layout:**

- **Rows**: Students (with name, ID, and avatar)
- **Columns**: Assessments (with name, date, and max score)
- **Last column**: Term Average with a color-coded progress bar
- **Bottom row**: Class Average for each assessment

**Score color coding:**

- 🟢 **Green** (>90%): Excellent performance
- 🟡 **Amber** (60–89%): Satisfactory performance
- 🔴 **Red** (<60%): Below threshold; student flagged for support

**How to use:**

- **Enter scores**: Click any cell to type a score; press Enter to save
- **View score details**: Hover over a score to see the percentage and letter grade
- **Add Assessment**: Click "+ Add Assessment" to create a new test or quiz with:
  - Assessment name (e.g., "Midterm Exam")
  - Date taken
  - Type (Test, Quiz, Project, etc.)
  - Maximum score
- **Assessment Details**: Click the info icon (ℹ️) on an assessment column header to:
  - View assessment metadata (name, date, max score)
  - Write or edit test instructions and notes
  - Upload a test paper (PDF, max 10MB)
  - View, replace, or remove the uploaded file
- **Quick Entry Mode**: Click "Quick Entry" to activate rapid grading:
  - Select an assessment column
  - Type scores and press Tab to move to the next student
  - Ideal for grading immediately after a test
- **Search & Filter**: Use the search box to find specific students by name or ID
- **Toggle Points/Percentage**: Switch between viewing raw scores or percentages

---

## Key Workflows

### Workflow 1: Setting Up a New Class

**Estimated time: 10 minutes**

1. **Log in** to your EduTrack account
2. **Click "Classes"** in the left navigation
3. **Click "+ Create Class"**
4. **Enter class details**:
   - Subject (e.g., "Mathematics")
   - Grade level (e.g., "Grade 10")
   - Section (e.g., "10A")
   - Academic year and term
5. **Click "Create"**
6. **You are taken to the class page** — now add students (see Workflow 2)

### Workflow 2: Adding Students to a Class

**Option A: Manual Entry**

1. Open your class and click the **Students** tab
2. Click "+ Add Student"
3. Enter the student's name
4. Click "Add" — the system auto-generates a student ID
5. Repeat for each student

**Option B: Bulk Import (Recommended for large classes)**

1. Open your class and click the **Students** tab
2. Click "Import from CSV"
3. **Step 1**: Upload your CSV file (columns: Name, Email, ID, etc.)
4. **Step 2**: Map columns — match your CSV headers to system fields
5. **Step 3**: Preview and confirm the import
6. Click "Import" — all students are added at once

### Workflow 3: Tracking Weekly Homework

**Estimated time: 5 minutes per week**

1. Open your class and click the **Homework** tab
2. **Create assignments for the week**:
   - Click "+ Add Assignment"
   - Enter name, due date, and points
   - Click "Create"
3. **Update submission status**:
   - Click each cell to toggle status (Submitted, Late, Missing, Pending)
   - Or click a student row to update all their statuses at once
4. **Review summary stats** at the top to see submission rate and missing count
5. **Export data** (optional): Go to Reports tab to download homework data as CSV

### Workflow 4: Recording Assessment Scores

**Estimated time: 15 minutes for a class of 30 students**

1. Open your class and click the **Assessments** tab
2. **Create a new assessment**:
   - Click "+ Add Assessment"
   - Enter name (e.g., "Midterm Exam"), date, type, and max score
   - Click "Create"
3. **Enter scores**:
   - Click a cell in the new assessment column
   - Type the score and press Enter
   - Repeat for all students
4. **Or use Quick Entry mode** for faster grading:
   - Click "Quick Entry"
   - Select the assessment column
   - Type scores and press Tab to move to the next student
5. **Review the scoreboard**:
   - See individual scores and term averages
   - Identify students below the alert threshold (red flags)
   - Check class average at the bottom row

### Workflow 5: Monitoring Student Performance

**Estimated time: 10 minutes**

1. **From the Dashboard**:
   - Look for "Student Alerts" section
   - Students with average scores below 60% (or your configured threshold) are highlighted
2. **From the Assessments tab**:
   - Look for red-highlighted scores (<60%)
   - Click on a student's name to view their detailed performance
3. **From Analytics**:
   - Click "Analytics" in the left navigation
   - View "Students Needing Support" list
   - See grade distribution and trends over time

---

## Administrative Oversight

### Admin Dashboard

As a school administrator, you have access to a **School Overview** dashboard that displays:

- **Total Classes**: Number of active classes across all teachers
- **Active Terms**: Current academic year and term
- **All Classes Grid**: Shows each class with teacher name, subject, grade, student count, and class average
- **Class Average**: Aggregated performance metrics across all classes

### Admin Features

| Feature | Purpose |
|---------|---------|
| **View All Classes** | See all classes taught by all teachers in read-only mode |
| **Monitor Performance** | Track class averages and identify classes needing support |
| **Access Analytics** | View school-wide grade distribution, trends, and alerts |
| **Manage Teachers** | View teacher accounts, assign roles, and manage permissions |
| **Configure Settings** | Set academic year, terms, and default alert thresholds for all classes |

### How to Invite Teachers

1. **Click "Settings"** in the left navigation
2. **Click "Manage Teachers"**
3. **Click "+ Invite Teacher"**
4. **Enter teacher's email address**
5. **Click "Send Invite"** — the teacher receives an email with a registration link

### How to Configure Alert Thresholds

1. **Click "Settings"** in the left navigation
2. **Click "Alert Thresholds"**
3. **Set the percentage threshold** (default: 60%)
   - Students with average scores below this percentage will be flagged
4. **Click "Save"** — the threshold applies to all classes

---

## Benefits for Your School

### Operational Efficiency

- **Reduce administrative burden**: Teachers spend less time on manual grading and record-keeping
- **Centralized data**: All student records, grades, and homework data in one secure location
- **Automated alerts**: Identify struggling students automatically; no need for manual monitoring
- **Bulk operations**: Import 100+ students in minutes instead of hours

### Data-Driven Decision Making

- **Real-time dashboards**: Admins see school-wide performance at a glance
- **Trend analysis**: Track performance over weeks and terms to identify patterns
- **Student insights**: Detailed performance reports help teachers provide targeted support
- **Export capabilities**: Download data for further analysis or reporting to parents

### Teacher Productivity

- **Intuitive interface**: Teachers are productive within minutes; minimal training required
- **Time savings**: Automated homework tracking and quick-entry grading reduce workload by up to 70%
- **Mobile-friendly**: Access from any device with a web browser
- **Instant feedback**: Teachers can see which students are struggling and intervene early

### Student Outcomes

- **Early intervention**: Flagged students receive support before falling further behind
- **Transparency**: Clear performance tracking helps students understand expectations
- **Engagement**: Regular feedback and progress monitoring motivate students
- **Accountability**: Homework and assessment data provide objective performance metrics

### Cost Effectiveness

- **No installation required**: Cloud-based system; no server setup or maintenance
- **Scalable pricing**: Pay only for what you use; no hidden fees
- **Reduced paper usage**: Digital-first approach saves printing costs
- **Minimal IT support**: Cloud infrastructure is managed by EduTrack; your IT team focuses on other priorities

---

## Getting Help

### For Teachers

- **In-app help**: Click the "?" icon in the top-right corner for contextual help
- **Email support**: Contact support@edutrack.com with questions or issues
- **Video tutorials**: Visit our knowledge base at help.edutrack.com

### For Administrators

- **Admin portal**: Access admin-specific documentation at admin.edutrack.com
- **Dedicated support**: Email admin-support@edutrack.com for priority assistance
- **Training sessions**: Request a live training session for your admin team

---

## Conclusion

EduTrack LMS is designed to empower teachers and administrators with the tools to manage student performance efficiently and effectively. By centralizing homework tracking, assessment management, and analytics, EduTrack helps your school improve student outcomes while reducing administrative overhead.

**Ready to get started?** Contact the EduTrack team today to schedule a demo or begin your school's implementation.

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**For questions or feedback, contact:** support@edutrack.com
