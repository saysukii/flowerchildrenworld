import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { loadTeamMembers, saveTeamMembers, seedTeamForUser, type TeamMember } from "@/lib/team-members";
import { getDisplayName, isAdmin } from "@/lib/user-role";
import {
  GOOGLE_INTEGRATION_SCOPES,
  googleIntegrationFromSession,
} from "@/lib/google";
import {
  fileToAvatarDataUrl,
  resolveAvatarUrl,
  saveUserProfile,
} from "@/lib/user-profile";
import { sendTeamInviteEmail } from "@/lib/api/email.functions";
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

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-black/5 pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-label mb-6 text-[11px] text-foreground/50">{label}</h2>
      {children}
    </section>
  );
}

function StatusBadge({
  connected,
  onDisconnect,
}: {
  connected: boolean;
  onDisconnect?: () => void;
}) {
  const className = "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-light";
  const style = {
    background: connected ? "rgba(58,184,25,0.12)" : "rgba(0,0,0,0.05)",
    color: connected ? GREEN : "rgba(2,2,2,0.5)",
  };

  if (connected && onDisconnect) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${className} cursor-pointer items-center gap-1 transition-opacity hover:opacity-75`}
            style={style}
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
    <span className={className} style={style}>
      {connected ? "Connected" : "Disconnected"}
    </span>
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
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
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
      } else {
        setTeam(loadTeamMembers());
      }
      setIntegrations(loadIntegrations());
      syncGoogleIntegration(data.session);
      if (userIsAdmin) {
        void refreshStripeStatus();
      }
      setReady(true);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncGoogleIntegration(session);
      if (session?.provider_token) {
        setConnectingGoogle(false);
        toast.success("Google Calendar & Sheets access enabled.");
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

  async function sendResetLink() {
    if (!email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSendingReset(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent to your email.");
  }

  async function sendInvite() {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) return toast.error("Enter an email address.");
    if (team.some((m) => m.email.toLowerCase() === trimmed)) {
      return toast.error("This member is already on the team.");
    }
    setInviting(true);
    try {
      await sendTeamInviteEmail({
        data: { email: trimmed, origin: window.location.origin },
      });
    } catch (err) {
      setInviting(false);
      return toast.error(err instanceof Error ? err.message : "Could not send invite.");
    }
    persistTeam([
      ...team,
      {
        id: crypto.randomUUID(),
        name: trimmed.split("@")[0],
        email: trimmed,
        role: "Member",
        status: "Pending",
      },
    ]);
    setInviteEmail("");
    setInviting(false);
    toast.success("Invite sent — they'll appear as Pending until onboarding is complete.");
  }

  function confirmRemoveMember() {
    if (!removeTarget) return;
    persistTeam(team.filter((m) => m.id !== removeTarget.id));
    setRemoveTarget(null);
    toast.success("Member removed.");
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
          prompt: "consent",
        },
      },
    });
    if (error) {
      setConnectingGoogle(false);
      return toast.error("Google connection failed.");
    }
  }

  function disconnectGoogle() {
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
      <AppShell>
        <div className="mx-auto max-w-3xl py-12 text-center text-sm text-foreground/50">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl text-[#020202]" style={{ background: "#FCFCFC" }}>
        <header className="mb-8">
          <span className="font-label text-[11px] text-foreground/50">Settings</span>
          <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Your workspace</h1>
          <p className="mt-2 text-sm text-foreground/60">Account, team, integrations, and security.</p>
        </header>

        <div className="space-y-8">
          <Section label="Account">
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
                    className="rounded-full border border-black/10 px-3 py-1.5 text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50"
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
                  <p className="text-xs text-foreground/50">Send a reset link to your email.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendResetLink}
                  disabled={sendingReset}
                  className="rounded-full"
                >
                  {sendingReset ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
                </Button>
              </div>
            </div>
          </Section>

          {admin && (
            <Section label="Team">
              <div className="space-y-3 md:hidden">
                {team.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-black/5 bg-white p-4"
                  >
                    <p className="text-sm font-normal">{member.name}</p>
                    <p className="mt-1 text-xs font-light text-foreground/60">{member.email}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-light text-foreground/70">
                        {member.role} · {member.status}
                      </span>
                      {member.email.toLowerCase() !== email.toLowerCase() ? (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(member)}
                          className="text-xs text-foreground/50 hover:text-foreground"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-2xl border border-black/5 bg-white md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-4 text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-4 font-light">{member.name}</TableCell>
                        <TableCell className="font-light text-foreground/70">{member.email}</TableCell>
                        <TableCell className="font-light">{member.role}</TableCell>
                        <TableCell className="font-light">{member.status}</TableCell>
                        <TableCell className="pr-4 text-right">
                          {member.email.toLowerCase() !== email.toLowerCase() && (
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(member)}
                              className="text-xs text-foreground/50 hover:text-foreground"
                            >
                              Remove
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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
                <SaveButton loading={inviting} onClick={sendInvite} label="Send invite" />
              </div>
            </Section>
          )}

          {admin && (
            <Section label="Integrations">
              <div className="space-y-6">
                <IntegrationCard
                  title="Google"
                  description="Calendar sync and Google Sheets import for Community."
                  connected={integrations.google.connected}
                  accountName={integrations.google.accountName}
                  connectLabel="Connect to Google"
                  connecting={connectingGoogle}
                  onConnect={connectGoogle}
                  onDisconnect={disconnectGoogle}
                />
                <IntegrationCard
                  title="Stripe"
                  description="Donation analytics from your Stripe account."
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
    </AppShell>
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
    <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-normal">{title}</p>
          <p className="text-xs text-foreground/50">{description}</p>
        </div>
        <StatusBadge connected={connected} onDisconnect={connected ? onDisconnect : undefined} />
      </div>
      {connected ? (
        accountName ? (
          <p className="mt-4 text-sm font-light text-foreground/70">{accountName}</p>
        ) : null
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onConnect}
          disabled={connecting}
          className="mt-4 rounded-full"
        >
          {connecting ? <Loader2 className="size-4 animate-spin" /> : connectLabel}
        </Button>
      )}
    </div>
  );
}
