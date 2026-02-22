import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Users,
  ChevronRight,
  Plus,
  ClipboardList,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

function getScoreColor(pct: number, threshold: number) {
  if (pct >= 90) return "text-green-600";
  if (pct >= threshold) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(pct: number, threshold: number) {
  if (pct >= 90) return "bg-green-50 border-green-200";
  if (pct >= threshold) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.eduRole === "admin";

  const { data: classes = [], isLoading } = trpc.classes.list.useQuery();

  // For each class, we'd need students and grades — we'll compute alerts from available data
  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);

  // Aggregate stats across all classes
  const totalClasses = classes.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? "School Overview" : "My Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "School-wide class and performance overview"
              : `Welcome back, ${user?.name?.split(" ")[0] ?? "Teacher"}`}
          </p>
        </div>
        {!isAdmin && (
          <Button
            onClick={() => setLocation("/classes")}
            disabled={totalClasses >= 3}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Class
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalClasses}</p>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">of 3 max</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active Terms</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {Array.from(new Set(classes.map((c) => c.term))).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Array.from(new Set(classes.map((c) => c.academicYear))).join(", ") || "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Quick Access</p>
                <p className="text-sm font-medium text-foreground mt-2">Analytics & Reports</p>
                <p className="text-xs text-muted-foreground mt-1">View performance insights</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isAdmin ? "All Classes" : "My Classes"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/classes")} className="gap-1 text-primary">
            View all <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {classes.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">No classes yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first class to start tracking students
                </p>
              </div>
              <Button onClick={() => setLocation("/classes")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create a Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onOpen={() => setLocation(`/classes/${cls.id}`)}
              />
            ))}
            {!isAdmin && totalClasses < 3 && (
              <Card
                className="border-dashed border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => setLocation("/classes")}
              >
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Add New Class</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassCard({ cls, onOpen }: { cls: any; onOpen: () => void }) {
  const { data: students = [] } = trpc.students.list.useQuery({ classId: cls.id });
  const { data: assessments = [] } = trpc.assessments.list.useQuery({ classId: cls.id });
  const { data: grades = [] } = trpc.grades.listByClass.useQuery({ classId: cls.id });

  // Calculate term average and alerts
  const { termAverage, alertedStudents } = useMemo(() => {
    if (students.length === 0 || assessments.length === 0) {
      return { termAverage: null, alertedStudents: [] };
    }

    const studentAverages = students.map((student) => {
      const studentGrades = grades.filter((g) => g.studentId === student.id);
      const validGrades = studentGrades.filter((g) => g.score != null);
      if (validGrades.length === 0) return { student, avg: null };
      const avg =
        validGrades.reduce((sum, g) => {
          const assessment = assessments.find((a) => a.id === g.assessmentId);
          if (!assessment) return sum;
          return sum + ((g.score ?? 0) / assessment.maxScore) * 100;
        }, 0) / validGrades.length;
      return { student, avg };
    });

    const validAverages = studentAverages.filter((s) => s.avg != null);
    const classAvg =
      validAverages.length > 0
        ? validAverages.reduce((s, a) => s + (a.avg ?? 0), 0) / validAverages.length
        : null;

    const alerted = studentAverages.filter(
      (s) => s.avg != null && s.avg < cls.alertThreshold
    );

    return {
      termAverage: classAvg != null ? Math.round(classAvg) : null,
      alertedStudents: alerted,
    };
  }, [students, assessments, grades, cls.alertThreshold]);

  return (
    <Card
      className="border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold truncate">{cls.subjectName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cls.gradeLevel} — {cls.section}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {cls.term}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{students.length} students</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>{assessments.length} assessments</span>
          </div>
        </div>

        {termAverage != null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Class Average</span>
              <span
                className={`font-semibold ${getScoreColor(termAverage, cls.alertThreshold)}`}
              >
                {termAverage}%
              </span>
            </div>
            <Progress
              value={termAverage}
              className="h-1.5"
            />
          </div>
        )}

        {alertedStudents.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {alertedStudents.length} student{alertedStudents.length > 1 ? "s" : ""} below{" "}
              {cls.alertThreshold}% threshold
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{cls.academicYear}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}
