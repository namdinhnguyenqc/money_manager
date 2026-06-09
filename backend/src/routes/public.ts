import { Hono } from "hono";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import type { AppEnv } from "../types.js";

const publicRoutes = new Hono<AppEnv>();

const leadSchema = z.object({
  boardingHouseId: z.string().min(1),
  roomId: z.string().optional(),
  guestName: z.string().trim().min(1),
  guestPhone: z.string().trim().min(6).optional(),
  guestEmail: z.string().trim().email().optional(),
  message: z.string().trim().max(1000).optional(),
});

const bookingSchema = leadSchema.extend({
  desiredMoveIn: z.string().trim().optional(),
});

const marketplaceLeadSchema = leadSchema.extend({
  desiredMoveIn: z.string().trim().optional(),
  viewingTime: z.string().trim().optional(),
});

const toPublicHouse = (house: any) => ({
  id: house.id,
  name: house.name,
  address: house.address,
  description: house.description,
  latitude: house.latitude,
  longitude: house.longitude,
  status: house.status,
  isPublic: house.isPublic ?? house.is_public,
  createdAt: house.createdAt ?? house.created_at,
});

const toPublicRoom = (room: any) => ({
  id: room.id,
  name: room.name,
  number: room.name,
  boardingHouseId: room.boardingHouseId ?? room.boarding_house_id,
  price: room.price,
  status: room.status,
  isPublic: room.isPublic ?? room.is_public,
  createdAt: room.createdAt ?? room.created_at,
});

const toMarketplaceRoom = (room: any) => ({
  id: room.id,
  name: room.name,
  title: room.listing_title || `${room.name} tại ${room.boarding_houses?.name || "TroCare"}`,
  description: room.listing_description || room.boarding_houses?.description || "",
  price: Number(room.price || 0),
  depositAmount: Number(room.deposit_amount || 0),
  area: Number(room.area || 0),
  maxPeople: Number(room.max_people || 1),
  status: room.status,
  imageUrls: Array.isArray(room.image_urls) ? room.image_urls : [],
  amenities: Array.isArray(room.amenities) ? room.amenities : [],
  availableFrom: room.available_from,
  allowsPets: Boolean(room.allows_pets),
  contactPhone: room.contact_phone || null,
  contactZalo: room.contact_zalo || room.contact_phone || null,
  publishedAt: room.published_at || room.created_at,
  boardingHouse: {
    id: room.boarding_houses?.id,
    name: room.boarding_houses?.name,
    address: room.boarding_houses?.address,
    latitude: room.boarding_houses?.latitude,
    longitude: room.boarding_houses?.longitude,
  },
});

publicRoutes.get("/marketplace/rooms", async (c) => {
  const query = (c.req.query("q") || "").trim();
  const minPrice = Number(c.req.query("minPrice") || 0);
  const maxPrice = Number(c.req.query("maxPrice") || 0);
  const maxPeople = Number(c.req.query("people") || 0);
  const limit = Math.min(Number(c.req.query("limit") || 60), 100);

  let dbQuery = supabaseAdmin
    .from("rooms")
    .select(`
      id,name,price,area,max_people,status,is_public,listing_title,listing_description,
      image_urls,amenities,deposit_amount,available_from,contact_phone,contact_zalo,
      allows_pets,published_at,created_at,
      boarding_houses!inner(id,name,address,description,latitude,longitude,status,is_public)
    `)
    .eq("is_public", true)
    .in("status", ["AVAILABLE", "vacant", "available"])
    .eq("boarding_houses.status", "ACTIVE")
    .eq("boarding_houses.is_public", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (minPrice > 0) dbQuery = dbQuery.gte("price", minPrice);
  if (maxPrice > 0) dbQuery = dbQuery.lte("price", maxPrice);
  if (maxPeople > 0) dbQuery = dbQuery.gte("max_people", maxPeople);

  const { data, error } = await dbQuery;
  if (error) return c.json({ error: "Failed to fetch marketplace rooms" }, 500);

  const normalizedQuery = query.toLocaleLowerCase("vi");
  const rows = (data || [])
    .map(toMarketplaceRoom)
    .filter((room) => {
      if (!normalizedQuery) return true;
      return [
        room.title,
        room.description,
        room.boardingHouse.name,
        room.boardingHouse.address,
        room.amenities.join(" "),
      ].join(" ").toLocaleLowerCase("vi").includes(normalizedQuery);
    });

  return c.json({ data: rows, pagination: { page: 1, limit, total: rows.length } });
});

publicRoutes.get("/marketplace/rooms/:id", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select(`
      id,name,price,area,max_people,status,is_public,listing_title,listing_description,
      image_urls,amenities,deposit_amount,available_from,contact_phone,contact_zalo,
      allows_pets,published_at,created_at,
      boarding_houses!inner(id,name,address,description,latitude,longitude,status,is_public)
    `)
    .eq("id", c.req.param("id"))
    .eq("is_public", true)
    .eq("boarding_houses.status", "ACTIVE")
    .eq("boarding_houses.is_public", true)
    .single();

  if (error || !data) return c.json({ error: "Room not found" }, 404);
  return c.json({ data: toMarketplaceRoom(data) });
});

