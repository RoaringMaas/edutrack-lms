import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ChevronRight,
  Edit2,
  Plus,
  Trash2,
  Users,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

const TERMS = ["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2", "Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
  `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
  `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`,
];
const GRADE_LEVELS = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "Year 1", "Year 2", "Year 3", "Year 4",
];

type ClassFormData = {
  subjectName: string;
  gradeLevel: string;
  section: string;
  academicYear: string;
  term: string;
  alertThreshold: number;
};

const defaultForm: ClassFormData = {
  subjectName: "",
  gradeLevel: "",
  section: "",
  academicYear: ACADEMIC_YEARS[1],
  term: TERMS[0],
  alertThreshold: 60,
};

export default function Classes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.eduRole === "admin";

  const [showCreate, setShowCreate] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);
  const [form, setForm] = useState<ClassFormData>(defaultForm);

  const utils = trpc.useUtils();
  const { data: classes = [], isLoading } = trpc.classes.list.useQuery();

  const createMutation = trpc.classes.create.useMutation({
    onSuccess: () => {
      utils.classes.list.invalidate();
      setShowCreate(false);
      setForm(defaultForm);
      toast.success("Class created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.classes.update.useMutation({
    onSuccess: () => {
      utils.classes.list.invalidate();
      setEditClass(null);
      toast.success("Class updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.classes.delete.useMutation({
    onSuccess: () => {
      utils.classes.list.invalidate();
      setDeleteClassId(null);
      toast.success("Class deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(cls: any) {
    setEditClass(cls);
    setForm({
      subjectName: cls.subjectName,
      gradeLevel: cls.gradeLevel,
      section: cls.section,
      academicYear: cls.academicYear,
      term: cls.term,
      alertThreshold: cls.alertThreshold,
    });
  }

  function handleSubmit(isEdit: boolean) {
    if (!form.subjectName || !form.gradeLevel || !form.section) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (isEdit && editClass) {
      updateMutation.mutate({ classId: editClass.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? "All Classes" : "My Classes"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "View and manage all teacher classes"
              : `${classes.length} of 3 classes created`}
          </p>
        </div>
        {!isAdmin && (
          <Button
            onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            disabled={classes.length >= 3}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Class
          </Button>
        )}
      </div>

      {/* Classes List */}
      {classes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No classes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first class to get started
              </p>
            </div>
            <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <ClassRow
              key={cls.id}
              cls={cls}
              isAdmin={isAdmin}
              onOpen={() => setLocation(`/classes/${cls.id}`)}
              onEdit={() => openEdit(cls)}
              onDelete={() => setDeleteClassId(cls.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showCreate || !!editClass}
        onOpenChange={(open) => {
          if (!open) { setShowCreate(false); setEditClass(null); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editClass ? "Edit Class" : "Create New Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject Name *</Label>
              <Input
                placeholder="e.g. Mathematics, English Literature"
                value={form.subjectName}
                onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Grade Level *</Label>
                <Select
                  value={form.gradeLevel}
                  onValueChange={(v) => setForm({ ...form, gradeLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Section *</Label>
                <Input
                  placeholder="e.g. A, B, Honors"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Academic Year</Label>
                <Select
                  value={form.academicYear}
                  onValueChange={(v) => setForm({ ...form, academicYear: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Term</Label>
                <Select
                  value={form.term}
                  onValueChange={(v) => setForm({ ...form, term: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alert Threshold (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.alertThreshold}
                  onChange={(e) => setForm({ ...form, alertThreshold: Number(e.target.value) })}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Students below this average will be flagged with a warning
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); setEditClass(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(!!editClass)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editClass ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClassId} onOpenChange={(open) => !open && setDeleteClassId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class and all associated student data, assignments, and grades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteClassId && deleteMutation.mutate({ classId: deleteClassId })}
            >
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClassRow({
  cls,
  isAdmin,
  onOpen,
  onEdit,
  onDelete,
}: {
  cls: any;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: students = [] } = trpc.students.list.useQuery({ classId: cls.id });
  const { data: assessments = [] } = trpc.assessments.list.useQuery({ classId: cls.id });

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 cursor-pointer"
            onClick={onOpen}
          >
            <BookOpen className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{cls.subjectName}</h3>
              <Badge variant="secondary" className="text-xs">{cls.term}</Badge>
              <Badge variant="outline" className="text-xs">{cls.academicYear}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cls.gradeLevel} — Section {cls.section}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{students.length} students</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span>{assessments.length} assessments</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Alert at {cls.alertThreshold}%</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpen}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
