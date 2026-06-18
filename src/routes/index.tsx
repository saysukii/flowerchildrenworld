import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flower Children World — Inside" },
      { name: "description", content: "Internal operations portal for Flower Children World." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    })();
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-foreground/50 font-light">Loading…</p>
    </div>
  );
}
