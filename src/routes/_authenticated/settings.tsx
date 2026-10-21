import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/motion";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  type IntegrationsConfig,
  loadIntegrations,
  saveIntegrations,
} from "@/lib/integrations-config";
import { listAcceptedTeamEmails } from "@/lib/api/team.functions";
import {
  activateTeamMemberByEmail,
  loadTeamMembers,
  saveTeamMembers,
  seedTeamForUser,
  type TeamMember,
} from "@/lib/team-members";
import {
  CONTROLLABLE_PAGES,
  DEFAULT_MEMBER_PAGES,
  normalizePages,
  type PageKey,
} from "@/lib/page-access";
import { WASH_BUTTON_CLASS } from "@/lib/wash-button";
import { getDisplayName, isAdmin } from "@/lib/user-role";

import {
  GOOGLE_INTEGRATION_SCOPES,
  clearGoogleAccessToken,
  googleIntegrationFromSession,
  readGoogleAccessToken,
  readGoogleRefreshToken,
} from "@/lib/google";
import { saveWorkspaceGoogleGrant } from "@/lib/api/google.functions";
import {
  fileToAvatarDataUrl,
  resolveAvatarUrl,
  saveUserProfile,
} from "@/lib/user-profile";
import { sendPasswordResetEmail, sendTeamInviteEmail } from "@/lib/api/email.functions";
import { loadEmailLanguage } from "@/lib/email-templates";
import { fetchStripeIntegrationStatus, disconnectStripeConnect, startStripeConnect } from "@/lib/api/stripe.functions";
import type { StripeIntegrationStatus } from "@/lib/stripe-analytics";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Flower Children World" },
      { name: "description", content: "Account, team, and integration settings." },
    ],
  }),
  component: SettingsPage,
});

const GREEN = "#3AB819";
const RED = "#C53D3D";

function SaveButton({
  loading,
  onClick,
  label = "Save",
}: {
  loading?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-full px-4 py-2 text-sm font-normal text-white hover:opacity-90"
      style={{ background: GREEN }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : label}
    </Button>
  );
}

function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="border-t border-black/5 pt-8 first:border-t-0 first:pt-0">
        {label ? <h2 className="font-label mb-6 text-[11px] text-foreground/50">{label}</h2> : null}
        {children}
      </section>
    </Reveal>
  );
}

