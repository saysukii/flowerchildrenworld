import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FORM_CONFIRMATION_TEMPLATE } from "@/lib/email-templates";
import { getAppOrigin, isEmailConfigured, sendTemplatedEmail } from "@/lib/email.server";

const ALLOWED_ORIGIN =
  process.env.VITE_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ?? "https://flowerchildren.world";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VolunteerSchema = z.object({
  type: z.literal("volunteer"),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  hear_about: z.string().max(200).optional(),
  skills: z.string().max(2000).optional(),
  availability: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const PartnerSchema = z.object({
  type: z.literal("partner"),
  contact_name: z.string().min(1).max(100),
  organization_name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  partnership_type: z.string().max(100).optional(),
  show_up: z.string().max(2000).optional(),
  message: z.string().max(2000).optional(),
});

const EnrollmentSchema = z.object({
  type: z.literal("enrollment"),
  child_name: z.string().min(1).max(100),
  date_of_birth: z.string().min(1).max(30),
  program: z.string().max(100).optional(),
  guardian_name: z.string().min(1).max(100),
  guardian_email: z.string().email(),
  guardian_phone: z.string().max(50).optional(),
  emergency_contact_name: z.string().min(1).max(100),
  emergency_contact_phone: z.string().min(1).max(50),
  notes: z.string().max(2000).optional(),
});

const FormSubmitSchema = z.discriminatedUnion("type", [
  VolunteerSchema,
  PartnerSchema,
  EnrollmentSchema,
]);

export const Route = createFileRoute("/api/forms/submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const parsed = FormSubmitSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }

        const submission = parsed.data;
        const appOrigin = getAppOrigin(ALLOWED_ORIGIN);

        let recipientEmail = "";
        let templateId = FORM_CONFIRMATION_TEMPLATE[submission.type];
        let vars: Record<string, string> = {};

        if (submission.type === "volunteer") {
          recipientEmail = submission.email;
          vars = { first_name: submission.first_name };
        } else if (submission.type === "partner") {
          recipientEmail = submission.email;
          vars = { contact_name: submission.contact_name };
        } else {
          recipientEmail = submission.guardian_email;
          vars = {
            guardian_name: submission.guardian_name,
            child_name: submission.child_name,
          };
        }

        console.info("[Forms] Submission received", {
          type: submission.type,
          email: recipientEmail,
        });

        let emailSent = false;
        if (isEmailConfigured()) {
          try {
            await sendTemplatedEmail({
              templateId,
              to: recipientEmail,
              vars,
              origin: appOrigin,
            });
            emailSent = true;
          } catch (err) {
            console.error("[Forms] Confirmation email failed", err);
          }
        } else {
          console.warn("[Forms] Email not configured — submission accepted without confirmation email");
        }

        return jsonResponse({ ok: true, emailSent }, 200);
      },
    },
  },
});
