import { redirect } from "next/navigation";

export default async function OwnerBoardingHouseRoomsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/rooms?facility_id=${encodeURIComponent(id)}`);
}
