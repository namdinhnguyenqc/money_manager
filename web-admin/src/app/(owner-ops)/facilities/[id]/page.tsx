import { redirect } from "next/navigation";

export default async function LegacyFacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/rooms?facility_id=${encodeURIComponent(id)}`);
}
