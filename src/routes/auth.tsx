import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import fcwLogo from "@/assets/fcw-full-logo.png.asset.json";
import fcwFlower from "@/assets/fcw-flower.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Flower Children World" },
      { name: "description", content: "Sign in to the Flower Children World operations portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "magic" | "password" | "google">(null);

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the magic link.");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading("password");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setLoading(null);
      return toast.error("Google sign-in failed. Please try again.");
    }
  }

  return (
    <main className="relative flex min-h-screen w-full cursor-none items-center justify-center bg-background px-5 [&_*]:cursor-none">
      <FcwFlowerCursor />
      <div className="absolute inset-x-0 top-6 flex justify-center sm:top-8">
        <img
          src={fcwLogo.url}
          alt="Flower Children World"
          className="fcw-logo-float h-auto w-auto max-w-[120px]"
        />
      </div>

      <div className="flex w-full max-w-lg flex-col items-center gap-4">
          <p className="whitespace-nowrap text-center text-xs font-light text-foreground/60">
            Welcome in. A private space — for the hands that build the village.
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "magic" | "password")}>
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="magic">Magic link</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>

            <TabsContent value="magic">
              <form onSubmit={handleMagic} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-magic">Email</Label>
                  <Input
                    id="email-magic"
                    type="email"
                    autoComplete="email"
                    placeholder="you@flowerchildren.world"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading === "magic" ? <Loader2 className="size-4 animate-spin" /> : "Send link"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="password">
              <form onSubmit={handlePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-pw">Email</Label>
                  <Input
                    id="email-pw"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading === "password" ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-foreground/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs uppercase tracking-wider text-foreground/40">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="w-full inline-flex items-center justify-center gap-3 rounded-md border border-foreground/15 bg-white px-4 py-2.5 text-sm font-light text-[#020202] hover:bg-foreground/5 transition-colors disabled:opacity-60"
          >
            {loading === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  );
}

function FcwFlowerCursor() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    setEnabled(finePointer);
    if (!finePointer) return;

    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onLeave = () => setPos(null);

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (!enabled || !pos) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.x, top: pos.y }}
    >
      <img
        src={fcwFlower.url}
        alt=""
        className="fcw-flower-spin h-7 w-7 object-contain"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.441 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}