publicRoutes.post("/marketplace/leads", async (c) => {
  const parsed = marketplaceLeadSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Thông tin liên hệ không hợp lệ", details: parsed.error.issues }, 400);
  const { boardingHouseId, roomId, guestName, guestPhone, guestEmail, message, desiredMoveIn, viewingTime } = parsed.data;
  if (!roomId) return c.json({ error: "roomId is required" }, 400);

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id,boarding_house_id,is_public")
    .eq("id", roomId)
    .eq("boarding_house_id", boardingHouseId)
    .eq("is_public", true)
    .single();
  if (!room) return c.json({ error: "Room not found" }, 404);

  const detail = [
    message,
    desiredMoveIn ? `Ngày muốn vào: ${desiredMoveIn}` : "",
    viewingTime ? `Lịch xem mong muốn: ${viewingTime}` : "",
  ].filter(Boolean).join("\n");

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      boarding_house_id: boardingHouseId,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone ?? null,
      guest_email: guestEmail ?? null,
      message: detail || null,
      status: "NEW",
    })
    .select("id,status,created_at")
    .single();
  if (error) return c.json({ error: "Failed to create lead" }, 500);
  return c.json({ data }, 201);
});

publicRoutes.get("/boarding-houses", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("boarding_houses")
    .select("id,name,address,description,latitude,longitude,status,is_public,created_at")
    .eq("status", "ACTIVE")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public boarding houses:", error);
    return c.json({ error: "Failed to fetch public boarding houses" }, 500);
  }

  const rows = data?.map(toPublicHouse) ?? [];
  return c.json({ data: rows, pagination: { page: 1, limit: rows.length, total: rows.length } });
});

publicRoutes.get("/boarding-houses/:id", async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabaseAdmin
    .from("boarding_houses")
    .select("id,name,address,description,latitude,longitude,status,is_public,created_at")
    .eq("id", id)
    .eq("status", "ACTIVE")
    .eq("is_public", true)
    .single();

  if (error || !data) {
    return c.json({ error: "Boarding house not found" }, 404);
  }

  return c.json({ data: toPublicHouse(data) });
});

publicRoutes.get("/rooms", async (c) => {
  const boardingHouseId = c.req.query("bhId") || c.req.query("boardingHouseId");
  if (!boardingHouseId) return c.json({ error: "boardingHouseId is required" }, 400);

  const { data: house, error: houseError } = await supabaseAdmin
    .from("boarding_houses")
    .select("id")
    .eq("id", boardingHouseId)
    .eq("status", "ACTIVE")
    .eq("is_public", true)
    .single();

  if (houseError || !house) {
    return c.json({ error: "Boarding house not found" }, 404);
  }

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id,name,boarding_house_id,price,status,is_public,created_at")
    .eq("boarding_house_id", boardingHouseId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public rooms:", error);
    return c.json({ error: "Failed to fetch rooms" }, 500);
  }

  return c.json({ data: data?.map(toPublicRoom) ?? [] });
});

publicRoutes.post("/leads", async (c) => {
  const parsed = leadSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "Invalid lead data", details: parsed.error.issues }, 400);
  }

  const { boardingHouseId, roomId, guestName, guestPhone, guestEmail, message } = parsed.data;

  const { data: house, error: houseError } = await supabaseAdmin
    .from("boarding_houses")
    .select("id")
    .eq("id", boardingHouseId)
    .eq("status", "ACTIVE")
    .eq("is_public", true)
    .single();

  if (houseError || !house) {
    return c.json({ error: "Boarding house not found" }, 404);
  }

  if (roomId) {
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("boarding_house_id", boardingHouseId)
      .eq("is_public", true)
      .single();
    if (roomError || !room) return c.json({ error: "Room not found" }, 404);
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      boarding_house_id: boardingHouseId,
      room_id: roomId ?? null,
      guest_name: guestName,
      guest_phone: guestPhone ?? null,
      guest_email: guestEmail ?? null,
      message: message ?? null,
      status: "NEW",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating public lead:", error);
    return c.json({ error: "Failed to create lead" }, 500);
  }

  return c.json({
    data: {
      id: data.id,
      guestName: data.guest_name,
      guestPhone: data.guest_phone,
      guestEmail: data.guest_email,
      boardingHouseId: data.boarding_house_id,
      roomId: data.room_id,
      status: data.status,
      message: data.message,
      createdAt: data.created_at,
    },
  }, 201);
});

publicRoutes.post("/bookings", async (c) => {
  const parsed = bookingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "Invalid booking data", details: parsed.error.issues }, 400);
  }

  const { boardingHouseId, roomId, guestName, guestPhone, guestEmail, message, desiredMoveIn } = parsed.data;
  if (!roomId) return c.json({ error: "roomId is required for booking" }, 400);

  const { data: room, error: roomError } = await supabaseAdmin
    .from("rental_rooms")
    .select("id,title,building_id,current_status,is_public,rental_buildings!inner(id,status)")
    .eq("id", roomId)
    .eq("building_id", boardingHouseId)
    .eq("is_public", true)
    .single();

  if (roomError || !room) return c.json({ error: "Room not found" }, 404);
  if (room.current_status !== "AVAILABLE") return c.json({ error: "Room is not available" }, 409);

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("rental_leads")
    .insert({
      building_id: boardingHouseId,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone ?? null,
      guest_email: guestEmail ?? null,
      message: message ?? null,
      status: "NEW",
      source: "PUBLIC_WEB",
    })
    .select()
    .single();

  if (leadError || !lead) {
    console.error("Error creating booking lead:", leadError);
    return c.json({ error: "Failed to create booking request" }, 500);
  }

  const { data, error } = await supabaseAdmin
    .from("rental_bookings")
    .insert({
      room_id: roomId,
      lead_id: lead.id,
      booking_mode: "HOLD_FIRST",
      status: "PENDING",
      desired_move_in: desiredMoveIn || null,
      message: message ?? null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error creating booking:", error);
    return c.json({ error: "Failed to create booking request" }, 500);
  }

  return c.json({
    data: {
      id: data.id,
      boardingHouseId,
      roomId,
      roomName: room.title,
      guestName,
      guestPhone,
      message,
      desiredMoveIn: data.desired_move_in,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
  }, 201);
});

export default publicRoutes;