function IntegrationStatus({
  connected,
  connectLabel,
  connecting,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  connectLabel: string;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-light text-[#1f6b12]"
          >
            Connected
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[7.5rem] rounded-xl border-black/5 bg-white p-1 shadow-md"
        >
          <DropdownMenuItem
            onClick={onDisconnect}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-light text-[#C53D3D] focus:bg-[#C53D3D]/5 focus:text-[#C53D3D]"
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={connecting}
      className={`shrink-0 ${WASH_BUTTON_CLASS}`}
    >
      {connecting ? <Loader2 className="size-4 animate-spin" /> : connectLabel}
    </button>
  );
}

function SettingsPage() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    email: string;
    phone: string;
    role: TeamMember["role"];
    pages: PageKey[];
  } | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsConfig>(() => loadIntegrations());
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeIntegrationStatus>({
    connected: false,
    configured: false,
    accountName: "",
    setupIssues: [],
  });

  const syncGoogleIntegration = useCallback((session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
    const google = googleIntegrationFromSession(session);
    setIntegrations((prev) => {
      const next = {
        ...prev,
        google: {
          connected: google.connected,
          accountName: google.accountName,
          spreadsheetId: prev.google.spreadsheetId,
        },
      };
      saveIntegrations(next);
      return next;
    });
    return google;
  }, []);

  const refreshStripeStatus = useCallback(async () => {
    try {
      const status = await fetchStripeIntegrationStatus();
      setStripeStatus(status);
      return status;
    } catch (error) {
      console.error(error);
      setStripeStatus({ connected: false, configured: false, accountName: "", setupIssues: [] });
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      let userIsAdmin = false;
      if (user?.email) {
        setEmail(user.email);
        setUserId(user.id);
        const name = getDisplayName(user);
        setDisplayName(name);
        setAvatarUrl(resolveAvatarUrl(user.id, user));
        userIsAdmin = isAdmin(user);
        setAdmin(userIsAdmin);
        setTeam(seedTeamForUser(user.email, name, userIsAdmin));
        const pendingEmails = loadTeamMembers()
          .filter((member) => member.status === "Pending")
          .map((member) => member.email);
        if (userIsAdmin && pendingEmails.length > 0) {
          void listAcceptedTeamEmails({ data: { emails: pendingEmails } })
            .then(({ emails }) => {
              if (emails.length === 0) return;
              for (const accepted of emails) activateTeamMemberByEmail(accepted);
              setTeam(loadTeamMembers());
            })
            .catch((error) => {
              console.error(error);
            });
        }
      } else {
        setTeam(loadTeamMembers());
      }
      setIntegrations(loadIntegrations());
      syncGoogleIntegration(data.session);
      const refreshToken = data.session?.provider_refresh_token || readGoogleRefreshToken();
      const accessToken = data.session?.provider_token || readGoogleAccessToken();
      if (userIsAdmin && refreshToken && accessToken) {
        void saveWorkspaceGoogleGrant({ data: { accessToken, refreshToken } }).catch(() => undefined);
      }
      if (userIsAdmin) {
        void refreshStripeStatus();
      }
      setReady(true);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncGoogleIntegration(session);
      if (session?.provider_token) {
        setConnectingGoogle(false);
        toast.success("Google sign-in, Calendar, and Drive are connected.");
        const refreshToken = session.provider_refresh_token || readGoogleRefreshToken();
        if (refreshToken && isAdmin(session.user)) {
          void saveWorkspaceGoogleGrant({
            data: { accessToken: session.provider_token, refreshToken },
          }).catch(() => undefined);
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [syncGoogleIntegration, refreshStripeStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeResult = params.get("stripe");
    if (!stripeResult) return;

    if (stripeResult === "connected") {
      toast.success("Stripe connected for donation analytics.");
      void refreshStripeStatus();
    } else if (stripeResult === "error") {
      toast.error("Stripe connection failed. Try again.");
    }

    window.history.replaceState({}, "", "/settings");
  }, [refreshStripeStatus]);

  async function handlePhotoChange(file: File | null) {
    if (!file || !userId) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      saveUserProfile(userId, { avatarUrl: dataUrl });
      setAvatarUrl(dataUrl);
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update photo.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function removePhoto() {
    if (!userId) return;
    saveUserProfile(userId, { avatarUrl: null });
    setAvatarUrl(null);
    toast.success("Profile photo removed.");
  }

  const persistTeam = useCallback((members: TeamMember[]) => {
    setTeam(members);
    saveTeamMembers(members);
  }, []);

  function openMemberEditor(member: TeamMember) {
    setEditingMember(member);
    setEditDraft({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      pages: [...member.pages],
    });
  }

  function closeMemberEditor() {
    setEditingMember(null);
    setEditDraft(null);
  }

  function toggleEditPage(key: PageKey) {
    if (key === "dashboard" || !editDraft) return;
    setEditDraft((prev) => {
      if (!prev) return prev;
      const next = prev.pages.includes(key)
        ? prev.pages.filter((p) => p !== key)
        : [...prev.pages, key];
      return { ...prev, pages: normalizePages(next) };
    });
  }

  function saveMemberEdits() {
    if (!editingMember || !editDraft) return;
    const nextEmail = editDraft.email.trim().toLowerCase();
    if (!editDraft.name.trim()) return toast.error("Name is required.");
    if (!nextEmail) return toast.error("Email is required.");
    if (
      team.some(
        (m) => m.id !== editingMember.id && m.email.toLowerCase() === nextEmail,
      )
    ) {
      return toast.error("Another member already uses that email.");
    }

    persistTeam(
      team.map((m) =>
        m.id === editingMember.id
          ? {
              ...m,
              name: editDraft.name.trim(),
              email: nextEmail,
              phone: editDraft.phone.trim(),
              role: editingMember.role === "Admin" ? "Admin" : editDraft.role,
              pages: normalizePages(editDraft.pages),
            }
          : m,
      ),
    );
    closeMemberEditor();
    toast.success("Member updated.");
  }

  async function sendResetLink() {
    if (!email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail({
        data: { origin: window.location.origin, language: loadEmailLanguage("password-reset") },
      });
      toast.success("Reset link sent to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setSendingReset(false);
    }
  }

  async function sendInvite() {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) return toast.error("Enter an email address.");
    if (team.some((m) => m.email.toLowerCase() === trimmed)) {
      return toast.error("This member is already on the team.");
    }
    setInviting(true);
    persistTeam([
      ...team,
      {
        id: crypto.randomUUID(),
        name: trimmed.split("@")[0] || "Member",
        email: trimmed,
        phone: "",
        role: "Member",
        status: "Pending",
        pages: [...DEFAULT_MEMBER_PAGES],
      },
    ]);
    setInviteEmail("");
    try {
      await sendTeamInviteEmail({
        data: {
          email: trimmed,
          origin: window.location.origin,
          language: loadEmailLanguage("team-invite"),
        },
      });
      toast.success("Invite sent. They'll stay Pending until they accept.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the invite email.");
    } finally {
      setInviting(false);
    }
  }

  function confirmRemoveMember() {
    if (!removeTarget) return;
    if (editingMember?.id === removeTarget.id) closeMemberEditor();
    persistTeam(team.filter((m) => m.id !== removeTarget.id));
    setRemoveTarget(null);
    toast.success("Member removed.");
  }

  function isSelf(member: TeamMember) {
    return member.email.toLowerCase() === email.toLowerCase();
  }

  async function resendInvite(member: TeamMember) {
    setResendingId(member.id);
    try {
      await sendTeamInviteEmail({
        data: {
          email: member.email,
          origin: window.location.origin,
          language: loadEmailLanguage("team-invite"),
        },
      });
      if (member.status === "Inactive") {
        persistTeam(team.map((item) => (item.id === member.id ? { ...item, status: "Pending" } : item)));
      }
      toast.success("A new invite link was sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the invite.");
    } finally {
      setResendingId(null);
    }
  }

  function deactivateMember(member: TeamMember) {
    if (isSelf(member)) return;
    persistTeam(team.map((item) => (item.id === member.id ? { ...item, status: "Inactive" } : item)));
    toast.success(`${member.name} is inactive.`);
  }

  function reactivateMember(member: TeamMember) {
    persistTeam(team.map((item) => (item.id === member.id ? { ...item, status: "Active" } : item)));
    toast.success(`${member.name} is active.`);
  }

  async function connectGoogle() {
    setConnectingGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/settings`,
        scopes: GOOGLE_INTEGRATION_SCOPES,
        queryParams: {
          access_type: "offline",
          ...(readGoogleRefreshToken() ? {} : { prompt: "consent" }),
        },
      },
    });
    if (error) {
      setConnectingGoogle(false);
      return toast.error("Google connection failed.");
    }
  }

  function disconnectGoogle() {
    clearGoogleAccessToken();
    const next = { ...integrations, google: { connected: false, accountName: "", spreadsheetId: "" } };
    setIntegrations(next);
    saveIntegrations(next);
    toast.success("Google disconnected in this workspace.");
  }

  async function connectStripe() {
    if (!stripeStatus.configured) {
      toast.error(
        stripeStatus.setupIssues.length > 0
          ? `Stripe is not ready yet. Add ${stripeStatus.setupIssues.join(", ")} to your server environment and restart the dev server.`
          : "Stripe is not ready yet. Check server Stripe settings.",
      );
      return;
    }

    setConnectingStripe(true);
    try {
      const { url } = await startStripeConnect({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (error) {
      console.error(error);
      setConnectingStripe(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start Stripe connection. Check server Stripe settings.",
      );
    }
  }

  async function disconnectStripe() {
    setConnectingStripe(true);
    try {
      await disconnectStripeConnect();
      await refreshStripeStatus();
      toast.success("Stripe disconnected.");
    } catch (error) {
      console.error(error);
      toast.error("Could not disconnect Stripe.");
    } finally {
      setConnectingStripe(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-foreground/50">Loading…</div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl text-[#020202]">
        <header className="mb-8">
          <span className="font-label text-[11px] text-foreground/50">Settings</span>
          <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Your workspace</h1>
          <p className="mt-2 text-sm text-foreground/60">Your account, the team, and connected tools.</p>
        </header>

        <div className="space-y-8">
          <Section>
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void handlePhotoChange(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-2 text-xs font-light">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="moss-card rounded-full px-3 py-1.5 text-foreground/70 transition-colors hover:bg-white/70 hover:text-foreground disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Change"
                    )}
                  </button>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="rounded-full px-3 py-1.5 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} readOnly disabled className="bg-foreground/5" />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-normal">Reset password</p>
                  <p className="text-xs text-foreground/50">Email a link to set a new password.</p>
                </div>
                <button
                  type="button"
                  onClick={sendResetLink}
                  disabled={sendingReset}
                  className={WASH_BUTTON_CLASS}
                >
                  {sendingReset ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
                </button>
              </div>
            </div>
          </Section>

          {admin && (
            <Section label="Team">
              <div className="space-y-3 md:hidden">
                {team.slice(0, 4).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => openMemberEditor(member)}
                    className="moss-card w-full rounded-2xl p-4 text-left transition-colors hover:bg-black/[0.02]"
                  >
                    <p className="text-sm font-normal">{member.name}</p>
                    <p className="mt-1 text-xs font-light text-foreground/60">{member.email}</p>
                    <p className="mt-2 text-xs font-light text-foreground/70">
                      {member.role} · {member.status}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </p>
                  </button>
                ))}
              </div>

              <div className="moss-card hidden overflow-x-auto rounded-2xl md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="pr-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.slice(0, 4).map((member) => (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer"
                        onClick={() => openMemberEditor(member)}
                      >
                        <TableCell className="pl-4 font-light">{member.name}</TableCell>
                        <TableCell className="font-light text-foreground/70">{member.email}</TableCell>
                        <TableCell className="font-light text-foreground/70">
                          {member.phone || "—"}
                        </TableCell>
                        <TableCell className="font-light">{member.role}</TableCell>
                        <TableCell className="pr-4 font-light">{member.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {team.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setDirectoryOpen(true)}
                  className="mt-4 text-sm font-light text-foreground/60 hover:text-foreground"
                >
                  View all
                </button>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="invite-email">Invite member</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@flowerchildren.world"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={inviting}
                  className={WASH_BUTTON_CLASS}
                >
                  {inviting ? <Loader2 className="size-4 animate-spin" /> : "Send invite"}
                </button>
              </div>
            </Section>
          )}

          {admin && (
            <Section label="Integrations">
              <div className="space-y-6">
                <IntegrationCard
                  title="Google"
                  description="Connect Calendar and Drive for this workspace."
                  connected={integrations.google.connected}
                  accountName={integrations.google.accountName}
                  connectLabel="Connect to Google"
                  connecting={connectingGoogle}
                  onConnect={connectGoogle}
                  onDisconnect={disconnectGoogle}
                />
                <IntegrationCard
                  title="Stripe"
                  description="Connect the Stripe account that receives gifts."
                  connected={stripeStatus.connected}
                  accountName={stripeStatus.accountName}
                  connectLabel="Connect Stripe"
                  connecting={connectingStripe}
                  onConnect={connectStripe}
                  onDisconnect={disconnectStripe}
                />
              </div>
            </Section>
          )}
        </div>

        <Dialog open={!!editingMember && !!editDraft} onOpenChange={(open) => !open && closeMemberEditor()}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-normal">Edit team member</DialogTitle>
              <DialogDescription>
                {editDraft?.role === "Admin"
                  ? "Update their details. Admins can open every page."
                  : "Update their details and choose which pages they can open. Home stays on so they can always get back into Inside."}
              </DialogDescription>
            </DialogHeader>

            {editDraft ? (
              <div className="space-y-5 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="member-name">Name</Label>
                    <Input
                      id="member-name"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="member-email">Email</Label>
                    <Input
                      id="member-email"
                      type="email"
                      value={editDraft.email}
                      onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="member-phone">Number</Label>
                    <Input
                      id="member-phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={editDraft.phone}
                      onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="member-role">Role</Label>
                    <Select
                      value={editingMember?.role === "Admin" ? "Admin" : editDraft.role}
                      disabled={editingMember?.role === "Admin"}
                      onValueChange={(value: TeamMember["role"]) =>
                        setEditDraft({ ...editDraft, role: value })
                      }
                    >
                      <SelectTrigger id="member-role" className="rounded-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editDraft.role === "Admin" ? null : (
                <div>
                  <p className="mb-2 text-sm font-normal">Permissions</p>
                  <p className="mb-3 text-xs font-light text-foreground/50">
                    Choose which pages this member can open.
                  </p>
                  <div className="moss-card space-y-1 rounded-2xl p-2">
                    {CONTROLLABLE_PAGES.map((page) => {
                      const checked = editDraft.pages.includes(page.key);
                      const locked = page.key === "dashboard";
                      return (
                        <label
                          key={page.key}
                          className={[
                            "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors",
                            locked ? "opacity-70" : "cursor-pointer hover:bg-black/[0.03]",
                          ].join(" ")}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-normal">{page.label}</p>
                            <p className="text-[11px] font-light text-foreground/45">
                              {page.path}
                              {!page.inNav ? " · linked from elsewhere" : ""}
                              {locked ? " · always on" : ""}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggleEditPage(page.key)}
                            className="h-4 w-4 accent-[#3AB819]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {editingMember && !isSelf(editingMember) ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="button"
                    disabled={resendingId === editingMember.id}
                    onClick={() => void resendInvite(editingMember)}
                    className="text-xs font-light text-foreground/55 hover:text-foreground disabled:opacity-50"
                  >
                    {resendingId === editingMember.id ? "Sending…" : "Resend invite"}
                  </button>
                  {editingMember.status === "Inactive" ? (
                    <button
                      type="button"
                      onClick={() => reactivateMember(editingMember)}
                      className="text-xs font-light text-foreground/55 hover:text-foreground"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => deactivateMember(editingMember)}
                      className="text-xs font-light text-foreground/45 hover:text-[#C53D3D]"
                    >
                      Deactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(editingMember)}
                    className="text-xs font-light text-foreground/45 hover:text-[#C53D3D]"
                  >
                    Remove member
                  </button>
                </div>
              ) : (
                <span />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={closeMemberEditor}>
                  Cancel
                </Button>
                <SaveButton onClick={saveMemberEdits} label="Save member" />
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={directoryOpen} onOpenChange={setDirectoryOpen}>
          <DialogContent
            aria-describedby={undefined}
            className="moss-dialog max-w-lg gap-0 overflow-hidden p-0 shadow-none"
          >
            <DialogHeader className="border-b border-black/5 px-6 py-4 text-left">
              <DialogTitle className="font-normal">Team</DialogTitle>
            </DialogHeader>
            <ul className="max-h-[min(70dvh,32rem)] overflow-y-auto">
              {team.map((member) => (
                <li
                  key={member.id}
                  className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-3 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDirectoryOpen(false);
                      openMemberEditor(member);
                    }}
                    className="min-w-0 text-left"
                  >
                    <p className="text-sm font-normal">{member.name}</p>
                    <p className="mt-0.5 truncate text-xs font-light text-foreground/55">{member.email}</p>
                    <p className="mt-1 text-xs font-light text-foreground/45">
                      {member.role} · {member.status}
                    </p>
                  </button>
                  {!isSelf(member) ? (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        type="button"
                        disabled={resendingId === member.id}
                        onClick={() => void resendInvite(member)}
                        className="text-xs font-light text-foreground/55 hover:text-foreground disabled:opacity-50"
                      >
                        {resendingId === member.id ? "Sending…" : "Resend invite"}
                      </button>
                      {member.status === "Inactive" ? (
                        <button
                          type="button"
                          onClick={() => reactivateMember(member)}
                          className="text-xs font-light text-foreground/55 hover:text-foreground"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deactivateMember(member)}
                          className="text-xs font-light text-foreground/45 hover:text-[#C53D3D]"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-normal">Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget?.name} ({removeTarget?.email}) will lose access to Inside.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveMember}
                className="text-white hover:opacity-90"
                style={{ background: RED }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function IntegrationCard({
  title,
  description,
  connected,
  accountName,
  connectLabel,
  connecting,
  onConnect,
  onDisconnect,
}: {
  title: string;
  description: string;
  connected: boolean;
  accountName: string;
  connectLabel: string;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="moss-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-normal">{title}</p>
          <p className="text-xs text-foreground/50">{description}</p>
          {connected && accountName ? (
            <p className="mt-2 text-sm font-light text-foreground/70">{accountName}</p>
          ) : null}
        </div>
        <IntegrationStatus
          connected={connected}
          connectLabel={connectLabel}
          connecting={connecting}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </div>
    </div>
  );
}
