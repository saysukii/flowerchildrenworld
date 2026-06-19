const PUBLIC_SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ?? "https://flowerchildren.world";

export const PUBLIC_FORM_PATHS = {
  join: "/join",
  partner: "/partner",
  enroll: "/enroll",
} as const;

export type PublicFormKey = keyof typeof PUBLIC_FORM_PATHS;

export function getPublicFormUrl(path: string) {
  return `${PUBLIC_SITE_ORIGIN}${path}`;
}
