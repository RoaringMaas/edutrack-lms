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
  updateAssignment: vi.fn(),
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
  updateUserAccountStatus: vi.fn(),
  getStudentByCode: vi.fn(),
  getStudentByShareToken: vi.fn(),
  setStudentShareToken: vi.fn(),
  getUserByEmail: vi.fn(),
  createUserWithPassword: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
  updateUserPassword: vi.fn(),
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
  shareToken: null as string | null,
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

describe("students.update", () => {
  beforeEach(() => vi.clearAllMocks());
  it("updates name and email without changing the student ID code", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.updateStudent).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.students.update({ studentId: 5, name: "Alice Updated", email: "new@test.com" });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledOnce();
  });
  it("updates the student ID code when it is unique in the class", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getStudentByCode).mockResolvedValue(undefined);
    vi.mocked(db.updateStudent).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.students.update({ studentId: 5, name: "Alice", studentIdCode: "MAT9999" });
    expect(result.success).toBe(true);
    expect(db.getStudentByCode).toHaveBeenCalledWith(10, "MAT9999");
    expect(db.updateStudent).toHaveBeenCalledOnce();
  });
  it("throws CONFLICT when the new student ID code is already taken", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getStudentByCode).mockResolvedValue({ ...SAMPLE_STUDENT, id: 99, studentId: "MAT9999" });
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(
      caller.students.update({ studentId: 5, name: "Alice", studentIdCode: "MAT9999" })
    ).rejects.toThrow(TRPCError);
    expect(db.updateStudent).not.toHaveBeenCalled();
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

describe("assignments.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates assignment name, points, and due date", async () => {
    vi.mocked(db.updateAssignment).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.assignments.update({
      assignmentId: 7,
      name: "Updated HW Week 1",
      points: 50,
      dueDate: "2026-03-15",
    });
    expect(result.success).toBe(true);
    expect(db.updateAssignment).toHaveBeenCalledWith(7, {
      name: "Updated HW Week 1",
      points: 50,
      dueDate: expect.any(Date),
    });
  });

  it("updates only the name if other fields are omitted", async () => {
    vi.mocked(db.updateAssignment).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.assignments.update({
      assignmentId: 7,
      name: "Renamed Assignment",
    });
    expect(result.success).toBe(true);
    expect(db.updateAssignment).toHaveBeenCalledWith(7, {
      name: "Renamed Assignment",
      points: undefined,
      dueDate: undefined,
    });
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

// ─── Share Links ──────────────────────────────────────────────────────────

describe("shareLinks.generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a share token for a student owned by the teacher", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.setStudentShareToken).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.shareLinks.generate({ studentId: 5 });
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
    expect(db.setStudentShareToken).toHaveBeenCalledWith(5, expect.any(String));
  });

  it("throws NOT_FOUND when student does not exist", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.shareLinks.generate({ studentId: 999 })).rejects.toThrow(TRPCError);
  });

  it("throws FORBIDDEN when teacher does not own the class", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(SAMPLE_STUDENT);
    vi.mocked(db.getClassById).mockResolvedValue({ ...SAMPLE_CLASS, teacherId: 999 });
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(caller.shareLinks.generate({ studentId: 5 })).rejects.toThrow(TRPCError);
  });
});

describe("shareLinks.revoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes a share token for a student owned by the teacher", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue({ ...SAMPLE_STUDENT, shareToken: "abc123" });
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.setStudentShareToken).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.shareLinks.revoke({ studentId: 5 });
    expect(result.success).toBe(true);
    expect(db.setStudentShareToken).toHaveBeenCalledWith(5, null);
  });
});

