import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-light"
      style={{
        background: connected ? "rgba(58,184,25,0.12)" : "rgba(0,0,0,0.05)",
        color: connected ? GREEN : "rgba(2,2,2,0.5)",
      }}
    >
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsConfig>(() => loadIntegrations());
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [connectingLuma, setConnectingLuma] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user?.email) {
        setEmail(user.email);
        const name = getDisplayName(user);
        setDisplayName(name);
        const userIsAdmin = isAdmin(user);
        setAdmin(userIsAdmin);
        setTeam(seedTeamForUser(user.email, name, userIsAdmin));
      } else {
        setTeam(loadTeamMembers());
      }
      setIntegrations(loadIntegrations());
      setReady(true);
    })();
  }, []);

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
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      setInviting(false);
      return toast.error(error.message);
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

  async function connectNotion() {
    setConnectingNotion(true);
    await new Promise((r) => setTimeout(r, 600));
    const next = {
      ...integrations,
      notion: { connected: true, accountName: "Flower Children World" },
    };
    setIntegrations(next);
    saveIntegrations(next);
    setConnectingNotion(false);
    toast.success("Notion connected.");
  }

  function disconnectNotion() {
    const next = { ...integrations, notion: { connected: false, accountName: "" } };
    setIntegrations(next);
    saveIntegrations(next);
    toast.success("Notion disconnected.");
  }

  async function connectLuma() {
    setConnectingLuma(true);
    await new Promise((r) => setTimeout(r, 600));
    const next = {
      ...integrations,
      luma: { connected: true, accountName: displayName || "Luma account" },
    };
    setIntegrations(next);
    saveIntegrations(next);
    setConnectingLuma(false);
    toast.success("Luma connected.");
  }

  function disconnectLuma() {
    const next = { ...integrations, luma: { connected: false, accountName: "" } };
    setIntegrations(next);
    saveIntegrations(next);
    toast.success("Luma disconnected.");
  }

  async function connectGoogle() {
    setConnectingGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/settings` },
    });
    if (error) {
      setConnectingGoogle(false);
      return toast.error("Google connection failed.");
    }
  }

  function disconnectGoogle() {
    const next = { ...integrations, google: { connected: false, accountName: "" } };
    setIntegrations(next);
    saveIntegrations(next);
    toast.success("Google disconnected.");
  }

  async function connectStripe() {
    setConnectingStripe(true);
    await new Promise((r) => setTimeout(r, 600));
    const next = {
      ...integrations,
      stripe: { connected: true, accountName: "Flower Children World" },
    };
    setIntegrations(next);
    saveIntegrations(next);
    setConnectingStripe(false);
    toast.success("Stripe connected for donation tracking.");
  }

  function disconnectStripe() {
    const next = { ...integrations, stripe: { connected: false, accountName: "" } };
    setIntegrations(next);
    saveIntegrations(next);
    toast.success("Stripe disconnected.");
  }

  function handleSignOutAll() {
    setSignOutAllOpen(false);
    toast.success("All team members have been signed out.");
  }

  async function handleDeleteAccount() {
    setDeleteAccountOpen(false);
    await supabase.auth.signOut();
    localStorage.removeItem("fcw-team-members");
    localStorage.removeItem("fcw-integrations");
    toast.success("Account deleted.");
    navigate({ to: "/auth" });
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
              <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
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
                  title="Notion"
                  description="Sync Children, Guardians, Volunteers, and Partners databases."
                  connected={integrations.notion.connected}
                  accountName={integrations.notion.accountName}
                  connectLabel="Connect to Notion"
                  connecting={connectingNotion}
                  onConnect={connectNotion}
                  onDisconnect={disconnectNotion}
                />
                <IntegrationCard
                  title="Luma"
                  description="Pull event data from Luma."
                  connected={integrations.luma.connected}
                  accountName={integrations.luma.accountName}
                  connectLabel="Connect to Luma"
                  connecting={connectingLuma}
                  onConnect={connectLuma}
                  onDisconnect={disconnectLuma}
                />
                <IntegrationCard
                  title="Google"
                  description="Calendar sync for programming and events."
                  connected={integrations.google.connected}
                  accountName={integrations.google.accountName}
                  connectLabel="Connect to Google"
                  connecting={connectingGoogle}
                  onConnect={connectGoogle}
                  onDisconnect={disconnectGoogle}
                />
                <IntegrationCard
                  title="Stripe"
                  description="Donation tracking and recurring gifts."
                  connected={integrations.stripe.connected}
                  accountName={integrations.stripe.accountName}
                  connectLabel="Connect Stripe"
                  connecting={connectingStripe}
                  onConnect={connectStripe}
                  onDisconnect={disconnectStripe}
                />
              </div>
            </Section>
          )}

          {admin && (
            <Section label="Danger Zone">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-sm font-normal">Sign out all team members</p>
                    <p className="text-xs text-foreground/50">Ends every active session for your team.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignOutAllOpen(true)}
                    className="rounded-full border-[#C53D3D] text-[#C53D3D] hover:bg-[#C53D3D]/5"
                  >
                    Sign out all
                  </Button>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-[#C53D3D]/20 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-sm font-normal">Delete account</p>
                    <p className="text-xs text-foreground/50">Permanently remove your account and local data.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setDeleteAccountOpen(true)}
                    className="rounded-full text-white hover:opacity-90"
                    style={{ background: RED }}
                  >
                    Delete account
                  </Button>
                </div>
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

        <AlertDialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-normal">Sign out all team members?</AlertDialogTitle>
              <AlertDialogDescription>
                Everyone on your team will need to sign in again. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOutAll}
                className="text-white hover:opacity-90"
                style={{ background: RED }}
              >
                Sign out all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-normal">Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign you out and remove your local workspace data. This action is permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="text-white hover:opacity-90"
                style={{ background: RED }}
              >
                Delete account
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
        <StatusBadge connected={connected} />
      </div>
      {connected ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-light text-foreground/70">{accountName}</p>
          <button
            type="button"
            onClick={onDisconnect}
            className="shrink-0 text-xs text-foreground/50 hover:text-foreground"
          >
            Disconnect
          </button>
        </div>
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
