import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getClientSessionUser } from "@/integrations/supabase/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getClientSessionUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
