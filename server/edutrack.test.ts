/**
 * EduTrack LMS — Core Procedure Tests
 *
 * Tests cover: classes, students, assignments, submissions,
 * assessments, grades, and reports procedures.
 * Database calls are mocked so tests run without a live DB.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ─── Mock all DB helpers ───────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getClassesByTeacher: vi.fn(),
  getAllClasses: vi.fn(),
  getClassById: vi.fn(),
  createClass: vi.fn(),
  updateClass: vi.fn(),
  deleteClass: vi.fn(),
  getStudentsByClass: vi.fn(),
  getStudentById: vi.fn(),
  createStudent: vi.fn(),
  createStudentsBulk: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  getAssignmentsByClass: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  getSubmissionsByClass: vi.fn(),
  upsertSubmission: vi.fn(),
  getAssessmentsByClass: vi.fn(),
  getAssessmentById: vi.fn(),
  createAssessment: vi.fn(),
  updateAssessment: vi.fn(),
  deleteAssessment: vi.fn(),
  getGradesByClass: vi.fn(),
  getGradesByStudent: vi.fn(),
  upsertGrade: vi.fn(),
  upsertGradesBulk: vi.fn(),
  getTeacherNotes: vi.fn(),
  upsertTeacherNotes: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserEduRole: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/file.pdf", key: "file.pdf" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "AI-generated narrative report." } }],
  }),
}));

import * as db from "./db";
import { appRouter } from "./routers";

// ─── Context Factories ────────────────────────────────────────────────────────

function makeTeacherCtx(overrides?: Partial<TrpcContext["user"]>): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "teacher-openid",
      name: "Test Teacher",
      email: "teacher@test.com",
      loginMethod: "manus",
      role: "user",
      eduRole: "teacher",
      avatarInitials: "TT",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function makeAdminCtx(): TrpcContext {
  return makeTeacherCtx({ id: 99, role: "admin", eduRole: "admin" });
}

const SAMPLE_CLASS = {
  id: 10,
  teacherId: 1,
  subjectName: "Mathematics",
  gradeLevel: "Grade 7",
  section: "A",
  academicYear: "2024-2025",
  term: "Term 1",
  alertThreshold: 60,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SAMPLE_STUDENT = {
  id: 5,
  classId: 10,
  studentId: "MAT0001",
  name: "Alice Smith",
  email: "alice@test.com",
  createdAt: new Date(),
};

const SAMPLE_ASSESSMENT = {
  id: 3,
  classId: 10,
  name: "Quiz 1",
  type: "quiz",
  maxScore: 100,
  dateTaken: new Date(),
  description: null,
  pdfUrl: null,
  createdAt: new Date(),
};

const SAMPLE_ASSIGNMENT = {
  id: 7,
  classId: 10,
  name: "HW Week 1",
  weekLabel: "Week 1",
  dueDate: new Date(),
  createdAt: new Date(),
};

// ─── Classes ──────────────────────────────────────────────────────────────────

describe("classes.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns teacher's own classes for a teacher user", async () => {
    vi.mocked(db.getClassesByTeacher).mockResolvedValue([SAMPLE_CLASS]);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.classes.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.subjectName).toBe("Mathematics");
    expect(db.getClassesByTeacher).toHaveBeenCalledWith(1);
    expect(db.getAllClasses).not.toHaveBeenCalled();
  });

  it("returns all classes for an admin user", async () => {
    vi.mocked(db.getAllClasses).mockResolvedValue([SAMPLE_CLASS]);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.classes.list();
    expect(result).toHaveLength(1);
    expect(db.getAllClasses).toHaveBeenCalled();
    expect(db.getClassesByTeacher).not.toHaveBeenCalled();
  });
});

describe("classes.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a class and returns the new id", async () => {
    vi.mocked(db.getClassesByTeacher).mockResolvedValue([]); // 0 existing classes
    vi.mocked(db.createClass).mockResolvedValue(10);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.classes.create({
      subjectName: "Mathematics",
      gradeLevel: "Grade 7",
      section: "A",
      academicYear: "2024-2025",
      term: "Term 1",
    });
    expect(result.id).toBe(10);
    expect(db.createClass).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when teacher already has 3 classes", async () => {
    vi.mocked(db.getClassesByTeacher).mockResolvedValue([
      SAMPLE_CLASS,
      { ...SAMPLE_CLASS, id: 11 },
      { ...SAMPLE_CLASS, id: 12 },
    ]);
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(
      caller.classes.create({
        subjectName: "Science",
        gradeLevel: "Grade 8",
        section: "B",
        academicYear: "2024-2025",
        term: "Term 1",
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("classes.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a class owned by the teacher", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.deleteClass).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.classes.delete({ classId: 10 });
    expect(result.success).toBe(true);
    expect(db.deleteClass).toHaveBeenCalledWith(10);
  });

  it("throws FORBIDDEN when teacher tries to delete another teacher's class", async () => {
    vi.mocked(db.getClassById).mockResolvedValue({ ...SAMPLE_CLASS, teacherId: 999 });
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.classes.delete({ classId: 10 })).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when class does not exist", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.classes.delete({ classId: 999 })).rejects.toThrow(TRPCError);
  });
});

// ─── Students ─────────────────────────────────────────────────────────────────

describe("students.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns students for a class the teacher owns", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getStudentsByClass).mockResolvedValue([SAMPLE_STUDENT]);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.students.list({ classId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Alice Smith");
  });

  it("throws FORBIDDEN when accessing another teacher's class", async () => {
    vi.mocked(db.getClassById).mockResolvedValue({ ...SAMPLE_CLASS, teacherId: 999 });
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.students.list({ classId: 10 })).rejects.toThrow(TRPCError);
  });
});

describe("students.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a student and returns the new id", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getStudentsByClass).mockResolvedValue([]);
    vi.mocked(db.createStudent).mockResolvedValue(5);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.students.create({ classId: 10, name: "Bob Jones" });
    expect(result.id).toBe(5);
    expect(db.createStudent).toHaveBeenCalledOnce();
  });
});

// ─── Assignments & Submissions ────────────────────────────────────────────────

describe("assignments.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an assignment for a teacher-owned class", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.createAssignment).mockResolvedValue(7);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.assignments.create({
      classId: 10,
      name: "HW Week 1",
      weekLabel: "Week 1",
    });
    expect(result.id).toBe(7);
  });
});

describe("submissions.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts a submission status", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.upsertSubmission).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.submissions.upsert({
      classId: 10,
      studentId: 5,
      assignmentId: 7,
      status: "submitted",
    });
    expect(result.success).toBe(true);
    expect(db.upsertSubmission).toHaveBeenCalledWith(5, 7, "submitted");
  });
});

// ─── Assessments & Grades ─────────────────────────────────────────────────────

describe("assessments.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an assessment and returns the new id", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.createAssessment).mockResolvedValue(3);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.assessments.create({
      classId: 10,
      name: "Quiz 1",
      type: "quiz",
      maxScore: 100,
    });
    expect(result.id).toBe(3);
  });
});

describe("grades.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts a grade and returns success", async () => {
    vi.mocked(db.getAssessmentById).mockResolvedValue(SAMPLE_ASSESSMENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.upsertGrade).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.grades.upsert({
      studentId: 5,
      assessmentId: 3,
      score: 85,
    });
    expect(result.success).toBe(true);
    expect(db.upsertGrade).toHaveBeenCalledWith(5, 3, 85);
  });

  it("accepts null score to clear a grade", async () => {
    vi.mocked(db.getAssessmentById).mockResolvedValue(SAMPLE_ASSESSMENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.upsertGrade).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.grades.upsert({ studentId: 5, assessmentId: 3, score: null });
    expect(result.success).toBe(true);
    expect(db.upsertGrade).toHaveBeenCalledWith(5, 3, null);
  });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

describe("reports.generateStudentReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a class-wide report when no studentId is provided", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getAssessmentsByClass).mockResolvedValue([SAMPLE_ASSESSMENT]);
    vi.mocked(db.getSubmissionsByClass).mockResolvedValue([]);
    vi.mocked(db.getAssignmentsByClass).mockResolvedValue([SAMPLE_ASSIGNMENT]);
    vi.mocked(db.getStudentsByClass).mockResolvedValue([SAMPLE_STUDENT]);
    vi.mocked(db.getGradesByClass).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.reports.generateStudentReport({ classId: 10 });
    expect(result.narrative).toBe("AI-generated narrative report.");
    expect(result.studentName).toBeUndefined();
  });

  it("generates a student-specific report when studentId is provided", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getAssessmentsByClass).mockResolvedValue([SAMPLE_ASSESSMENT]);
    vi.mocked(db.getSubmissionsByClass).mockResolvedValue([]);
    vi.mocked(db.getAssignmentsByClass).mockResolvedValue([SAMPLE_ASSIGNMENT]);
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getGradesByStudent).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.reports.generateStudentReport({ classId: 10, studentId: 5 });
    expect(result.narrative).toBe("AI-generated narrative report.");
    expect(result.studentName).toBe("Alice Smith");
  });

  it("throws NOT_FOUND when class does not exist", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(
      caller.reports.generateStudentReport({ classId: 999 })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

describe("admin.listUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all users for admin", async () => {
    vi.mocked(db.getAllUsers).mockResolvedValue([
      { id: 1, name: "Teacher A", email: "a@test.com", eduRole: "teacher" } as any,
    ]);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.listUsers();
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.admin.listUsers()).rejects.toThrow(TRPCError);
  });
});
