import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Shield,
  Bell,
  BookOpen,
  Users,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Crown,
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.eduRole === "admin";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and application preferences
        </p>
      </div>

      {/* Profile Section */}
      <ProfileSection user={user} />

      {/* Class Defaults */}
      <ClassDefaultsSection />

      {/* Admin Section */}
      {isAdmin && <AdminSection />}
    </div>
  );
}

function ProfileSection({ user }: { user: any }) {
  const isAdmin = user?.role === "admin" || user?.eduRole === "admin";

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-lg">{user?.name ?? "Unknown User"}</p>
              {isAdmin ? (
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1">
                  <Crown className="h-3 w-3" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Teacher
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user?.email ?? "No email"}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Login Method</p>
            <p className="font-medium capitalize">{user?.loginMethod ?? "OAuth"}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Account Created</p>
            <p className="font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Profile information is managed through Manus OAuth. To update your name or email, please update your Manus account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassDefaultsSection() {
  const { data: classes = [] } = trpc.classes.list.useQuery();
  const utils = trpc.useUtils();

  const updateMutation = trpc.classes.update.useMutation({
    onSuccess: () => {
      utils.classes.list.invalidate();
      toast.success("Class settings updated");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Alert Thresholds</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Set the minimum average score before a student is flagged as at-risk
        </p>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes created yet</p>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <ClassThresholdRow
                key={cls.id}
                cls={cls}
                onUpdate={(threshold) =>
                  updateMutation.mutate({ classId: cls.id, alertThreshold: threshold })
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassThresholdRow({ cls, onUpdate }: { cls: any; onUpdate: (v: number) => void }) {
  const [value, setValue] = useState(String(cls.alertThreshold));
  const [changed, setChanged] = useState(false);

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{cls.subjectName}</p>
        <p className="text-xs text-muted-foreground">
          {cls.gradeLevel} — {cls.section} · {cls.term}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setChanged(e.target.value !== String(cls.alertThreshold));
            }}
            className="w-20 h-8 text-sm"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        {changed && (
          <Button
            size="sm"
            className="h-8"
            onClick={() => {
              onUpdate(parseInt(value) || 60);
              setChanged(false);
            }}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AdminSection() {
  const { data: allUsers = [] } = trpc.admin.listUsers.useQuery();
  const utils = trpc.useUtils();
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
  const [pendingRole, setPendingRole] = useState<"teacher" | "admin">("teacher");

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      setConfirmUserId(null);
      toast.success("User role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Card className="border shadow-sm border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base">Admin — User Management</CardTitle>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 ml-auto">Admin Only</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={u.eduRole === "admin" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {u.eduRole ?? "teacher"}
                  </Badge>
                  <Select
                    value={u.eduRole ?? "teacher"}
                    onValueChange={(v) => {
                      setConfirmUserId(u.id);
                      setPendingRole(v as "teacher" | "admin");
                    }}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmUserId} onOpenChange={(open) => !open && setConfirmUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the user's role to <strong>{pendingRole}</strong>. Admin users can view all classes and manage other users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmUserId &&
                updateRoleMutation.mutate({ userId: confirmUserId, eduRole: pendingRole })
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
