import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, ChevronRight } from "lucide-react";

export default function Students() {
  const [, setLocation] = useLocation();
  const { data: classes = [], isLoading } = trpc.classes.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Students</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage student rosters across your classes
        </p>
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No classes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a class first to manage students
              </p>
            </div>
            <Button onClick={() => setLocation("/classes")}>Go to Classes</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <ClassStudentRow
              key={cls.id}
              cls={cls}
              onOpen={() => setLocation(`/classes/${cls.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassStudentRow({ cls, onOpen }: { cls: any; onOpen: () => void }) {
  const { data: students = [] } = trpc.students.list.useQuery({ classId: cls.id });

  return (
    <Card
      className="border shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{cls.subjectName}</span>
              <Badge variant="secondary" className="text-xs">{cls.gradeLevel} — {cls.section}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{cls.term} · {cls.academicYear}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <Users className="h-4 w-4" />
            <span className="font-medium">{students.length} students</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