// ─── Parent View (public) ─────────────────────────────────────────────────

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("parentView.getByToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns student summary when token is valid", async () => {
    vi.mocked(db.getStudentByShareToken).mockResolvedValue({ ...SAMPLE_STUDENT, shareToken: "valid-token" });
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getAssessmentsByClass).mockResolvedValue([SAMPLE_ASSESSMENT]);
    vi.mocked(db.getAssignmentsByClass).mockResolvedValue([SAMPLE_ASSIGNMENT]);
    vi.mocked(db.getSubmissionsByClass).mockResolvedValue([]);
    vi.mocked(db.getGradesByStudent).mockResolvedValue([]);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.parentView.getByToken({ token: "valid-token" });

    expect(result.student.name).toBe("Alice Smith");
    expect(result.student.studentId).toBe("MAT0001");
    expect(result.class.subjectName).toBe("Mathematics");
    expect(result.grades.summary).toHaveLength(1);
    expect(result.homework.summary).toHaveLength(1);
    expect(result.homework.totalAssignments).toBe(1);
  });

  it("throws NOT_FOUND when token is invalid", async () => {
    vi.mocked(db.getStudentByShareToken).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.parentView.getByToken({ token: "bad-token" })).rejects.toThrow(TRPCError);
  });

  it("computes term average and submission rate correctly", async () => {
    vi.mocked(db.getStudentByShareToken).mockResolvedValue({ ...SAMPLE_STUDENT, shareToken: "t" });
    vi.mocked(db.getClassById).mockResolvedValue(SAMPLE_CLASS);
    vi.mocked(db.getAssessmentsByClass).mockResolvedValue([SAMPLE_ASSESSMENT]);
    vi.mocked(db.getAssignmentsByClass).mockResolvedValue([SAMPLE_ASSIGNMENT]);
    vi.mocked(db.getSubmissionsByClass).mockResolvedValue([
      { id: 1, studentId: 5, assignmentId: 7, status: "submitted", createdAt: new Date(), updatedAt: new Date() },
    ]);
    vi.mocked(db.getGradesByStudent).mockResolvedValue([
      { id: 1, studentId: 5, assessmentId: 3, score: 85, createdAt: new Date() },
    ]);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.parentView.getByToken({ token: "t" });

    expect(result.grades.termAverage).toBe(85); // 85/100 = 85%
    expect(result.homework.submissionRate).toBe(100); // 1/1 = 100%
    expect(result.homework.submittedCount).toBe(1);
  });
});

// ─── Email/Password Auth ──────────────────────────────────────────────────────

