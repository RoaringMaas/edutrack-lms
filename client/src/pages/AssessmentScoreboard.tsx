import { trpc } from "@/lib/trpc";
import React, { useState, useMemo, useRef, useCallback } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Download,
  Info,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
  FileText,
  Eye,
  RefreshCw,
  Trophy,
  BarChart2,
  StickyNote,
  Edit,
} from "lucide-react";

type Assessment = {
  id: number;
  name: string;
  dateTaken: Date | null;
  type: string;
  maxScore: number;
  description: string | null;
  filePath: string | null;
  fileUrl: string | null;
  fileName: string | null;
};

type Student = { id: number; name: string; studentId: string };
type Grade = { studentId: number; assessmentId: number; score: number | null };

function scoreColor(pct: number | null, threshold: number) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 90) return "text-green-600";
  if (pct >= threshold) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(pct: number | null, threshold: number) {
  if (pct == null) return "";
  if (pct >= 90) return "bg-green-50";
  if (pct >= threshold) return "bg-amber-50";
  return "bg-red-50";
}

export default function AssessmentScoreboard({
  classId,
  cls,
  isAdmin,
}: {
  classId: number;
  cls: any;
  isAdmin: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPoints, setShowPoints] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAssessmentId, setBulkAssessmentId] = useState<number | null>(null);
  const [bulkScores, setBulkScores] = useState<Record<number, string>>({});
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [detailsAssessment, setDetailsAssessment] = useState<Assessment | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvImportAssessmentId, setCsvImportAssessmentId] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ studentId: number; assessmentId: number } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: students = [] } = trpc.students.list.useQuery({ classId });
  const { data: assessments = [] } = trpc.assessments.list.useQuery({ classId });
  const { data: grades = [] } = trpc.grades.listByClass.useQuery({ classId });
  const { data: teacherNotesData } = trpc.teacherNotes.get.useQuery({ classId });

  // Update notes value when data loads
  React.useEffect(() => {
    if (teacherNotesData?.notes) {
      setNotesValue(teacherNotesData.notes);
    }
  }, [teacherNotesData?.notes]);

  const updateNotesMutation = trpc.teacherNotes.upsert.useMutation({
    onSuccess: () => {
      utils.teacherNotes.get.invalidate({ classId });
      setShowEditNotes(false);
      toast.success("Notes saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertGrade = trpc.grades.upsert.useMutation({
    onMutate: async (newData) => {
      await utils.grades.listByClass.cancel({ classId });
      const prev = utils.grades.listByClass.getData({ classId });
      utils.grades.listByClass.setData({ classId }, (old) => {
        if (!old) return old;
        const existing = old.find(
          (g) => g.studentId === newData.studentId && g.assessmentId === newData.assessmentId
        );
        if (existing) {
          return old.map((g) =>
            g.studentId === newData.studentId && g.assessmentId === newData.assessmentId
              ? { ...g, score: newData.score }
              : g
          );
        }
        return [
          ...old,
          {
            id: -Date.now(),
            studentId: newData.studentId,
            assessmentId: newData.assessmentId,
            score: newData.score,
            updatedAt: new Date(),
          },
        ];
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      utils.grades.listByClass.setData({ classId }, ctx?.prev);
      toast.error("Failed to save grade");
    },
  });

  const bulkUpsert = trpc.grades.bulkUpsert.useMutation({
    onSuccess: () => {
      utils.grades.listByClass.invalidate({ classId });
      setBulkMode(false);
      setBulkScores({});
      setBulkAssessmentId(null);
      toast.success("Grades saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAssessment = trpc.assessments.delete.useMutation({
    onSuccess: () => {
      utils.assessments.list.invalidate({ classId });
      toast.success("Assessment deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  // Grade lookup
  const gradeMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const g of grades) {
      map[`${g.studentId}_${g.assessmentId}`] = g.score;
    }
    return map;
  }, [grades]);

  function getScore(studentId: number, assessmentId: number): number | null {
    return gradeMap[`${studentId}_${assessmentId}`] ?? null;
  }

  function getPct(studentId: number, assessmentId: number): number | null {
    const assessment = assessments.find((a) => a.id === assessmentId);
    const score = getScore(studentId, assessmentId);
    if (!assessment || score == null) return null;
    return Math.round((score / assessment.maxScore) * 100);
  }

  function getTermAverage(studentId: number): number | null {
    const validGrades = assessments
      .map((a) => getPct(studentId, a.id))
      .filter((p): p is number => p != null);
    if (validGrades.length === 0) return null;
    return Math.round(validGrades.reduce((s, p) => s + p, 0) / validGrades.length);
  }

  function getClassAverage(assessmentId: number): number | null {
    const validScores = students
      .map((s) => getPct(s.id, assessmentId))
      .filter((p): p is number => p != null);
    if (validScores.length === 0) return null;
    return Math.round(validScores.reduce((s, p) => s + p, 0) / validScores.length);
  }

  // Filtered students
  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [students, searchQuery]
  );

  // Top performer and students needing support
  const { topPerformer, needsSupport } = useMemo(() => {
    const withAvg = students.map((s) => ({ student: s, avg: getTermAverage(s.id) }));
    const valid = withAvg.filter((x) => x.avg != null);
    const sorted = [...valid].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    return {
      topPerformer: sorted[0] ?? null,
      needsSupport: valid.filter((x) => (x.avg ?? 100) < cls.alertThreshold),
    };
  }, [students, gradeMap, assessments, cls.alertThreshold]);

  function startEdit(studentId: number, assessmentId: number) {
    if (isAdmin) return;
    const score = getScore(studentId, assessmentId);
    setEditingCell({ studentId, assessmentId });
    setCellValue(score != null ? String(score) : "");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function commitEdit() {
    if (!editingCell) return;
    const { studentId, assessmentId } = editingCell;
    const assessment = assessments.find((a) => a.id === assessmentId);
    if (!assessment) return;
    const raw = cellValue.trim();
    if (raw === "") {
      upsertGrade.mutate({ studentId, assessmentId, score: null });
    } else {
      const num = parseFloat(raw);
      if (isNaN(num) || num < 0 || num > assessment.maxScore) {
        toast.error(`Score must be between 0 and ${assessment.maxScore}`);
        return;
      }
      upsertGrade.mutate({ studentId, assessmentId, score: num });
    }
    setEditingCell(null);
    setCellValue("");
  }

  function handleCellKeyDown(e: React.KeyboardEvent, studentId: number, assessmentId: number) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      commitEdit();
      // Move to next student
      const idx = filteredStudents.findIndex((s) => s.id === studentId);
      if (idx < filteredStudents.length - 1) {
        startEdit(filteredStudents[idx + 1].id, assessmentId);
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setCellValue("");
    }
  }

  function startBulkMode(assessmentId: number) {
    setBulkAssessmentId(assessmentId);
    setBulkMode(true);
    const initial: Record<number, string> = {};
    for (const s of students) {
      const score = getScore(s.id, assessmentId);
      initial[s.id] = score != null ? String(score) : "";
    }
    setBulkScores(initial);
  }

  function saveBulkScores() {
    if (!bulkAssessmentId) return;
    const assessment = assessments.find((a) => a.id === bulkAssessmentId);
    if (!assessment) return;
    const entries = students
      .map((s) => {
        const raw = bulkScores[s.id]?.trim() ?? "";
        if (raw === "") return { studentId: s.id, assessmentId: bulkAssessmentId, score: null };
        const num = parseFloat(raw);
        if (isNaN(num)) return null;
        return { studentId: s.id, assessmentId: bulkAssessmentId, score: Math.min(num, assessment.maxScore) };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    bulkUpsert.mutate({ entries });
  }

  function exportCSV() {
    const headers = ["Student ID", "Name", ...assessments.map((a) => a.name), "Term Average"];
    const rows = students.map((s) => [
      s.studentId,
      s.name,
      ...assessments.map((a) => {
        const score = getScore(s.id, a.id);
        return score != null ? String(score) : "";
      }),
      getTermAverage(s.id) != null ? `${getTermAverage(s.id)}%` : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades-${cls.subjectName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPoints(!showPoints)}
          >
            {showPoints ? "Show %" : "Show Points"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          {!isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (assessments.length === 0) { toast.error("Add an assessment first"); return; }
                  setCsvImportAssessmentId(assessments[0].id);
                  setShowCSVImport(true);
                }}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Scores
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkMode ? setBulkMode(false) : (assessments.length > 0 ? startBulkMode(assessments[0].id) : toast.error("Add an assessment first"))}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {bulkMode ? "Exit Quick Entry" : "Quick Entry"}
              </Button>
              <Button size="sm" onClick={() => setShowAddAssessment(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Assessment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Top Performer</span>
            </div>
            {topPerformer ? (
              <>
                <p className="font-semibold text-sm text-foreground truncate">{topPerformer.student.name}</p>
                <p className="text-xs text-green-600 font-medium">{topPerformer.avg}% average</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No grades yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Needs Support</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{needsSupport.length}</p>
            <p className="text-xs text-muted-foreground">below {cls.alertThreshold}%</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Assessments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
            <p className="text-xs text-muted-foreground">total tests</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
          setShowEditNotes(true);
          setNotesValue(teacherNotesData?.notes || "");
        }}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Teacher Notes</span>
              </div>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {teacherNotesData?.notes || "No notes yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Mode Banner */}
      {bulkMode && bulkAssessmentId && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Quick Entry Mode — {assessments.find((a) => a.id === bulkAssessmentId)?.name}
            </span>
            <Select
              value={String(bulkAssessmentId)}
              onValueChange={(v) => startBulkMode(parseInt(v))}
            >
              <SelectTrigger className="w-40 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkMode(false)}>Cancel</Button>
            <Button size="sm" onClick={saveBulkScores} disabled={bulkUpsert.isPending}>
              Save All Scores
            </Button>
          </div>
        </div>
      )}

      {/* Scoreboard Grid */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">No students in this class yet</p>
        </div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed rounded-xl">
          <p className="font-medium text-foreground">No assessments yet</p>
          {!isAdmin && (
            <Button size="sm" onClick={() => setShowAddAssessment(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assessment
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[180px]">
                    STUDENT
                  </th>
                  {assessments.map((a) => (
                    <th key={a.id} className="px-3 py-3 text-center min-w-[110px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{a.name}</span>
                        <span className="text-xs text-muted-foreground/60 capitalize">{a.type}</span>
                        <span className="text-xs text-muted-foreground/60">/{a.maxScore}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailsAssessment(a as Assessment)}
                            className="text-muted-foreground/40 hover:text-primary transition-colors"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                          {!isAdmin && (
                            <>
                              <button
                                onClick={() => startBulkMode(a.id)}
                                className="text-muted-foreground/40 hover:text-primary transition-colors"
                              >
                                <Zap className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => deleteAssessment.mutate({ assessmentId: a.id })}
                                className="text-muted-foreground/40 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center min-w-[120px] text-primary font-medium text-xs">
                    TERM AVG
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const termAvg = getTermAverage(student.id);
                  const isAlerted = termAvg != null && termAvg < cls.alertThreshold;

                  return (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          {isAlerted && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Below {cls.alertThreshold}% threshold
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                          </div>
                        </div>
                      </td>
                      {assessments.map((a) => {
                        const score = getScore(student.id, a.id);
                        const pct = getPct(student.id, a.id);
                        const isEditing =
                          editingCell?.studentId === student.id &&
                          editingCell?.assessmentId === a.id;
                        const isBulkTarget = bulkMode && bulkAssessmentId === a.id;

                        return (
                          <td
                            key={a.id}
                            className={`px-3 py-2 text-center ${scoreBg(pct, cls.alertThreshold)}`}
                          >
                            {isBulkTarget ? (
                              <Input
                                type="number"
                                min={0}
                                max={a.maxScore}
                                value={bulkScores[student.id] ?? ""}
                                onChange={(e) =>
                                  setBulkScores((prev) => ({ ...prev, [student.id]: e.target.value }))
                                }
                                className="h-7 w-16 text-center text-xs mx-auto"
                                placeholder="—"
                              />
                            ) : isEditing ? (
                              <Input
                                ref={inputRef}
                                type="number"
                                min={0}
                                max={a.maxScore}
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => handleCellKeyDown(e, student.id, a.id)}
                                className="h-7 w-16 text-center text-xs mx-auto"
                                placeholder="—"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(student.id, a.id)}
                                className={`text-sm font-semibold w-full text-center ${scoreColor(pct, cls.alertThreshold)} ${isAdmin ? "cursor-default" : "hover:opacity-70 cursor-pointer"}`}
                                disabled={isAdmin}
                              >
                                {score != null
                                  ? showPoints
                                    ? `${score}/${a.maxScore}`
                                    : `${pct}%`
                                  : "—"}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        {termAvg != null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-bold ${scoreColor(termAvg, cls.alertThreshold)}`}>
                              {termAvg}%
                            </span>
                            <Progress value={termAvg} className="h-1.5 w-16" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Class Average Row */}
                <tr className="bg-muted/30 border-t-2">
                  <td className="px-4 py-3 sticky left-0 bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Class Average
                    </span>
                  </td>
                  {assessments.map((a) => {
                    const avg = getClassAverage(a.id);
                    return (
                      <td key={a.id} className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${scoreColor(avg, cls.alertThreshold)}`}>
                          {avg != null ? `${avg}%` : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const allAvgs = students.map((s) => getTermAverage(s.id)).filter((a): a is number => a != null);
                      const classTermAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((s, a) => s + a, 0) / allAvgs.length) : null;
                      return (
                        <span className={`text-sm font-bold ${scoreColor(classTermAvg, cls.alertThreshold)}`}>
                          {classTermAvg != null ? `${classTermAvg}%` : "—"}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Score Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-100" />
          <span className="text-green-700">≥90% Excellent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-100" />
          <span className="text-amber-700">{cls.alertThreshold}–89% Passing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-100" />
          <span className="text-red-700">&lt;{cls.alertThreshold}% At Risk</span>
        </div>
        {!isAdmin && <span className="text-muted-foreground/60">• Click cells to enter scores</span>}
      </div>

      {/* Add Assessment Dialog */}
      <AddAssessmentDialog
        classId={classId}
        open={showAddAssessment}
        onClose={() => setShowAddAssessment(false)}
        onSuccess={() => utils.assessments.list.invalidate({ classId })}
      />

      {/* CSV Score Import Dialog */}
      {showCSVImport && csvImportAssessmentId && (
        <CSVScoreImportWizard
          classId={classId}
          assessments={assessments}
          initialAssessmentId={csvImportAssessmentId}
          onClose={() => setShowCSVImport(false)}
          onSuccess={() => {
            utils.grades.listByClass.invalidate({ classId });
            setShowCSVImport(false);
          }}
        />
      )}

      {/* Assessment Details Dialog */}
      {detailsAssessment && (
        <AssessmentDetailsDialog
          assessment={detailsAssessment}
          isAdmin={isAdmin}
          onClose={() => setDetailsAssessment(null)}
          onUpdate={() => utils.assessments.list.invalidate({ classId })}
        />
      )}

      {/* Edit Teacher Notes Dialog */}
      <Dialog open={showEditNotes} onOpenChange={setShowEditNotes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Teacher Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Add notes about this class..."
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditNotes(false)}>Cancel</Button>
            <Button onClick={() => updateNotesMutation.mutate({ classId, notes: notesValue })} disabled={updateNotesMutation.isPending}>
              {updateNotesMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add Assessment Dialog ───────────────────────────────────────────────────

function AddAssessmentDialog({
  classId,
  open,
  onClose,
  onSuccess,
}: {
  classId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    dateTaken: "",
    type: "quiz" as const,
    maxScore: 100,
  });

  const mutation = trpc.assessments.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      setForm({ name: "", dateTaken: "", type: "quiz", maxScore: 100 });
      toast.success("Assessment added");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Assessment Name *</Label>
            <Input
              placeholder="e.g. Midterm Exam"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["quiz", "exam", "project", "activity", "other"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Max Score</Label>
              <Input
                type="number"
                min={1}
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date Taken</Label>
            <Input
              type="date"
              value={form.dateTaken}
              onChange={(e) => setForm({ ...form, dateTaken: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ classId, ...form })}
            disabled={!form.name || mutation.isPending}
          >
            Add Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assessment Details Dialog ───────────────────────────────────────────────

function AssessmentDetailsDialog({
  assessment,
  isAdmin,
  onClose,
  onUpdate,
}: {
  assessment: Assessment;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [notes, setNotes] = useState(assessment.description ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateMutation = trpc.assessments.update.useMutation({
    onSuccess: () => {
      onUpdate();
      toast.success("Assessment updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.assessments.uploadFile.useMutation({
    onSuccess: () => {
      onUpdate();
      setIsUploading(false);
      toast.success("Test paper uploaded");
    },
    onError: (e) => {
      setIsUploading(false);
      toast.error(e.message);
    },
  });

  const removeMutation = trpc.assessments.removeFile.useMutation({
    onSuccess: () => {
      onUpdate();
      toast.success("File removed");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadMutation.mutate({
        assessmentId: assessment.id,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || "application/pdf",
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assessment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Read-only summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{assessment.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{assessment.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Score</p>
              <p className="font-medium">{assessment.maxScore}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">
                {assessment.dateTaken
                  ? new Date(assessment.dateTaken).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Test Notes / Instructions</Label>
            <Textarea
              placeholder="Add notes, instructions, or topics covered..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={isAdmin}
            />
          </div>

          {/* PDF Upload */}
          <div className="space-y-2">
            <Label>Test Paper (PDF, max 10MB)</Label>
            {assessment.fileUrl ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{assessment.fileName}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(assessment.fileUrl!, "_blank")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fileRef.current?.click()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeMutation.mutate({ assessmentId: assessment.id })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : !isAdmin ? (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {isUploading ? (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload test paper PDF</p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No test paper uploaded</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isAdmin && (
            <Button
              onClick={() => updateMutation.mutate({ assessmentId: assessment.id, description: notes })}
              disabled={updateMutation.isPending}
            >
              Save Notes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Score Import Wizard ─────────────────────────────────────────────────

type CSVScoreRow = Record<string, string>;

function CSVScoreImportWizard({
  classId,
  assessments,
  initialAssessmentId,
  onClose,
  onSuccess,
}: {
  classId: number;
  assessments: Assessment[];
  initialAssessmentId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<CSVScoreRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [identifierCol, setIdentifierCol] = useState("");
  const [scoreCol, setScoreCol] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number>(initialAssessmentId);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  const importMutation = trpc.grades.bulkImportFromCSV.useMutation({
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.imported > 0) parts.push(`${data.imported} score${data.imported !== 1 ? "s" : ""} imported`);
      if (data.skipped.length > 0) parts.push(`${data.skipped.length} skipped (blank)`);
      if (data.unmatched.length > 0) parts.push(`${data.unmatched.length} unmatched`);
      toast.success(parts.join(" · ") || "Import complete");
      if (data.unmatched.length > 0) {
        toast.warning(`Unmatched: ${data.unmatched.slice(0, 3).join(", ")}${data.unmatched.length > 3 ? "…" : ""}`);
      }
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse<CSVScoreRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(results.meta.fields ?? []);
        // Auto-detect identifier column (name/student) and score column
        const idGuess = results.meta.fields?.find((f) => /name|student|id/i.test(f)) ?? "";
        const scoreGuess = results.meta.fields?.find((f) => /score|mark|grade|result/i.test(f)) ?? "";
        setIdentifierCol(idGuess);
        setScoreCol(scoreGuess);
        setStep(2);
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  }, []);

  // Preview: map rows using selected columns
  const previewRows = csvData
    .filter((row) => identifierCol && row[identifierCol]?.trim())
    .map((row) => ({
      identifier: row[identifierCol]?.trim() ?? "",
      scoreRaw: scoreCol ? (row[scoreCol]?.trim() ?? "") : "",
    }));

  function handleImport() {
    if (!selectedAssessmentId || previewRows.length === 0) return;
    importMutation.mutate({
      classId,
      assessmentId: selectedAssessmentId,
      rows: previewRows,
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Scores from CSV</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-xs ${step === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Upload" : s === 2 ? "Map Columns" : "Preview & Import"}
                </span>
                {s < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="py-4 space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-3">
                CSV must have a student name/ID column and a score column.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
              <p className="font-medium">Expected CSV format:</p>
              <p>Two columns minimum: one for student identifier (name or Student ID code) and one for the score.</p>
              <p>Example: <code className="bg-blue-100 px-1 rounded">studentName,score</code> or <code className="bg-blue-100 px-1 rounded">name,Quiz 1 — Algebra</code></p>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{fileName}</span> — {csvData.length} rows detected.
              Map the columns and select which assessment to import scores into.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Student Identifier Column</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={identifierCol}
                  onChange={(e) => setIdentifierCol(e.target.value)}
                >
                  <option value="">— select column —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Student name or Student ID code</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Score Column</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={scoreCol}
                  onChange={(e) => setScoreCol(e.target.value)}
                >
                  <option value="">— select column —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Numeric score (blank rows will be skipped)</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Import into Assessment</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (max {a.maxScore})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!identifierCol || !scoreCol || !selectedAssessmentId}
              >
                Preview Import
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview & Import */}
        {step === 3 && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{previewRows.length} rows</span> ready to import into{" "}
                <span className="font-semibold text-foreground">{selectedAssessment?.name}</span>{" "}
                (max score: {selectedAssessment?.maxScore})
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Student Identifier</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Score</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((row, i) => {
                    const score = parseFloat(row.scoreRaw);
                    const isBlank = row.scoreRaw.trim() === "";
                    const isInvalid = !isBlank && (isNaN(score) || score < 0 || score > (selectedAssessment?.maxScore ?? Infinity));
                    return (
                      <tr key={i} className={isInvalid ? "bg-red-50" : isBlank ? "bg-muted/30" : ""}>
                        <td className="px-3 py-2 text-foreground">{row.identifier}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {isBlank ? <span className="text-muted-foreground">—</span> : row.scoreRaw}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isBlank ? (
                            <Badge variant="outline" className="text-xs">Skip</Badge>
                          ) : isInvalid ? (
                            <Badge variant="destructive" className="text-xs">Invalid</Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Import</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || previewRows.filter((r) => r.scoreRaw.trim() !== "").length === 0}
              >
                {importMutation.isPending ? (
                  <><span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />Importing...</>
                ) : (
                  <>Confirm Import</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
