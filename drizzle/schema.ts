import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // EduTrack role: teacher or admin
  eduRole: mysqlEnum("eduRole", ["teacher", "admin"]).default("teacher").notNull(),
  avatarInitials: varchar("avatarInitials", { length: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Classes ──────────────────────────────────────────────────────────────────

export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  subjectName: varchar("subjectName", { length: 128 }).notNull(),
  gradeLevel: varchar("gradeLevel", { length: 32 }).notNull(),
  section: varchar("section", { length: 32 }).notNull(),
  academicYear: varchar("academicYear", { length: 16 }).notNull(), // e.g. "2024-2025"
  term: varchar("term", { length: 32 }).notNull(), // e.g. "Term 1", "Semester 2"
  alertThreshold: int("alertThreshold").default(60).notNull(), // percentage
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

// ─── Students ─────────────────────────────────────────────────────────────────

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull(),
  studentId: varchar("studentId", { length: 32 }).notNull(), // auto-generated
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  shareToken: varchar("shareToken", { length: 32 }), // unique token for parent-facing read-only link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ─── Assignments (Homework) ───────────────────────────────────────────────────

export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  dueDate: date("dueDate"),
  weekNumber: int("weekNumber"),
  weekLabel: varchar("weekLabel", { length: 32 }), // e.g. "Week 12"
  points: int("points").default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  assignmentId: int("assignmentId").notNull(),
  status: mysqlEnum("status", ["submitted", "late", "missing", "pending"])
    .default("pending")
    .notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

// ─── Assessments ──────────────────────────────────────────────────────────────

export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  dateTaken: date("dateTaken"),
  type: mysqlEnum("type", ["quiz", "exam", "project", "activity", "other"])
    .default("quiz")
    .notNull(),
  maxScore: int("maxScore").default(100).notNull(),
  description: text("description"),
  filePath: text("filePath"), // S3 key for PDF test paper
  fileUrl: text("fileUrl"),   // S3 public URL
  fileName: text("fileName"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

// ─── Grades ───────────────────────────────────────────────────────────────────

export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  assessmentId: int("assessmentId").notNull(),
  score: float("score"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = typeof grades.$inferInsert;

// ─── Teacher Notes ────────────────────────────────────────────────────────────

export const teacherNotes = mysqlTable("teacherNotes", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull().unique(),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeacherNote = typeof teacherNotes.$inferSelect;
export type InsertTeacherNote = typeof teacherNotes.$inferInsert;
