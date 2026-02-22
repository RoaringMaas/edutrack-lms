import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  FileText,
  Loader2,
  Sparkles,
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

export default function Reports() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfResult, setPdfResult] = useState<{ narrative: string; studentName?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: classes = [], isLoading } = trpc.classes.list.useQuery();
  const { data: students = [] } = trpc.students.list.useQuery(
    { classId: parseInt(selectedClassId) },
    { enabled: !!selectedClassId }
  );
  const { data: assessments = [] } = trpc.assessments.list.useQuery(
    { classId: parseInt(selectedClassId) },
    { enabled: !!selectedClassId }
  );
  const { data: grades = [] } = trpc.grades.listByClass.useQuery(
    { classId: parseInt(selectedClassId) },
    { enabled: !!selectedClassId }
  );
  const { data: assignments = [] } = trpc.assignments.list.useQuery(
    { classId: parseInt(selectedClassId) },
    { enabled: !!selectedClassId }
  );
  const { data: submissions = [] } = trpc.submissions.listByClass.useQuery(
    { classId: parseInt(selectedClassId) },
    { enabled: !!selectedClassId }
  );

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  const generateReportMutation = trpc.reports.generateStudentReport.useMutation({
    onSuccess: (data) => {
      setPdfResult({ narrative: data.narrative, studentName: (data as any).studentName });
      setIsGenerating(false);
      setShowPdfDialog(true);
    },
    onError: (e) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  function exportGradesCSV() {
    if (!selectedClassId || !selectedClass) return;
    const headers = [
      "Student ID",
      "Student Name",
      ...assessments.map((a) => `${a.name} (/${a.maxScore})`),
      "Term Average (%)",
    ];
    const rows = students.map((s) => {
      const studentGrades = assessments.map((a) => {
        const g = grades.find((g) => g.studentId === s.id && g.assessmentId === a.id);
        return g?.score != null ? String(g.score) : "";
      });
      const validPcts = assessments
        .map((a) => {
          const g = grades.find((g) => g.studentId === s.id && g.assessmentId === a.id);
          if (!g || g.score == null) return null;
          return (g.score / a.maxScore) * 100;
        })
        .filter((p): p is number => p != null);
      const avg =
        validPcts.length > 0
          ? Math.round(validPcts.reduce((s, p) => s + p, 0) / validPcts.length)
          : "";
      return [s.studentId, s.name, ...studentGrades, avg !== "" ? `${avg}%` : ""];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    downloadCSV(csv, `grades-${selectedClass.subjectName}-${selectedClass.term}.csv`);
    toast.success("Grades exported");
  }

  function exportHomeworkCSV() {
    if (!selectedClassId || !selectedClass) return;
    const headers = [
      "Student ID",
      "Student Name",
      ...assignments.map((a) => `${a.name} (${a.weekLabel})`),
      "Submission Rate",
    ];
    const rows = students.map((s) => {
      const statuses = assignments.map((a) => {
        const sub = submissions.find(
          (sub) => sub.studentId === s.id && sub.assignmentId === a.id
        );
        return sub?.status ?? "pending";
      });
      const submitted = statuses.filter((st) => st === "submitted" || st === "late").length;
      const rate = assignments.length > 0 ? Math.round((submitted / assignments.length) * 100) : 0;
      return [s.studentId, s.name, ...statuses, `${rate}%`];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    downloadCSV(csv, `homework-${selectedClass.subjectName}-${selectedClass.term}.csv`);
    toast.success("Homework data exported");
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleGenerateReport() {
    if (!selectedClassId) return;
    setIsGenerating(true);
    generateReportMutation.mutate({
      classId: parseInt(selectedClassId),
      studentId: selectedStudentId !== "all" ? parseInt(selectedStudentId) : null,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export data as CSV or generate AI-powered progress reports
        </p>
      </div>

      {/* Class Selector */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudentId("all"); }}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose a class to export..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.subjectName} — {c.gradeLevel} {c.section} ({c.term})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClass && (
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{students.length} students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4" />
                <span>{assessments.length} assessments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>{assignments.length} assignments</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Exports */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CSV Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Assessment Grades</p>
                <p className="text-xs text-muted-foreground">
                  All student scores, per-assessment and term averages
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportGradesCSV}
              disabled={!selectedClassId || assessments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Homework Submissions</p>
                <p className="text-xs text-muted-foreground">
                  All assignment statuses and submission rates
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportHomeworkCSV}
              disabled={!selectedClassId || assignments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Progress Report */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base">AI Progress Report</CardTitle>
            <Badge variant="secondary" className="text-xs">Powered by AI</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a narrative progress report using AI. This uses LLM credits.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Generating AI reports uses LLM API credits. Each report generation makes one API call.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudentId("all"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.subjectName} — {c.gradeLevel} {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Report For</Label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire Class</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={!selectedClassId || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* PDF Report Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Progress Report
              {pdfResult?.studentName && (
                <Badge variant="secondary">{pdfResult.studentName}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <div className="prose prose-sm max-w-none">
              <div className="p-4 bg-muted/30 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {pdfResult?.narrative}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>Close</Button>
            <Button
              onClick={() => {
                if (!pdfResult) return;
                const blob = new Blob([pdfResult.narrative], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `progress-report-${pdfResult.studentName ?? "class"}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
