import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  Plus,
  Download,
  Trash2,
} from "lucide-react";

type SubmissionStatus = "submitted" | "late" | "missing" | "pending";

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { icon: React.ReactNode; label: string; bg: string; text: string; next: SubmissionStatus }
> = {
  submitted: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Submitted",
    bg: "bg-green-100 hover:bg-green-200",
    text: "text-green-700",
    next: "late",
  },
  late: {
    icon: <Clock className="h-4 w-4" />,
    label: "Late",
    bg: "bg-amber-100 hover:bg-amber-200",
    text: "text-amber-700",
    next: "missing",
  },
  missing: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Missing",
    bg: "bg-red-100 hover:bg-red-200",
    text: "text-red-700",
    next: "pending",
  },
  pending: {
    icon: <Circle className="h-4 w-4" />,
    label: "Pending",
    bg: "bg-muted hover:bg-muted/80",
    text: "text-muted-foreground",
    next: "submitted",
  },
};

const WEEK_LABELS = Array.from({ length: 20 }, (_, i) => `Week ${i + 1}`);

export default function HomeworkTracker({
  classId,
  cls,
  isAdmin,
}: {
  classId: number;
  cls: any;
  isAdmin: boolean;
}) {
  const [selectedWeek, setSelectedWeek] = useState("Week 1");
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [newAssignmentPoints, setNewAssignmentPoints] = useState("10");

  const utils = trpc.useUtils();
  const { data: students = [] } = trpc.students.list.useQuery({ classId });
  const { data: assignments = [] } = trpc.assignments.list.useQuery({ classId });
  const { data: submissions = [] } = trpc.submissions.listByClass.useQuery({ classId });

  const upsertMutation = trpc.submissions.upsert.useMutation({
    onMutate: async (newData) => {
      // Optimistic update
      await utils.submissions.listByClass.cancel({ classId });
      const prev = utils.submissions.listByClass.getData({ classId });
      utils.submissions.listByClass.setData({ classId }, (old) => {
        if (!old) return old;
        const existing = old.find(
          (s) => s.studentId === newData.studentId && s.assignmentId === newData.assignmentId
        );
        if (existing) {
          return old.map((s) =>
            s.studentId === newData.studentId && s.assignmentId === newData.assignmentId
              ? { ...s, status: newData.status }
              : s
          );
        }
        return [
          ...old,
          {
            id: -Date.now(),
            studentId: newData.studentId,
            assignmentId: newData.assignmentId,
            status: newData.status,
            submittedAt: null,
            updatedAt: new Date(),
          },
        ];
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      utils.submissions.listByClass.setData({ classId }, ctx?.prev);
      toast.error("Failed to update submission");
    },
  });

  const createAssignmentMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      utils.assignments.list.invalidate({ classId });
      setShowAddAssignment(false);
      setNewAssignmentName("");
      setNewAssignmentPoints("10");
      toast.success("Assignment added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAssignmentMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      utils.assignments.list.invalidate({ classId });
      toast.success("Assignment removed");
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter assignments by selected week
  const weekAssignments = useMemo(
    () => assignments.filter((a) => a.weekLabel === selectedWeek),
    [assignments, selectedWeek]
  );

  // Build submission lookup: studentId_assignmentId -> status
  const submissionMap = useMemo(() => {
    const map: Record<string, SubmissionStatus> = {};
    for (const s of submissions) {
      map[`${s.studentId}_${s.assignmentId}`] = s.status as SubmissionStatus;
    }
    return map;
  }, [submissions]);

  function getStatus(studentId: number, assignmentId: number): SubmissionStatus {
    return submissionMap[`${studentId}_${assignmentId}`] ?? "pending";
  }

  function toggleStatus(studentId: number, assignmentId: number) {
    if (isAdmin) return;
    const current = getStatus(studentId, assignmentId);
    const next = STATUS_CONFIG[current].next;
    upsertMutation.mutate({ studentId, assignmentId, status: next });
  }

  // Summary stats for current week
  const stats = useMemo(() => {
    if (weekAssignments.length === 0 || students.length === 0) {
      return { submitted: 0, late: 0, missing: 0, pending: 0, rate: 0 };
    }
    let submitted = 0, late = 0, missing = 0, pending = 0;
    for (const student of students) {
      for (const assignment of weekAssignments) {
        const status = getStatus(student.id, assignment.id);
        if (status === "submitted") submitted++;
        else if (status === "late") late++;
        else if (status === "missing") missing++;
        else pending++;
      }
    }
    const total = students.length * weekAssignments.length;
    const rate = total > 0 ? Math.round(((submitted + late) / total) * 100) : 0;
    return { submitted, late, missing, pending, rate };
  }, [students, weekAssignments, submissionMap]);

  // Export CSV
  function exportCSV() {
    if (students.length === 0) return;
    const headers = ["Student ID", "Name", ...weekAssignments.map((a) => a.name)];
    const rows = students.map((student) => [
      student.studentId,
      student.name,
      ...weekAssignments.map((a) => getStatus(student.id, a.id)),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homework-${cls.subjectName}-${selectedWeek}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium shrink-0">Week:</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_LABELS.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Summary badges */}
          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {stats.rate}% Submitted
          </Badge>
          {stats.missing > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
              <XCircle className="h-3 w-3 mr-1" />
              {stats.missing} Missing
            </Badge>
          )}
          {stats.late > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
              <Clock className="h-3 w-3 mr-1" />
              {stats.late} Late
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          {!isAdmin && (
            <Button size="sm" onClick={() => setShowAddAssignment(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["submitted", "late", "missing", "pending"] as SubmissionStatus[]).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = stats[status];
          return (
            <Card key={status} className="border shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
                  {cfg.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Matrix Grid */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">No students in this class yet</p>
        </div>
      ) : weekAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed rounded-xl">
          <p className="font-medium text-foreground">No assignments for {selectedWeek}</p>
          <p className="text-sm text-muted-foreground">Add an assignment to start tracking submissions</p>
          {!isAdmin && (
            <Button size="sm" onClick={() => setShowAddAssignment(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[160px]">
                    STUDENT NAME
                  </th>
                  {weekAssignments.map((a) => (
                    <th key={a.id} className="px-3 py-3 font-medium text-muted-foreground text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{a.name}</span>
                        <span className="text-xs text-muted-foreground/60">{a.points}pts</span>
                        {!isAdmin && (
                          <button
                            onClick={() => deleteAssignmentMutation.mutate({ assignmentId: a.id })}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-primary text-center min-w-[80px]">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const studentSubmitted = weekAssignments.filter(
                    (a) => getStatus(student.id, a.id) === "submitted"
                  ).length;
                  const studentLate = weekAssignments.filter(
                    (a) => getStatus(student.id, a.id) === "late"
                  ).length;
                  const total = weekAssignments.length;
                  const pct = total > 0 ? Math.round(((studentSubmitted + studentLate) / total) * 100) : 0;

                  return (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                        </div>
                      </td>
                      {weekAssignments.map((a) => {
                        const status = getStatus(student.id, a.id);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <td key={a.id} className="px-3 py-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => toggleStatus(student.id, a.id)}
                                  className={`h-8 w-8 rounded-lg ${cfg.bg} ${cfg.text} flex items-center justify-center mx-auto transition-all ${isAdmin ? "cursor-default" : "cursor-pointer"}`}
                                  disabled={isAdmin}
                                >
                                  {cfg.icon}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{cfg.label}{!isAdmin ? ` — click to change` : ""}</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            pct >= 90
                              ? "text-green-600"
                              : pct >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Legend:</span>
        {(Object.entries(STATUS_CONFIG) as [SubmissionStatus, typeof STATUS_CONFIG[SubmissionStatus]][]).map(
          ([status, cfg]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`h-5 w-5 rounded ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
                {cfg.icon}
              </div>
              <span>{cfg.label}</span>
            </div>
          )
        )}
        {!isAdmin && <span className="text-muted-foreground/60">• Click cells to toggle status</span>}
      </div>

      {/* Add Assignment Dialog */}
      <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Assignment Name *</Label>
              <Input
                placeholder="e.g. Chapter 5 Worksheet"
                value={newAssignmentName}
                onChange={(e) => setNewAssignmentName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                value={newAssignmentPoints}
                onChange={(e) => setNewAssignmentPoints(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              This assignment will be added to <strong>{selectedWeek}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAssignment(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createAssignmentMutation.mutate({
                  classId,
                  name: newAssignmentName,
                  weekLabel: selectedWeek,
                  weekNumber: parseInt(selectedWeek.replace("Week ", "")),
                  points: parseInt(newAssignmentPoints) || 10,
                })
              }
              disabled={!newAssignmentName || createAssignmentMutation.isPending}
            >
              Add Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
