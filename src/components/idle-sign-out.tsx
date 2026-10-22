import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { clearSessionEndedFlag, endInsideSession, sessionWasEnded } from "@/lib/sign-out";

const IDLE_MS = 10 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const ACTIVE_KEY = "fcw-last-active";

function stampActivity() {
  localStorage.setItem(ACTIVE_KEY, String(Date.now()));
}

function idleFor() {
  const stamped = Number(localStorage.getItem(ACTIVE_KEY) || 0);
  if (!stamped) {
    stampActivity();
    return 0;
  }
  return Date.now() - stamped;
}

export function IdleSignOut() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warning = useRef(false);
  const signingOut = useRef(false);
  const hadSession = useRef(false);

  useEffect(() => {
    warning.current = secondsLeft !== null;
  }, [secondsLeft]);

  useEffect(() => {
    let lastStamp = 0;
    let interval = 0;

    async function signOutNow() {
      if (signingOut.current) return;
      signingOut.current = true;
      setSecondsLeft(null);
      await endInsideSession();
      toast("Signed out after 10 minutes away.");
      hadSession.current = false;
      await navigate({ to: "/auth" });
      signingOut.current = false;
    }

    async function tick() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const wasSignedIn = hadSession.current;
        hadSession.current = false;
        setSecondsLeft(null);
        if (wasSignedIn && !signingOut.current) await navigate({ to: "/auth" });
        return;
      }
      if (!hadSession.current) {
        hadSession.current = true;
        clearSessionEndedFlag();
        stampActivity();
        setSecondsLeft(null);
        return;
      }
      if (sessionWasEnded()) {
        await signOutNow();
        return;
      }
      const idle = idleFor();
      if (idle >= IDLE_MS) {
        await signOutNow();
        return;
      }
      if (idle >= IDLE_MS - WARNING_MS) setSecondsLeft(Math.max(1, Math.ceil((IDLE_MS - idle) / 1000)));
      else setSecondsLeft(null);
    }

    function onActivity() {
      if (signingOut.current) return;
      const now = Date.now();
      if (!warning.current && now - lastStamp < 2000) return;
      lastStamp = now;
      stampActivity();
      setSecondsLeft(null);
    }

    function onMove() {
      if (warning.current) return;
      onActivity();
    }

    window.addEventListener("pointerdown", onActivity, true);
    window.addEventListener("keydown", onActivity, true);
    window.addEventListener("wheel", onActivity, { capture: true, passive: true });
    window.addEventListener("touchstart", onActivity, { capture: true, passive: true });
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    interval = window.setInterval(() => void tick(), 1000);
    void tick();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onActivity, true);
      window.removeEventListener("keydown", onActivity, true);
      window.removeEventListener("wheel", onActivity, true);
      window.removeEventListener("touchstart", onActivity, true);
      window.removeEventListener("pointermove", onMove, true);
    };
  }, [navigate]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <div
        role="alertdialog"
        aria-labelledby="idle-title"
        aria-describedby="idle-body"
        className="w-full max-w-sm rounded-3xl bg-[#FCFCFC] px-6 py-6 text-foreground shadow-lg"
      >
        <h2 id="idle-title" className="text-lg font-normal">
          still there?
        </h2>
        <p id="idle-body" className="mt-2 text-sm text-foreground/70">
          Inside signs out after 10 minutes away, to keep child records off a shared screen.
        </p>
        <p className="mt-3 text-sm text-foreground/70">Signing out in {secondsLeft} seconds.</p>
        <button
          type="button"
          className="mt-5 rounded-full bg-[#3AB819] px-4 py-2 text-sm font-normal text-white"
          onClick={() => {
            stampActivity();
            setSecondsLeft(null);
          }}
        >
          stay signed in
        </button>
      </div>
    </div>
  );
}
