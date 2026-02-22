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
  KeyRound,
  Eye,
  EyeOff,
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

      {/* Change Password */}
      <ChangePasswordSection />

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
            Your profile is linked to your email/password account. Contact your administrator to update your name or email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Change Password</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-sm">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="w-full sm:w-auto"
          >
            {changePasswordMutation.isPending ? (
              <>
                <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                Updating...
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </form>
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

  const updateStatusMutation = trpc.admin.updateAccountStatus.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.listUsers.invalidate();
      toast.success(
        vars.accountStatus === "approved"
          ? "Account approved — teacher can now sign in"
          : "Account rejected"
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingUsers = allUsers.filter((u: any) => u.accountStatus === "pending");
  const activeUsers = allUsers.filter((u: any) => u.accountStatus !== "pending");

  return (
    <>
      {/* Pending Approval Queue */}
      {pendingUsers.length > 0 && (
        <Card className="border shadow-sm border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Pending Teacher Approvals</CardTitle>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 ml-auto">
                {pendingUsers.length} pending
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These teachers have registered and are waiting for your approval before they can access EduTrack.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 border border-amber-200 bg-amber-50/40 rounded-lg">
                  <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ userId: u.id, accountStatus: "rejected" })}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ userId: u.id, accountStatus: "approved" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active User Management */}
      <Card className="border shadow-sm border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base">Admin — User Management</CardTitle>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 ml-auto">Admin Only</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active users yet.</p>
          ) : (
            <div className="space-y-2">
              {activeUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.accountStatus === "rejected" && (
                      <Badge variant="destructive" className="text-xs mt-0.5">Rejected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={u.eduRole === "admin" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {u.eduRole ?? "teacher"}
                    </Badge>
                    {u.accountStatus === "rejected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ userId: u.id, accountStatus: "approved" })}
                      >
                        Re-approve
                      </Button>
                    ) : (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
