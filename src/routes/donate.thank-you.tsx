import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFormLayout, SuccessState } from "@/components/public-form-layout";

export const Route = createFileRoute("/donate/thank-you")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Thank you — Flower Children World" },
      {
        name: "description",
        content: "Thank you for planting a seed with Flower Children World.",
      },
    ],
  }),
  component: DonateThankYouPage,
});

function DonateThankYouPage() {
  return (
    <PublicFormLayout
      label="Support our mission"
      title="Thank you"
      subtitle="Your gift helps children grow rooted in community, arts, life skills, and mindfulness."
    >
      <SuccessState message="A seed has been planted. We're grateful you're part of the village." />
      <div className="mt-2 text-center">
        <Link to="/donate" className="text-sm font-light text-[#3AB819] hover:underline">
          Give again
        </Link>
      </div>
    </PublicFormLayout>
  );
}