describe("auth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new user and returns success when email is not taken", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createUserWithPassword).mockResolvedValue(42);
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.register({
      name: "New Teacher",
      email: "new@school.edu",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain("Awaiting admin approval");
    expect(db.createUserWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Teacher",
        email: "new@school.edu",
        eduRole: "teacher",
        accountStatus: "pending",
      })
    );
  });

  it("throws CONFLICT when email is already registered", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 99,
      openId: "existing",
      email: "taken@school.edu",
      name: "Existing",
      passwordHash: "hash",
      accountStatus: "approved",
    } as any);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.register({
        name: "Duplicate",
        email: "taken@school.edu",
        password: "securepass123",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("throws validation error when password is too short", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.register({ name: "Teacher", email: "t@school.edu", password: "short" })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws UNAUTHORIZED when email does not exist", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({ email: "nobody@school.edu", password: "pass" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED when password is wrong", async () => {
    // bcrypt hash of "correctpass" — we provide "wrongpass"
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "email_abc",
      email: "teacher@school.edu",
      name: "Teacher",
      // bcrypt hash of "correctpass" (cost 12) — any non-matching hash works
      passwordHash: "$2b$12$invalidhashfortesting000000000000000000000000000000000",
      accountStatus: "approved",
      role: "user",
      eduRole: "teacher",
    } as any);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({ email: "teacher@school.edu", password: "wrongpass" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws FORBIDDEN when account is rejected", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "email_abc",
      email: "rejected@school.edu",
      name: "Rejected Teacher",
      passwordHash: "$2b$12$invalidhashfortesting000000000000000000000000000000000",
      accountStatus: "rejected",
      role: "user",
      eduRole: "teacher",
    } as any);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.auth.login({ email: "rejected@school.edu", password: "anypass" })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── Admin Account Status ─────────────────────────────────────────────────────

describe("admin.updateAccountStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows admin to approve a pending teacher", async () => {
    vi.mocked(db.updateUserAccountStatus).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.updateAccountStatus({
      userId: 10,
      accountStatus: "approved",
    });
    expect(result.success).toBe(true);
    expect(db.updateUserAccountStatus).toHaveBeenCalledWith(10, "approved");
  });

  it("allows admin to reject a pending teacher", async () => {
    vi.mocked(db.updateUserAccountStatus).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.updateAccountStatus({
      userId: 11,
      accountStatus: "rejected",
    });
    expect(result.success).toBe(true);
    expect(db.updateUserAccountStatus).toHaveBeenCalledWith(11, "rejected");
  });

  it("throws FORBIDDEN when a non-admin tries to change account status", async () => {
    const caller = appRouter.createCaller(makeTeacherCtx());
    await expect(
      caller.admin.updateAccountStatus({ userId: 10, accountStatus: "approved" })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

describe("auth.changePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  // bcrypt hash of "correctpass" pre-computed for test speed
  const HASHED_CORRECT = "$2b$12$H/AHfHNAdIaA0ALKH3.C9.XPk/wHdyqTz1/.S7ZR0CqvuWyAX95fK";

  const APPROVED_USER = {
    id: 1,
    openId: "email_abc",
    email: "teacher@school.edu",
    name: "Teacher",
    passwordHash: HASHED_CORRECT,
    accountStatus: "approved",
    role: "user",
    eduRole: "teacher",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as any;

  it("throws UNAUTHORIZED when current password is wrong", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(APPROVED_USER);
    const caller = appRouter.createCaller(makeTeacherCtx({ email: "teacher@school.edu" }));
    await expect(
      caller.auth.changePassword({ currentPassword: "wrongpass", newPassword: "NewPass2026!" })
    ).rejects.toThrow(TRPCError);
    expect(db.updateUserPassword).not.toHaveBeenCalled();
  });

  it("throws validation error when new password is too short", async () => {
    const caller = appRouter.createCaller(makeTeacherCtx({ email: "teacher@school.edu" }));
    await expect(
      caller.auth.changePassword({ currentPassword: "anything", newPassword: "short" })
    ).rejects.toThrow();
  });

  it("throws BAD_REQUEST when account has no password hash (OAuth account)", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({ ...APPROVED_USER, passwordHash: null });
    const caller = appRouter.createCaller(makeTeacherCtx({ email: "teacher@school.edu" }));
    await expect(
      caller.auth.changePassword({ currentPassword: "anything", newPassword: "NewPass2026!" })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── grades.bulkImportFromCSV ─────────────────────────────────────────────────

describe("grades.bulkImportFromCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  const MOCK_CLASS = { id: 1, teacherId: 1, subjectName: "Math", gradeLevel: "10", section: "A", academicYear: "2024-2025", term: "Term 1", alertThreshold: 60, createdAt: new Date(), updatedAt: new Date() };
  const MOCK_ASSESSMENT = { id: 10, classId: 1, name: "Quiz 1", type: "quiz", maxScore: 20, dateTaken: null, description: null, filePath: null, fileUrl: null, fileName: null, createdAt: new Date(), updatedAt: new Date() };
  const MOCK_STUDENTS = [
    { id: 1, classId: 1, studentId: "10A-001", name: "Aisha Rahman", email: null, shareToken: null, createdAt: new Date() },
    { id: 2, classId: 1, studentId: "10A-002", name: "Benjamin Tan", email: null, shareToken: null, createdAt: new Date() },
  ];

  it("imports matched rows and returns correct counts", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(MOCK_CLASS as any);
    vi.mocked(db.getAssessmentById).mockResolvedValue(MOCK_ASSESSMENT as any);
    vi.mocked(db.getStudentsByClass).mockResolvedValue(MOCK_STUDENTS as any);
    vi.mocked(db.upsertGradesBulk).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.grades.bulkImportFromCSV({
      classId: 1,
      assessmentId: 10,
      rows: [
        { identifier: "Aisha Rahman", scoreRaw: "17.5" },
        { identifier: "Benjamin Tan", scoreRaw: "14" },
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.unmatched).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(db.upsertGradesBulk).toHaveBeenCalledWith([
      { studentId: 1, assessmentId: 10, score: 17.5 },
      { studentId: 2, assessmentId: 10, score: 14 },
    ]);
  });

  it("skips blank score rows and reports unmatched names", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(MOCK_CLASS as any);
    vi.mocked(db.getAssessmentById).mockResolvedValue(MOCK_ASSESSMENT as any);
    vi.mocked(db.getStudentsByClass).mockResolvedValue(MOCK_STUDENTS as any);
    vi.mocked(db.upsertGradesBulk).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.grades.bulkImportFromCSV({
      classId: 1,
      assessmentId: 10,
      rows: [
        { identifier: "Aisha Rahman", scoreRaw: "" },         // blank → skip
        { identifier: "Unknown Student", scoreRaw: "15" },    // no match → unmatched
        { identifier: "Benjamin Tan", scoreRaw: "18" },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toContain("Aisha Rahman");
    expect(result.unmatched).toContain("Unknown Student");
  });

  it("rejects scores outside 0–maxScore range", async () => {
    vi.mocked(db.getClassById).mockResolvedValue(MOCK_CLASS as any);
    vi.mocked(db.getAssessmentById).mockResolvedValue(MOCK_ASSESSMENT as any);
    vi.mocked(db.getStudentsByClass).mockResolvedValue(MOCK_STUDENTS as any);
    vi.mocked(db.upsertGradesBulk).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeTeacherCtx());
    const result = await caller.grades.bulkImportFromCSV({
      classId: 1,
      assessmentId: 10,
      rows: [
        { identifier: "Aisha Rahman", scoreRaw: "25" }, // exceeds maxScore of 20
      ],
    });

    expect(result.imported).toBe(0);
    expect(result.unmatched[0]).toContain("Aisha Rahman");
  });
});
