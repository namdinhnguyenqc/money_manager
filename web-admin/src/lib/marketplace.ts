import { API_URL } from "@/lib/api";

export type MarketplaceRoom = {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  depositAmount: number;
  area: number;
  maxPeople: number;
  imageUrls: string[];
  amenities: string[];
  availableFrom?: string | null;
  allowsPets: boolean;
  contactPhone?: string | null;
  contactZalo?: string | null;
  publishedAt?: string | null;
  boardingHouse: {
    id: string;
    name: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Không thể kết nối TroCare.");
  return data;
}

export const formatRent = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))}đ`;

export const fallbackRoomImage = "/brand/trocare-og-banner.png";
