import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  classes,
  students,
  assignments,
  submissions,
  assessments,
  grades,
  teacherNotes,
  type Class,
  type InsertClass,
  type Student,
  type InsertStudent,
  type Assignment,
  type InsertAssignment,
  type Submission,
  type InsertSubmission,
  type Assessment,
  type InsertAssessment,
  type Grade,
  type InsertGrade,
  type TeacherNote,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

export async function updateUserEduRole(userId: number, eduRole: "teacher" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ eduRole }).where(eq(users.id, userId));
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function getClassesByTeacher(teacherId: number): Promise<Class[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classes).where(eq(classes.teacherId, teacherId));
}

export async function getAllClasses(): Promise<Class[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classes);
}

export async function getClassById(classId: number): Promise<Class | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  return result[0];
}

export async function createClass(data: InsertClass): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(classes).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateClass(classId: number, data: Partial<InsertClass>) {
  const db = await getDb();
  if (!db) return;
  await db.update(classes).set(data).where(eq(classes.id, classId));
}

export async function deleteClass(classId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(classes).where(eq(classes.id, classId));
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudentsByClass(classId: number): Promise<Student[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.classId, classId));
}

export async function getStudentById(studentId: number): Promise<Student | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  return result[0];
}

export async function createStudent(data: InsertStudent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(students).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function createStudentsBulk(data: InsertStudent[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(students).values(data);
}

export async function updateStudent(studentId: number, data: Partial<InsertStudent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(students).set(data).where(eq(students.id, studentId));
}

export async function deleteStudent(studentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(students).where(eq(students.id, studentId));
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function getAssignmentsByClass(classId: number): Promise<Assignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assignments).where(eq(assignments.classId, classId));
}

export async function createAssignment(data: InsertAssignment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(assignments).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function deleteAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(assignments).where(eq(assignments.id, assignmentId));
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function getSubmissionsByClass(classId: number): Promise<Submission[]> {
  const db = await getDb();
  if (!db) return [];
  const classAssignments = await getAssignmentsByClass(classId);
  if (classAssignments.length === 0) return [];
  const assignmentIds = classAssignments.map((a) => a.id);
  return db.select().from(submissions).where(inArray(submissions.assignmentId, assignmentIds));
}

export async function upsertSubmission(
  studentId: number,
  assignmentId: number,
  status: "submitted" | "late" | "missing" | "pending"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(submissions)
    .values({ studentId, assignmentId, status })
    .onDuplicateKeyUpdate({ set: { status } });
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function getAssessmentsByClass(classId: number): Promise<Assessment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assessments).where(eq(assessments.classId, classId));
}

export async function getAssessmentById(assessmentId: number): Promise<Assessment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  return result[0];
}

export async function createAssessment(data: InsertAssessment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(assessments).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateAssessment(assessmentId: number, data: Partial<InsertAssessment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(assessments).set(data).where(eq(assessments.id, assessmentId));
}

export async function deleteAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
}

// ─── Grades ───────────────────────────────────────────────────────────────────

export async function getGradesByClass(classId: number): Promise<Grade[]> {
  const db = await getDb();
  if (!db) return [];
  const classAssessments = await getAssessmentsByClass(classId);
  if (classAssessments.length === 0) return [];
  const assessmentIds = classAssessments.map((a) => a.id);
  return db.select().from(grades).where(inArray(grades.assessmentId, assessmentIds));
}

export async function getGradesByStudent(studentId: number): Promise<Grade[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(grades).where(eq(grades.studentId, studentId));
}

export async function upsertGrade(
  studentId: number,
  assessmentId: number,
  score: number | null
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(grades)
    .values({ studentId, assessmentId, score })
    .onDuplicateKeyUpdate({ set: { score } });
}

export async function upsertGradesBulk(
  entries: { studentId: number; assessmentId: number; score: number | null }[]
): Promise<void> {
  const db = await getDb();
  if (!db || entries.length === 0) return;
  for (const entry of entries) {
    await upsertGrade(entry.studentId, entry.assessmentId, entry.score);
  }
}

// ─── Teacher Notes ────────────────────────────────────────────────────────────

export async function getTeacherNotes(classId: number): Promise<TeacherNote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teacherNotes).where(eq(teacherNotes.classId, classId)).limit(1);
  return result[0];
}

export async function upsertTeacherNotes(classId: number, notes: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(teacherNotes)
    .values({ classId, notes })
    .onDuplicateKeyUpdate({ set: { notes } });
}
