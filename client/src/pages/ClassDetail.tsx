import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  Upload,
  Users,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  Download,
  Info,
  Zap,
  Search,
  X,
  Eye,
} from "lucide-react";
import Papa from "papaparse";
import HomeworkTracker from "./HomeworkTracker";
import AssessmentScoreboard from "./AssessmentScoreboard";

export default function ClassDetail() {
  const params = useParams<{ classId: string }>();
  const classId = parseInt(params.classId ?? "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.eduRole === "admin";

  const [activeTab, setActiveTab] = useState("students");

  const { data: cls, isLoading: classLoading } = trpc.classes.get.useQuery(
    { classId },
    { enabled: !!classId }
  );

  if (classLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Class not found</p>
        <Button onClick={() => setLocation("/classes")}>Back to Classes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 mt-0.5"
          onClick={() => setLocation("/classes")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{cls.subjectName}</h1>
            <Badge variant="secondary">{cls.term}</Badge>
            <Badge variant="outline">{cls.academicYear}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {cls.gradeLevel} — Section {cls.section}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-background border">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="homework" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Homework
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <StudentRoster classId={classId} cls={cls} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="homework" className="mt-4">
          <HomeworkTracker classId={classId} cls={cls} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <AssessmentScoreboard classId={classId} cls={cls} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Student Roster ──────────────────────────────────────────────────────────

function StudentRoster({ classId, cls, isAdmin }: { classId: number; cls: any; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();
  const { data: students = [], isLoading } = trpc.students.list.useQuery({ classId });

  const createMutation = trpc.students.create.useMutation({
    onSuccess: () => {
      utils.students.list.invalidate({ classId });
      setShowAdd(false);
      setNewName("");
      setNewEmail("");
      toast.success("Student added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      utils.students.list.invalidate({ classId });
      setEditStudent(null);
      toast.success("Student updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.students.delete.useMutation({
    onSuccess: () => {
      utils.students.list.invalidate({ classId });
      setDeleteStudentId(null);
      toast.success("Student removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Student Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{students.length} students enrolled</span>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed rounded-xl">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {searchQuery ? "No students match your search" : "No students yet"}
          </p>
          {!searchQuery && !isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                Import CSV
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                Add Student
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                {!isAdmin && (
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, idx) => (
                <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-mono text-xs">{student.studentId}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {student.email || "—"}
                  </td>
                  {!isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditStudent(student);
                            setNewName(student.name);
                            setNewEmail(student.email ?? "");
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteStudentId(student.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="Student's full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createMutation.mutate({ classId, name: newName, email: newEmail || undefined })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input
                type="email"
                placeholder="student@school.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A student ID will be auto-generated based on the class section.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ classId, name: newName, email: newEmail || undefined })}
              disabled={!newName || createMutation.isPending}
            >
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ studentId: editStudent.id, name: newName, email: newEmail || undefined })}
              disabled={!newName || updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={(open) => !open && setDeleteStudentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the student and all their grades and submission records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteStudentId && deleteMutation.mutate({ studentId: deleteStudentId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Wizard */}
      {showImport && (
        <CSVImportWizard
          classId={classId}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            utils.students.list.invalidate({ classId });
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

// ─── CSV Import Wizard ───────────────────────────────────────────────────────

type CSVRow = Record<string, string>;

function CSVImportWizard({
  classId,
  onClose,
  onSuccess,
}: {
  classId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState("");
  const [emailCol, setEmailCol] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const importMutation = trpc.students.bulkImport.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} students imported successfully`);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(results.meta.fields ?? []);
        // Auto-detect name column
        const nameGuess = results.meta.fields?.find((f) =>
          /name/i.test(f)
        ) ?? "";
        const emailGuess = results.meta.fields?.find((f) =>
          /email/i.test(f)
        ) ?? "";
        setNameCol(nameGuess);
        setEmailCol(emailGuess);
        setStep(2);
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  }, []);

  const mappedStudents = csvData
    .filter((row) => nameCol && row[nameCol]?.trim())
    .map((row) => ({
      name: row[nameCol]?.trim() ?? "",
      email: emailCol ? row[emailCol]?.trim() : undefined,
    }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Students from CSV</DialogTitle>
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
          <div className="py-4">
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
              <p className="text-xs text-muted-foreground mt-3">Supports .csv and .xlsx files</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground font-medium mb-1">Expected CSV format:</p>
              <code className="text-xs text-foreground">Name, Email (optional)</code>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              File: <span className="font-medium text-foreground">{fileName}</span> — {csvData.length} rows detected
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name Column *</Label>
                <Select value={nameCol} onValueChange={setNameCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email Column (optional)</Label>
                <Select value={emailCol} onValueChange={setEmailCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{nameCol ? row[nameCol] : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{emailCol ? row[emailCol] : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Import */}
        {step === 3 && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">
                Ready to import <strong>{mappedStudents.length} students</strong>
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedStudents.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 2 && !nameCol}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => importMutation.mutate({ classId, students: mappedStudents })}
              disabled={mappedStudents.length === 0 || importMutation.isPending}
            >
              Import {mappedStudents.length} Students
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
