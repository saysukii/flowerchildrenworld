import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MeadowGround({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="moss-stage is-meadow">
      <div className="moss-bloom" aria-hidden="true" />
      <div className="moss-mist" aria-hidden="true" />
      <div className="moss-stage-grain" aria-hidden="true" />
      <div className={cn("moss-stage-ui min-h-[100dvh]", className)}>{children}</div>
    </div>
  );
}
