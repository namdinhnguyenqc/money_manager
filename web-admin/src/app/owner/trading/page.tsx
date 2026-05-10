"use client";

import { useRouter } from "next/navigation";
import TradingPage from "@/legacy/components/pages/TradingPage";

export default function OwnerTradingPage() {
  const router = useRouter();
  const LegacyTradingPage = TradingPage as any;

  const navigate = (target: string) => {
    if (target === "settings") {
      router.push("/owner/settings");
      return;
    }
    if (target === "transactions") {
      router.push("/owner/transactions");
      return;
    }
    router.push("/owner/dashboard");
  };

  return <LegacyTradingPage navigate={navigate} />;
}
