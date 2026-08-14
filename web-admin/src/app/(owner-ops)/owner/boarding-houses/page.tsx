import { redirect } from "next/navigation";

// Giữ URL cũ cho các bookmark/onboarding, nhưng chỉ dùng một luồng Cơ sở.
// Tránh hai màn hình khác nhau cùng quản lý Facility khiến dữ liệu Dãy bị mất ngữ cảnh.
export default function OwnerBoardingHousesRedirect() {
  redirect("/facilities");
}
