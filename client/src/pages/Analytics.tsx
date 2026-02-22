import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Trophy,
  Users,
  ChevronRight,
} from "lucide-react";

const GRADE_COLORS = {
  excellent: "#22c55e",
  passing: "#f59e0b",
  atRisk: "#ef4444",
  noData: "#e5e7eb",
};

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const { data: classes = [], isLoading: classesLoading } = trpc.classes.list.useQuery();

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  if (classesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">No data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a class and add grades to see analytics</p>
        </div>
        <Button onClick={() => setLocation("/classes")}>Go to Classes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance insights across your classes</p>
        </div>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.subjectName} — {c.gradeLevel} {c.section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClassId === "all" ? (
        <AllClassesAnalytics classes={classes} />
      ) : (
        <SingleClassAnalytics classId={parseInt(selectedClassId)} cls={selectedClass} />
      )}
    </div>
  );
}

// ─── All Classes Overview ─────────────────────────────────────────────────────

function AllClassesAnalytics({ classes }: { classes: any[] }) {
  return (
    <div className="space-y-6">
      {classes.map((cls) => (
        <ClassAnalyticsCard key={cls.id} cls={cls} />
      ))}
    </div>
  );
}

function ClassAnalyticsCard({ cls }: { cls: any }) {
  const { data: students = [] } = trpc.students.list.useQuery({ classId: cls.id });
  const { data: assessments = [] } = trpc.assessments.list.useQuery({ classId: cls.id });
  const { data: grades = [] } = trpc.grades.listByClass.useQuery({ classId: cls.id });

  const stats = useMemo(() => {
    if (!students.length || !assessments.length) return null;
    const studentAvgs = students.map((s) => {
      const validGrades = assessments
        .map((a) => {
          const g = grades.find((g) => g.studentId === s.id && g.assessmentId === a.id);
          if (!g || g.score == null) return null;
          return (g.score / a.maxScore) * 100;
        })
        .filter((p): p is number => p != null);
      return validGrades.length > 0
        ? validGrades.reduce((s, p) => s + p, 0) / validGrades.length
        : null;
    });
    const valid = studentAvgs.filter((a): a is number => a != null);
    if (!valid.length) return null;
    const classAvg = Math.round(valid.reduce((s, a) => s + a, 0) / valid.length);
    const excellent = valid.filter((a) => a >= 90).length;
    const passing = valid.filter((a) => a >= cls.alertThreshold && a < 90).length;
    const atRisk = valid.filter((a) => a < cls.alertThreshold).length;
    return { classAvg, excellent, passing, atRisk, total: valid.length };
  }, [students, assessments, grades, cls.alertThreshold]);

  if (!stats) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{cls.subjectName} — {cls.gradeLevel} {cls.section}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No grade data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "Excellent (≥90%)", value: stats.excellent, color: GRADE_COLORS.excellent },
    { name: "Passing", value: stats.passing, color: GRADE_COLORS.passing },
    { name: "At Risk", value: stats.atRisk, color: GRADE_COLORS.atRisk },
  ].filter((d) => d.value > 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{cls.subjectName}</CardTitle>
            <p className="text-sm text-muted-foreground">{cls.gradeLevel} — Section {cls.section} · {cls.term}</p>
          </div>
          <Badge
            className={
              stats.classAvg >= 90
                ? "bg-green-100 text-green-700"
                : stats.classAvg >= cls.alertThreshold
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            }
          >
            {stats.classAvg}% avg
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.excellent}</p>
              <p className="text-xs text-muted-foreground">Excellent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.passing}</p>
              <p className="text-xs text-muted-foreground">Passing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.atRisk}</p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Single Class Analytics ───────────────────────────────────────────────────

