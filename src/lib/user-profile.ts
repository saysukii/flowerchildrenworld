import type { User } from "@supabase/supabase-js";

const STORAGE_PREFIX = "fcw-user-profile";
export const AVATAR_MAX_BYTES = 500_000;
export const PROFILE_UPDATED_EVENT = "fcw-profile-updated";

export type UserProfile = {
  avatarUrl: string | null;
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function loadUserProfile(userId: string): UserProfile {
  if (typeof window === "undefined") return { avatarUrl: null };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { avatarUrl: null };
    const parsed = JSON.parse(raw) as UserProfile;
    return { avatarUrl: parsed.avatarUrl ?? null };
  } catch {
    return { avatarUrl: null };
  }
}

export function saveUserProfile(userId: string, profile: UserProfile) {
  localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: { userId } }));
}

export function resolveAvatarUrl(userId: string, user?: User | null): string | null {
  const local = loadUserProfile(userId).avatarUrl;
  if (local) return local;

  const meta = user?.user_metadata ?? {};
  if (typeof meta.avatar_url === "string" && meta.avatar_url) return meta.avatar_url;
  if (typeof meta.picture === "string" && meta.picture) return meta.picture;
  return null;
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Photos must be under 500 KB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}
