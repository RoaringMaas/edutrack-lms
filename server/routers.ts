import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  getClassesByTeacher,
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getStudentsByClass,
  getStudentById,
  createStudent,
  createStudentsBulk,
  updateStudent,
  deleteStudent,
  getAssignmentsByClass,
  createAssignment,
  deleteAssignment,
  getSubmissionsByClass,
  upsertSubmission,
  getAssessmentsByClass,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getGradesByClass,
  getGradesByStudent,
  upsertGrade,
  upsertGradesBulk,
  getTeacherNotes,
  upsertTeacherNotes,
  getAllUsers,
  updateUserEduRole,
  getStudentByShareToken,
  setStudentShareToken,
  getUserByEmail,
  createUserWithPassword,
  updateUserAccountStatus,
  updateUserLastSignedIn,
  updateUserPassword,
} from "./db";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateStudentId(classSection: string, index: number): string {
  const prefix = classSection.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  return `${prefix}${String(index).padStart(4, "0")}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "Name must be at least 2 characters"),
          email: z.email("Invalid email address"),
          password: z.string().min(8, "Password must be at least 8 characters"),
        })
      )
      .mutation(async ({ input }) => {
        // Check if email already taken
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists.",
          });
        }
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        // Generate a unique openId for this user (not Manus OAuth)
        const openId = `email_${nanoid(24)}`;
        const initials = input.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
          openId,
          eduRole: "teacher",
          accountStatus: "pending",
          role: "user",
        });
        return { success: true, message: "Account created. Awaiting admin approval." } as const;
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.email("Invalid email address"),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          });
        }
        if (user.accountStatus === "rejected") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been rejected. Please contact your administrator.",
          });
        }
        // Update last signed in
        await updateUserLastSignedIn(user.id);
        // Issue session JWT (reuse existing SDK signing)
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.signSession(
          { openId: user.openId, appId: "edutrack", name: user.name ?? "" },
          { expiresInMs: 1000 * 60 * 60 * 24 * 30 } // 30 days
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
        return {
          success: true,
          accountStatus: user.accountStatus,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            eduRole: user.eduRole,
            role: user.role,
            accountStatus: user.accountStatus,
          },
        } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8, "New password must be at least 8 characters"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(ctx.user.email ?? "");
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (!user.passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This account does not use email/password login",
          });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserPassword(user.id, newHash);
        return { success: true } as const;
      }),
  }),

  // ─── Classes ────────────────────────────────────────────────────────────────

  classes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      if (user.eduRole === "admin" || user.role === "admin") {
        return getAllClasses();
      }
      return getClassesByTeacher(user.id);
    }),

    get: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cls = await getClassById(input.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (
          ctx.user.eduRole !== "admin" &&
          ctx.user.role !== "admin" &&
          cls.teacherId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return cls;
      }),

    create: protectedProcedure
      .input(
        z.object({
          subjectName: z.string().min(1),
          gradeLevel: z.string().min(1),
          section: z.string().min(1),
          academicYear: z.string().min(1),
          term: z.string().min(1),
          alertThreshold: z.number().min(0).max(100).default(60),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check class limit for teachers
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin") {
          const existing = await getClassesByTeacher(ctx.user.id);
          if (existing.length >= 3) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Teachers can create a maximum of 3 classes.",
            });
          }
        }
        const id = await createClass({ ...input, teacherId: ctx.user.id });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          classId: z.number(),
          subjectName: z.string().min(1).optional(),
          gradeLevel: z.string().min(1).optional(),
          section: z.string().min(1).optional(),
          academicYear: z.string().min(1).optional(),
          term: z.string().min(1).optional(),
          alertThreshold: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { classId, ...data } = input;
        const cls = await getClassById(classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateClass(classId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const cls = await getClassById(input.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteClass(input.classId);
        return { success: true };
      }),
  }),

  // ─── Students ───────────────────────────────────────────────────────────────

  students: router({
    list: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cls = await getClassById(input.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getStudentsByClass(input.classId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          classId: z.number(),
          name: z.string().min(1),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cls = await getClassById(input.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await getStudentsByClass(input.classId);
        const studentId = generateStudentId(cls.section, existing.length + 1);
        const id = await createStudent({ ...input, studentId });
        return { id, studentId };
      }),

    bulkImport: protectedProcedure
      .input(
        z.object({
          classId: z.number(),
          students: z.array(
            z.object({
              name: z.string().min(1),
              email: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cls = await getClassById(input.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await getStudentsByClass(input.classId);
        const toInsert = input.students.map((s, i) => ({
          classId: input.classId,
          name: s.name,
          email: s.email || undefined,
          studentId: generateStudentId(cls.section, existing.length + i + 1),
        }));
        await createStudentsBulk(toInsert);
        return { count: toInsert.length };
      }),

    update: protectedProcedure
      .input(
        z.object({
          studentId: z.number(),
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { studentId, ...data } = input;
        const student = await getStudentById(studentId);
        if (!student) throw new TRPCError({ code: "NOT_FOUND" });
        const cls = await getClassById(student.classId);
        if (cls && ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateStudent(studentId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const student = await getStudentById(input.studentId);
        if (!student) throw new TRPCError({ code: "NOT_FOUND" });
        const cls = await getClassById(student.classId);
        if (cls && ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteStudent(input.studentId);
        return { success: true };
      }),
  }),

  // ─── Assignments ────────────────────────────────────────────────────────────

  assignments: router({
    list: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getAssignmentsByClass(input.classId)),

    create: protectedProcedure
      .input(
        z.object({
          classId: z.number(),
          name: z.string().min(1),
          dueDate: z.string().optional(),
          weekNumber: z.number().optional(),
          weekLabel: z.string().optional(),
          points: z.number().default(10),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createAssignment({
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAssignment(input.assignmentId);
        return { success: true };
      }),
  }),

  // ─── Submissions ────────────────────────────────────────────────────────────

  submissions: router({
    listByClass: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getSubmissionsByClass(input.classId)),

    upsert: protectedProcedure
      .input(
        z.object({
          studentId: z.number(),
          assignmentId: z.number(),
          status: z.enum(["submitted", "late", "missing", "pending"]),
        })
      )
      .mutation(async ({ input }) => {
        await upsertSubmission(input.studentId, input.assignmentId, input.status);
        return { success: true };
      }),
  }),

  // ─── Assessments ────────────────────────────────────────────────────────────

  assessments: router({
    list: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getAssessmentsByClass(input.classId)),

    get: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(({ input }) => getAssessmentById(input.assessmentId)),

    create: protectedProcedure
      .input(
        z.object({
          classId: z.number(),
          name: z.string().min(1),
          dateTaken: z.string().optional(),
          type: z.enum(["quiz", "exam", "project", "activity", "other"]).default("quiz"),
          maxScore: z.number().min(1).default(100),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createAssessment({
          ...input,
          dateTaken: input.dateTaken ? new Date(input.dateTaken) : undefined,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          assessmentId: z.number(),
          name: z.string().min(1).optional(),
          dateTaken: z.string().optional(),
          type: z.enum(["quiz", "exam", "project", "activity", "other"]).optional(),
          maxScore: z.number().min(1).optional(),
          description: z.string().optional(),
          filePath: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { assessmentId, dateTaken, ...rest } = input;
        await updateAssessment(assessmentId, {
          ...rest,
          dateTaken: dateTaken ? new Date(dateTaken) : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAssessment(input.assessmentId);
        return { success: true };
      }),

    uploadFile: protectedProcedure
      .input(
        z.object({
          assessmentId: z.number(),
          fileName: z.string(),
          fileBase64: z.string(), // base64 encoded PDF
          mimeType: z.string().default("application/pdf"),
        })
      )
      .mutation(async ({ input }) => {
        const suffix = nanoid(8);
        const key = `test-papers/${input.assessmentId}/${suffix}-${input.fileName}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateAssessment(input.assessmentId, {
          filePath: key,
          fileUrl: url,
          fileName: input.fileName,
        });
        return { url, key };
      }),

    removeFile: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ input }) => {
        await updateAssessment(input.assessmentId, {
          filePath: null,
          fileUrl: null,
          fileName: null,
        });
        return { success: true };
      }),
  }),

  // ─── Grades ─────────────────────────────────────────────────────────────────

  grades: router({
    listByClass: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getGradesByClass(input.classId)),

    listByStudent: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(({ input }) => getGradesByStudent(input.studentId)),

    upsert: protectedProcedure
      .input(
        z.object({
          studentId: z.number(),
          assessmentId: z.number(),
          score: z.number().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        await upsertGrade(input.studentId, input.assessmentId, input.score);
        return { success: true };
      }),

    bulkUpsert: protectedProcedure
      .input(
        z.object({
          entries: z.array(
            z.object({
              studentId: z.number(),
              assessmentId: z.number(),
              score: z.number().nullable(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        await upsertGradesBulk(input.entries);
        return { success: true };
      }),
  }),

  // ─── Teacher Notes ──────────────────────────────────────────────────────────

  teacherNotes: router({
    get: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(({ input }) => getTeacherNotes(input.classId)),

    upsert: protectedProcedure
      .input(z.object({ classId: z.number(), notes: z.string() }))
      .mutation(async ({ input }) => {
        await upsertTeacherNotes(input.classId, input.notes);
        return { success: true };
      }),
  }),

  // ─── Admin ──────────────────────────────────────────────────────────────────

  admin: router({
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.eduRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAllUsers();
    }),

    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number(), eduRole: z.enum(["teacher", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.eduRole !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateUserEduRole(input.userId, input.eduRole);
        return { success: true };
      }),

    updateAccountStatus: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          accountStatus: z.enum(["pending", "approved", "rejected"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.eduRole !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateUserAccountStatus(input.userId, input.accountStatus);
        return { success: true };
      }),
  }),

  // ─── Parent Share Links (teacher-facing) ────────────────────────────────────

  shareLinks: router({
    generate: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const student = await getStudentById(input.studentId);
        if (!student) throw new TRPCError({ code: "NOT_FOUND" });
        const cls = await getClassById(student.classId);
        if (cls && ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const token = nanoid(16);
        await setStudentShareToken(input.studentId, token);
        return { token };
      }),

    revoke: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const student = await getStudentById(input.studentId);
        if (!student) throw new TRPCError({ code: "NOT_FOUND" });
        const cls = await getClassById(student.classId);
        if (cls && ctx.user.eduRole !== "admin" && ctx.user.role !== "admin" && cls.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await setStudentShareToken(input.studentId, null);
        return { success: true };
      }),
  }),

  // ─── Parent View (public, no auth required) ─────────────────────────────────

  parentView: router({
    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const student = await getStudentByShareToken(input.token);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired link" });

        const cls = await getClassById(student.classId);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND" });

        const [allAssessments, allAssignments, allSubmissions, studentGrades] = await Promise.all([
          getAssessmentsByClass(student.classId),
          getAssignmentsByClass(student.classId),
          getSubmissionsByClass(student.classId),
          getGradesByStudent(student.id),
        ]);

        // Grade summary
        const gradeSummary = allAssessments.map((a) => {
          const grade = studentGrades.find((g) => g.assessmentId === a.id);
          const pct = grade?.score != null ? (grade.score / a.maxScore) * 100 : null;
          return {
            name: a.name,
            type: a.type,
            score: grade?.score ?? null,
            maxScore: a.maxScore,
            percentage: pct != null ? Math.round(pct) : null,
            dateTaken: a.dateTaken,
          };
        });

        const validGrades = gradeSummary.filter((g) => g.percentage != null);
        const termAverage = validGrades.length > 0
          ? Math.round(validGrades.reduce((s, g) => s + (g.percentage ?? 0), 0) / validGrades.length)
          : null;

        // Homework summary
        const studentSubmissions = allSubmissions.filter((s) => s.studentId === student.id);
        const homeworkSummary = allAssignments.map((a) => {
          const sub = studentSubmissions.find((s) => s.assignmentId === a.id);
          return {
            name: a.name,
            weekLabel: a.weekLabel,
            dueDate: a.dueDate,
            status: sub?.status ?? "pending",
          };
        });

        const totalAssignments = allAssignments.length;
        const submittedCount = studentSubmissions.filter((s) => s.status === "submitted" || s.status === "late").length;
        const submissionRate = totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : null;
        const missingCount = studentSubmissions.filter((s) => s.status === "missing").length;
        const lateCount = studentSubmissions.filter((s) => s.status === "late").length;

        return {
          student: { name: student.name, studentId: student.studentId },
          class: {
            subjectName: cls.subjectName,
            gradeLevel: cls.gradeLevel,
            section: cls.section,
            term: cls.term,
            academicYear: cls.academicYear,
          },
          grades: { summary: gradeSummary, termAverage },
          homework: {
            summary: homeworkSummary,
            submissionRate,
            totalAssignments,
            submittedCount,
            missingCount,
            lateCount,
          },
        };
      }),
  }),

  // ─── Reports ────────────────────────────────────────────────────────────────

  reports: router({
    generateStudentReport: protectedProcedure
      .input(
        z.object({
          studentId: z.number().nullable().optional(),
          classId: z.number(),
          includeNarrative: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const { getStudentById, getClassById, getGradesByStudent, getGradesByClass, getAssessmentsByClass, getSubmissionsByClass, getAssignmentsByClass, getStudentsByClass } = await import("./db");
        const [classData, allAssessments, allSubmissions, allAssignments] =
          await Promise.all([
            getClassById(input.classId),
            getAssessmentsByClass(input.classId),
            getSubmissionsByClass(input.classId),
            getAssignmentsByClass(input.classId),
          ]);

        if (!classData) throw new TRPCError({ code: "NOT_FOUND" });

        const isClassReport = !input.studentId;

        if (!isClassReport && input.studentId) {
          // Single student report
          const [student, studentGrades] = await Promise.all([
            getStudentById(input.studentId),
            getGradesByStudent(input.studentId),
          ]);
          if (!student) throw new TRPCError({ code: "NOT_FOUND" });

          const gradeSummary = allAssessments.map((a) => {
            const grade = studentGrades.find((g) => g.assessmentId === a.id);
            const pct = grade?.score != null ? (grade.score / a.maxScore) * 100 : null;
            return {
              name: a.name, type: a.type, score: grade?.score ?? null,
              maxScore: a.maxScore, percentage: pct != null ? Math.round(pct) : null,
            };
          });
          const validGrades = gradeSummary.filter((g) => g.percentage != null);
          const termAverage = validGrades.length > 0
            ? Math.round(validGrades.reduce((s, g) => s + (g.percentage ?? 0), 0) / validGrades.length)
            : null;
          const studentSubmissions = allSubmissions.filter((s) => s.studentId === input.studentId);
          const submissionRate = allAssignments.length > 0
            ? Math.round((studentSubmissions.filter((s) => s.status === "submitted" || s.status === "late").length / allAssignments.length) * 100)
            : null;

          let narrative = "";
          if (input.includeNarrative) {
            const prompt = `You are an experienced teacher writing a brief, encouraging progress report for a student.\n\nStudent: ${student.name}\nClass: ${classData.subjectName} (${classData.gradeLevel} - ${classData.section})\nTerm: ${classData.term} ${classData.academicYear}\nTerm Average: ${termAverage != null ? termAverage + "%" : "No grades yet"}\nSubmission Rate: ${submissionRate != null ? submissionRate + "%" : "N/A"}\nAssessment Results:\n${gradeSummary.map((g) => `- ${g.name} (${g.type}): ${g.score ?? "N/A"}/${g.maxScore} (${g.percentage != null ? g.percentage + "%" : "N/A"})`).join("\n")}\n\nWrite a 2-3 paragraph narrative progress report. Be specific, constructive, and encouraging. Mention strengths and areas for improvement. Keep it professional and suitable for sharing with parents.`;
            const response = await invokeLLM({ messages: [{ role: "user" as const, content: prompt }] });
            const rawContent = response.choices?.[0]?.message?.content;
            narrative = typeof rawContent === "string" ? rawContent : "";
          }
          return { studentName: student.name, gradeSummary, termAverage, submissionRate, narrative };
        } else {
          // Class-wide report
          const students = await getStudentsByClass(input.classId);
          const allGrades = await getGradesByClass(input.classId);
          const studentSummaries = students.map((s) => {
            const sg = allGrades.filter((g) => g.studentId === s.id);
            const validPcts = allAssessments.map((a) => {
              const g = sg.find((g) => g.assessmentId === a.id);
              return g?.score != null ? (g.score / a.maxScore) * 100 : null;
            }).filter((p): p is number => p != null);
            const avg = validPcts.length > 0 ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : null;
            const subs = allSubmissions.filter((sub) => sub.studentId === s.id);
            const subRate = allAssignments.length > 0 ? Math.round((subs.filter((sub) => sub.status === "submitted" || sub.status === "late").length / allAssignments.length) * 100) : null;
            return { name: s.name, avg, subRate };
          });
          const classAvg = studentSummaries.filter((s) => s.avg != null).length > 0
            ? Math.round(studentSummaries.filter((s) => s.avg != null).reduce((a, s) => a + (s.avg ?? 0), 0) / studentSummaries.filter((s) => s.avg != null).length)
            : null;

          let narrative = "";
          if (input.includeNarrative) {
            const prompt = `You are an experienced teacher writing a class progress summary report.\n\nClass: ${classData.subjectName} (${classData.gradeLevel} - ${classData.section})\nTerm: ${classData.term} ${classData.academicYear}\nClass Average: ${classAvg != null ? classAvg + "%" : "No grades yet"}\nTotal Students: ${students.length}\nStudents above 90%: ${studentSummaries.filter((s) => (s.avg ?? 0) >= 90).length}\nStudents at risk (<${classData.alertThreshold}%): ${studentSummaries.filter((s) => s.avg != null && (s.avg ?? 0) < classData.alertThreshold).length}\n\nWrite a 2-3 paragraph class progress summary. Highlight overall performance, areas of strength, and areas needing attention. Be constructive and professional.`;
            const response = await invokeLLM({ messages: [{ role: "user" as const, content: prompt }] });
            const rawContent = response.choices?.[0]?.message?.content;
            narrative = typeof rawContent === "string" ? rawContent : "";
          }
          return { studentName: undefined, gradeSummary: [], termAverage: classAvg, submissionRate: null, narrative };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
