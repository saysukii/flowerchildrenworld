import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getClientSessionUser } from "@/integrations/supabase/auth";
import {
  canAccessPage,
  firstAllowedPath,
  pageKeyFromPath,
} from "@/lib/page-access";
import { getMemberPagesForEmail } from "@/lib/team-members";
import { isAdmin } from "@/lib/user-role";

const ALWAYS_ALLOWED = new Set(["/settings", "/onboarding"]);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getClientSessionUser();
    if (!user) throw redirect({ to: "/auth" });

    const path = location.pathname;
    if (!ALWAYS_ALLOWED.has(path)) {
      const pageKey = pageKeyFromPath(path);
      if (pageKey) {
        const admin = isAdmin(user);
        const memberPages = getMemberPagesForEmail(user.email);
        if (!canAccessPage(pageKey, admin, memberPages)) {
          throw redirect({ to: firstAllowedPath(admin, memberPages) });
        }
      }
    }

    return { user };
  },
  component: () => <Outlet />,
});
