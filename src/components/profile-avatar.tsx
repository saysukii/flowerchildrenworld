import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const GREEN = "#3AB819";

type ProfileAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
} as const;

export function ProfileAvatar({ name, avatarUrl, size = "sm", className }: ProfileAvatarProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null}
      <AvatarFallback
        className="font-normal text-white"
        style={{ background: GREEN }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