function SingleClassAnalytics({ classId, cls }: { classId: number; cls: any }) {
  const { data: students = [] } = trpc.students.list.useQuery({ classId });
  const { data: assessments = [] } = trpc.assessments.list.useQuery({ classId });
  const { data: grades = [] } = trpc.grades.listByClass.useQuery({ classId });

  const alertThreshold = cls?.alertThreshold ?? 60;

  // Build score trend data (assessment averages over time)
  const trendData = useMemo(() => {
    return assessments.map((a) => {
      const scores = students
        .map((s) => {
          const g = grades.find((g) => g.studentId === s.id && g.assessmentId === a.id);
          if (!g || g.score == null) return null;
          return (g.score / a.maxScore) * 100;
        })
        .filter((p): p is number => p != null);
      const avg = scores.length > 0 ? Math.round(scores.reduce((s, p) => s + p, 0) / scores.length) : null;
      return {
        name: a.name.length > 12 ? a.name.slice(0, 12) + "…" : a.name,
        average: avg,
        date: a.dateTaken ? new Date(a.dateTaken).toLocaleDateString() : "",
      };
    });
  }, [assessments, students, grades]);

  // Per-student averages
  const studentAverages = useMemo(() => {
    return students
      .map((s) => {
        const validGrades = assessments
          .map((a) => {
            const g = grades.find((g) => g.studentId === s.id && g.assessmentId === a.id);
            if (!g || g.score == null) return null;
            return (g.score / a.maxScore) * 100;
          })
          .filter((p): p is number => p != null);
        const avg =
          validGrades.length > 0
            ? Math.round(validGrades.reduce((s, p) => s + p, 0) / validGrades.length)
            : null;
        return { student: s, avg };
      })
      .filter((x) => x.avg != null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [students, assessments, grades]);

  const topPerformers = studentAverages.slice(0, 5);
  const needsSupport = studentAverages.filter((x) => (x.avg ?? 100) < alertThreshold);

  // Grade distribution for pie chart
  const gradeDistribution = useMemo(() => {
    const excellent = studentAverages.filter((x) => (x.avg ?? 0) >= 90).length;
    const passing = studentAverages.filter(
      (x) => (x.avg ?? 0) >= alertThreshold && (x.avg ?? 0) < 90
    ).length;
    const atRisk = studentAverages.filter((x) => (x.avg ?? 0) < alertThreshold).length;
    const noData = students.length - studentAverages.length;
    return [
      { name: "Excellent (≥90%)", value: excellent, color: GRADE_COLORS.excellent },
      { name: `Passing (${alertThreshold}–89%)`, value: passing, color: GRADE_COLORS.passing },
      { name: `At Risk (<${alertThreshold}%)`, value: atRisk, color: GRADE_COLORS.atRisk },
      { name: "No Data", value: noData, color: GRADE_COLORS.noData },
    ].filter((d) => d.value > 0);
  }, [studentAverages, students.length, alertThreshold]);

  // Bar chart data (per-student averages, top 15)
  const barData = useMemo(() => {
    return studentAverages.slice(0, 15).map((x) => ({
      name: x.student.name.split(" ")[0],
      average: x.avg,
    }));
  }, [studentAverages]);

  if (!cls) return null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-3xl font-bold text-foreground">{students.length}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Assessments</p>
            <p className="text-3xl font-bold text-foreground">{assessments.length}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Class Average</p>
            <p className={`text-3xl font-bold ${
              studentAverages.length === 0 ? "text-muted-foreground" :
              (studentAverages.reduce((s, x) => s + (x.avg ?? 0), 0) / studentAverages.length) >= 90
                ? "text-green-600"
                : (studentAverages.reduce((s, x) => s + (x.avg ?? 0), 0) / studentAverages.length) >= alertThreshold
                ? "text-amber-600"
                : "text-red-600"
            }`}>
              {studentAverages.length > 0
                ? `${Math.round(studentAverages.reduce((s, x) => s + (x.avg ?? 0), 0) / studentAverages.length)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">At Risk</p>
            <p className="text-3xl font-bold text-red-600">{needsSupport.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart: Score Trend */}
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assessment Score Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Class average per assessment</p>
          </CardHeader>
          <CardContent>
            {trendData.filter((d) => d.average != null).length < 2 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Add at least 2 assessments with grades to see trends
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Class Average"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart: Grade Distribution */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Grade Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Based on term averages</p>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No grade data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    dataKey="value"
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                  >
                    {gradeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
                  />
                  <Tooltip
                    formatter={(v: number) => [v, "Students"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Student Performance */}
      {barData.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Student Performance Overview</CardTitle>
            <p className="text-xs text-muted-foreground">Term average by student (top 15)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Average"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        (entry.average ?? 0) >= 90
                          ? GRADE_COLORS.excellent
                          : (entry.average ?? 0) >= alertThreshold
                          ? GRADE_COLORS.passing
                          : GRADE_COLORS.atRisk
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers & Needs Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Top Performers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grade data yet</p>
            ) : (
              <div className="space-y-2">
                {topPerformers.map((x, i) => (
                  <div key={x.student.id} className="flex items-center gap-3">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                          ? "bg-slate-100 text-slate-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{x.student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{x.student.studentId}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                      {x.avg}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-base">Needs Support</CardTitle>
              <Badge variant="outline" className="text-xs ml-auto">below {alertThreshold}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {needsSupport.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Trophy className="h-4 w-4" />
                All students are above the threshold
              </div>
            ) : (
              <div className="space-y-2">
                {needsSupport.map((x) => (
                  <div key={x.student.id} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{x.student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{x.student.studentId}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shrink-0">
                      {x.avg}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
