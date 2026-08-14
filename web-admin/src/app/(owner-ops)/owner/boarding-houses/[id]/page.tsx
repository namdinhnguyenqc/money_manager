import { redirect } from "next/navigation";

export default async function OwnerBoardingHouseDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/facilities/${id}`);
}
