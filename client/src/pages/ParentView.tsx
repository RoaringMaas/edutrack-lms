import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: { label: "Submitted", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  late: { label: "Late", color: "bg-amber-100 text-amber-800", icon: <Clock className="h-3.5 w-3.5" /> },
  missing: { label: "Missing", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

function getScoreColor(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 90) return "text-green-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(pct: number | null) {
  if (pct == null) return "bg-gray-50";
  if (pct >= 90) return "bg-green-50";
  if (pct >= 60) return "bg-amber-50";
  return "bg-red-50";
}

export default function ParentView() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const { data, isLoading, error } = trpc.parentView.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Loading student report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
            <p className="text-muted-foreground">
              This link may have expired or been revoked by the teacher.
              Please contact your child's teacher for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, class: cls, grades, homework } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-sm text-muted-foreground">
                {cls.subjectName} &middot; {cls.gradeLevel} {cls.section} &middot; {cls.term} {cls.academicYear}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Term Average
              </div>
              <p className={`text-2xl font-bold ${getScoreColor(grades.termAverage)}`}>
                {grades.termAverage != null ? `${grades.termAverage}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submission Rate
              </div>
              <p className={`text-2xl font-bold ${homework.submissionRate != null && homework.submissionRate >= 80 ? "text-green-600" : homework.submissionRate != null && homework.submissionRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                {homework.submissionRate != null ? `${homework.submissionRate}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BookOpen className="h-3.5 w-3.5" />
                Assessments
              </div>
              <p className="text-2xl font-bold text-gray-900">{grades.summary.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <GraduationCap className="h-3.5 w-3.5" />
                Assignments
              </div>
              <p className="text-2xl font-bold text-gray-900">{homework.totalAssignments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Grades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Assessment Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grades.summary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No assessments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {grades.summary.map((g, i) => (
                  <div key={i} className={`rounded-lg p-3 ${getScoreBg(g.percentage)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{g.type}{g.dateTaken ? ` · ${new Date(g.dateTaken).toLocaleDateString()}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${getScoreColor(g.percentage)}`}>
                          {g.score != null ? `${g.score}/${g.maxScore}` : "—"}
                        </p>
                        {g.percentage != null && (
                          <p className={`text-xs ${getScoreColor(g.percentage)}`}>{g.percentage}%</p>
                        )}
                      </div>
                    </div>
                    {g.percentage != null && (
                      <Progress value={g.percentage} className="h-1.5 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Homework Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Homework Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {homework.summary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No homework assigned yet.</p>
            ) : (
              <>
                {/* Stats row */}
                <div className="flex gap-4 mb-4 text-sm">
                  <span className="text-green-600 font-medium">{homework.submittedCount} submitted</span>
                  <span className="text-amber-600 font-medium">{homework.lateCount} late</span>
                  <span className="text-red-600 font-medium">{homework.missingCount} missing</span>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  {homework.summary.map((hw, i) => {
                    const cfg = STATUS_CONFIG[hw.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium">{hw.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {hw.weekLabel ?? ""}{hw.dueDate ? ` · Due ${new Date(hw.dueDate).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className={`${cfg.color} gap-1 text-xs`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-muted-foreground">
          <p>This is a read-only view shared by your child's teacher via EduTrack.</p>
          <p>Data is updated in real-time as the teacher records grades and homework.</p>
        </div>
      </main>
    </div>
  );
}
