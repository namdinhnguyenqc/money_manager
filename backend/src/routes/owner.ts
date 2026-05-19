import { Hono } from "hono";
import { z } from "zod";

import { requireAuth, requireOwner } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const ownerRoutes = new Hono<AppEnv>();

ownerRoutes.use("*", requireAuth, requireOwner);

// ============================================================
// DASHBOARD BULK ENDPOINT (PHASE 4)
// ============================================================
ownerRoutes.get("/dashboard-init", cacheMiddleware(30), async (c) => {
  const currentUser = c.get("user");
  const supabase = c.get("supabase");

  // Parallel Supabase queries for performance
  const [bhRes, roomsRes, walletsRes, settingsRes] = await Promise.all([
    supabase.from("boarding_houses").select(`
      id, name, address, status, is_public, created_at,
      rooms(id, status)
    `).eq("owner_id", currentUser.id),
    supabase.from("rooms").select("id, name, price, status, num_people, has_ac").eq("user_id", currentUser.id),
    supabase.from("wallets").select("*").eq("user_id", currentUser.id),
    supabase.from("users").select("id, status, is_profile_completed").eq("id", currentUser.id).single()
  ]);

  return c.json({
    boardingHouses: bhRes.data || [],
    rooms: roomsRes.data || [],
    wallets: walletsRes.data || [],
    settings: settingsRes.data || {}
  });
});

const boardingHouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  isPublic: z.boolean().default(false),
});

const updateBoardingHouseSchema = boardingHouseSchema.partial();

const roomSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  area: z.number().nonnegative().optional(),
  maxPeople: z.number().int().positive().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
  isPublic: z.boolean().default(false),
});

const updateRoomSchema = roomSchema.partial();

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

const mapRentalStatusToOwner = (status?: string) => {
  if (status === "occupied") return "OCCUPIED";
  if (status === "maintenance") return "MAINTENANCE";
  return "AVAILABLE";
};

const mapOwnerStatusToRental = (status?: string) => {
  if (status === "OCCUPIED") return "occupied";
  if (status === "MAINTENANCE") return "maintenance";
  return "vacant";
};

ownerRoutes.get("/boarding-houses", cacheMiddleware(30), async (c) => {
  const currentUser = c.get("user");
  const { page = "1", limit = "20", status = "" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = c
    .get("supabase")
    .from("boarding_houses")
    .select("*", { count: "exact" })
    .eq("owner_id", currentUser.id);

  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching boarding houses:", error);
    return c.json({ error: "Failed to fetch boarding houses" }, 500);
  }

  return c.json({
    data: data?.map((bh) => ({
      id: bh.id,
      name: bh.name,
      address: bh.address,
      description: bh.description,
      latitude: bh.latitude,
      longitude: bh.longitude,
      status: bh.status,
      isPublic: bh.is_public,
      ownerId: bh.owner_id,
      createdAt: bh.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

ownerRoutes.get("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .select("*")
    .eq("id", bhId)
    .eq("owner_id", currentUser.id)
    .single();

  if (error || !data) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    isPublic: data.is_public,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.post("/boarding-houses", async (c) => {
  const currentUser = c.get("user");
  const parsed = await c.req.json();

  const validation = boardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const { name, address, description, latitude, longitude, status, isPublic } =
    validation.data;

  const { data: bh, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .insert({
      name,
      address,
      description,
      latitude,
      longitude,
      status,
      is_public: isPublic,
      owner_id: currentUser.id,
    })
    .select()
    .single();

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  if (error) {
    console.error("Error creating boarding house:", error);
    return c.json({ error: "Failed to create boarding house" }, 500);
  }

  return c.json(
    {
      id: bh.id,
      name: bh.name,
      address: bh.address,
      description: bh.description,
      latitude: bh.latitude,
      longitude: bh.longitude,
      status: bh.status,
      isPublic: bh.is_public,
      ownerId: bh.owner_id,
      createdAt: bh.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const validation = updateBoardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.isPublic !== undefined) {
    updateData.is_public = validation.data.isPublic;
    delete updateData.isPublic;
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .update(updateData)
    .eq("id", bhId)
    .select()
    .single();

  if (error) {
    console.error("Error updating boarding house:", error);
    return c.json({ error: "Failed to update boarding house" }, 500);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    isPublic: data.is_public,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }



  const { error } = await c
    .get("supabase")
    .from("boarding_houses")
    .delete()
    .eq("id", bhId);

  if (error) {
    console.error("Error deleting boarding house:", error);
    return c.json({ error: "Failed to delete boarding house" }, 500);
  }

  return c.json({ success: true });
});

ownerRoutes.get("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const { status = "", isPublic = "" } = c.req.query();

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  let query = c
    .get("supabase")
    .from("rooms")
    .select("*")
    .eq("boarding_house_id", bhId);

  if (status) {
    query = query.eq("status", status);
  }
  if (isPublic !== "") {
    query = query.eq("is_public", isPublic === "true");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching rooms:", error);
    return c.json({ error: "Failed to fetch rooms" }, 500);
  }

  return c.json({
    data: data?.map((r) => ({
      id: r.id,
      name: r.name,
      boardingHouseId: r.boarding_house_id,
      price: r.price,
      status: r.status,
      isPublic: r.is_public,
      createdAt: r.created_at,
    })),
  });
});

ownerRoutes.post("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const validation = roomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const { name, price, status, isPublic } = validation.data;

  const { data: room, error } = await c
    .get("supabase")
    .from("rooms")
    .insert({
      user_id: currentUser.id,
      name,
      boarding_house_id: bhId,
      price,
      area: 0,
      max_people: 1,
      status,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }

  return c.json(
    {
      id: room.id,
      name: room.name,
      boardingHouseId: room.boarding_house_id,
      price: room.price,
      area: room.area,
      maxPeople: room.max_people,
      status: room.status,
      isPublic: room.is_public,
      createdAt: room.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");
  const parsed = await c.req.json();

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  const validation = updateRoomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.isPublic !== undefined) {
    updateData.is_public = validation.data.isPublic;
    delete updateData.isPublic;
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("rooms")
    .update(updateData)
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating room:", error);
    return c.json({ error: "Failed to update room" }, 500);
  }

  return c.json({
    id: data.id,
    name: data.name,
    boardingHouseId: data.boarding_house_id,
    price: data.price,
    status: data.status,
    isPublic: data.is_public,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }



  const { error } = await c
    .get("supabase")
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room:", error);
    return c.json({ error: "Failed to delete room" }, 500);
  }

  return c.json({ success: true });
});

ownerRoutes.get("/leads", async (c) => {
  const currentUser = c.get("user");
  const {
    page = "1",
    limit = "20",
    status = "",
    boardingHouseId = "",
  } = c.req.query();

  const { data: boardingHouses } = await c
    .get("supabase")
    .from("boarding_houses")
    .select("id")
    .eq("owner_id", currentUser.id);

  const bhIds = boardingHouses?.map((bh) => bh.id) || [];

  if (bhIds.length === 0) {
    return c.json({ data: [], pagination: { page: 1, limit: 20, total: 0 } });
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = c
    .get("supabase")
    .from("leads")
    .select("*", { count: "exact" })
    .in("boarding_house_id", bhIds);

  if (boardingHouseId) {
    query = query.eq("boarding_house_id", boardingHouseId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching leads:", error);
    return c.json({ error: "Failed to fetch leads" }, 500);
  }

  return c.json({
    data: data?.map((l) => ({
      id: l.id,
      guestName: l.guest_name,
      guestPhone: l.guest_phone,
      guestEmail: l.guest_email,
      boardingHouseId: l.boarding_house_id,
      status: l.status,
      message: l.message,
      createdAt: l.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

ownerRoutes.get("/bookings", async (c) => {
  const currentUser = c.get("user");
  const { boardingHouseId = "", status = "" } = c.req.query();

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError) {
    console.error("Error fetching owner rental buildings:", buildingsError);
    return c.json({ error: "Failed to fetch bookings" }, 500);
  }

  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0)
    return c.json({ data: [], pagination: { page: 1, limit: 0, total: 0 } });

  const scopedBuildingIds = boardingHouseId
    ? buildingIds.filter((id) => id === boardingHouseId)
    : buildingIds;
  if (boardingHouseId && scopedBuildingIds.length === 0) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  let query = c
    .get("supabase")
    .from("rental_bookings")
    .select(
      `
      id,
      room_id,
      booking_mode,
      status,
      desired_move_in,
      message,
      expires_at,
      created_at,
      updated_at,
      rental_rooms!inner(id, code, title, building_id)
    `,
    )
    .in("rental_rooms.building_id", scopedBuildingIds)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching owner bookings:", error);
    return c.json({ error: "Failed to fetch bookings" }, 500);
  }

  return c.json({
    data: (data ?? []).map((booking: any) => ({
      id: booking.id,
      boardingHouseId: booking.rental_rooms?.building_id,
      roomId: booking.room_id,
      roomName: booking.rental_rooms?.title ?? booking.rental_rooms?.code,
      guestName: "Tenant",
      guestPhone: "",
      message: booking.message,
      desiredMoveIn: booking.desired_move_in,
      status: booking.status,
      expiresAt: booking.expires_at,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    })),
  });
});

ownerRoutes.get("/conversations", async (c) => {
  const currentUser = c.get("user");
  const { boardingHouseId = "" } = c.req.query();

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError)
    return c.json({ error: "Failed to fetch conversations" }, 500);
  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0) return c.json({ data: [] });

  const scopedBuildingIds = boardingHouseId
    ? buildingIds.filter((id) => id === boardingHouseId)
    : buildingIds;
  if (boardingHouseId && scopedBuildingIds.length === 0)
    return c.json({ error: "Boarding house not found or access denied" }, 404);

  const { data, error } = await c
    .get("supabase")
    .from("rental_conversations")
    .select(
      "id,lead_id,booking_id,room_id,topic,created_at,updated_at,rental_rooms!inner(building_id,title,code)",
    )
    .in("rental_rooms.building_id", scopedBuildingIds)
    .order("updated_at", { ascending: false });

  if (error) return c.json({ error: "Failed to fetch conversations" }, 500);
  return c.json({
    data: (data ?? []).map((item: any) => ({
      id: item.id,
      boardingHouseId: item.rental_rooms?.building_id,
      roomId: item.room_id,
      leadId: item.lead_id,
      bookingId: item.booking_id,
      guestName: "Guest",
      guestPhone: "",
      topic: item.topic ?? item.rental_rooms?.title ?? item.rental_rooms?.code,
      status: "OPEN",
      lastMessage: "",
      updatedAt: item.updated_at,
      createdAt: item.created_at,
    })),
  });
});

ownerRoutes.get("/conversations/:id/messages", async (c) => {
  const currentUser = c.get("user");
  const conversationId = c.req.param("id");

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError) return c.json({ error: "Failed to fetch messages" }, 500);
  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0)
    return c.json({ error: "Conversation not found" }, 404);

  const { data: conversation, error: conversationError } = await c
    .get("supabase")
    .from("rental_conversations")
    .select("id,rental_rooms!inner(building_id)")
    .eq("id", conversationId)
    .in("rental_rooms.building_id", buildingIds)
    .single();

  if (conversationError || !conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const { data, error } = await c
    .get("supabase")
    .from("rental_messages")
    .select("id,conversation_id,sender_user_id,body,sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });

  if (error) return c.json({ error: "Failed to fetch messages" }, 500);
  return c.json({
    data: (data ?? []).map((item: any) => ({
      id: item.id,
      conversationId: item.conversation_id,
      senderRole: item.sender_user_id ? "OWNER" : "GUEST",
      senderName: item.sender_user_id ? "Owner" : "Guest",
      body: item.body,
      createdAt: item.sent_at,
    })),
  });
});

ownerRoutes.post("/conversations/:id/messages", async (c) => {
  const currentUser = c.get("user");
  const conversationId = c.req.param("id");
  const parsed = messageSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success)
    return c.json(
      { error: "Invalid message", details: parsed.error.issues },
      400,
    );

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError) return c.json({ error: "Failed to send message" }, 500);
  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0)
    return c.json({ error: "Conversation not found" }, 404);

  const { data: conversation, error: conversationError } = await c
    .get("supabase")
    .from("rental_conversations")
    .select("id,rental_rooms!inner(building_id)")
    .eq("id", conversationId)
    .in("rental_rooms.building_id", buildingIds)
    .single();

  if (conversationError || !conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const { data, error } = await c
    .get("supabase")
    .from("rental_messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: currentUser.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error || !data) return c.json({ error: "Failed to send message" }, 500);
  return c.json(
    {
      data: {
        id: data.id,
        conversationId: data.conversation_id,
        senderRole: "OWNER",
        senderName: currentUser.email ?? "Owner",
        body: data.body,
        createdAt: data.sent_at,
      },
    },
    201,
  );
});

ownerRoutes.post("/bookings/:id/confirm", async (c) => {
  const currentUser = c.get("user");
  const bookingId = c.req.param("id");

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError)
    return c.json({ error: "Failed to confirm booking" }, 500);
  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0)
    return c.json({ error: "Booking not found or cannot be confirmed" }, 404);

  const { data: bookingScope, error: bookingScopeError } = await c
    .get("supabase")
    .from("rental_bookings")
    .select("id,rental_rooms!inner(building_id)")
    .eq("id", bookingId)
    .in("rental_rooms.building_id", buildingIds)
    .single();

  if (bookingScopeError || !bookingScope) {
    return c.json({ error: "Booking not found or access denied" }, 404);
  }

  const { data, error } = await c
    .get("supabase")
    .from("rental_bookings")
    .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .in("status", ["PENDING", "HOLD"])
    .select()
    .single();

  if (error || !data)
    return c.json({ error: "Booking not found or cannot be confirmed" }, 404);
  return c.json({ data });
});

ownerRoutes.post("/bookings/:id/reject", async (c) => {
  const currentUser = c.get("user");
  const bookingId = c.req.param("id");

  const { data: buildings, error: buildingsError } = await c
    .get("supabase")
    .from("rental_buildings")
    .select("id")
    .eq("owner_id", currentUser.id);

  if (buildingsError) return c.json({ error: "Failed to reject booking" }, 500);
  const buildingIds = (buildings ?? []).map((building) => building.id);
  if (buildingIds.length === 0)
    return c.json({ error: "Booking not found or cannot be rejected" }, 404);

  const { data: bookingScope, error: bookingScopeError } = await c
    .get("supabase")
    .from("rental_bookings")
    .select("id,rental_rooms!inner(building_id)")
    .eq("id", bookingId)
    .in("rental_rooms.building_id", buildingIds)
    .single();

  if (bookingScopeError || !bookingScope) {
    return c.json({ error: "Booking not found or access denied" }, 404);
  }

  const { data, error } = await c
    .get("supabase")
    .from("rental_bookings")
    .update({ status: "REJECTED", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .in("status", ["PENDING", "HOLD"])
    .select()
    .single();

  if (error || !data)
    return c.json({ error: "Booking not found or cannot be rejected" }, 404);
  return c.json({ data });
});

ownerRoutes.get("/notifications", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("rental_notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: "Failed to fetch notifications" }, 500);
  const rows = (data ?? []).map((item: any) => ({
    id: item.id,
    eventType: item.event_type,
    title: item.payload?.title ?? item.event_type,
    body: item.payload?.body ?? "",
    readAt: item.read_at,
    createdAt: item.created_at,
  }));

  return c.json({
    data: rows,
    unreadCount: rows.filter((item) => !item.readAt).length,
  });
});

ownerRoutes.get("/audit-logs", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("rental_audit_logs")
    .select("*")
    .eq("actor_user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return c.json({ error: "Failed to fetch audit logs" }, 500);
  return c.json({
    data: (data ?? []).map((item: any) => ({
      id: String(item.id),
      actor: currentUser.email ?? currentUser.id,
      action: item.action,
      resourceType: item.resource_type,
      resourceId: item.resource_id,
      createdAt: item.created_at,
    })),
  });
});

ownerRoutes.get("/settings", async (c) => {
  const user = c.get("user");

  const { data, error } = await c
    .get("supabase")
    .from("system_settings")
    .select("*");
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/settings", async (c) => {
  const user = c.get("user");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.settings || !Array.isArray(body.settings)) {
    return c.json({ error: "Invalid settings format" }, 400);
  }

  const upsertData = body.settings.map((s: any) => ({
    key: s.key,
    value: s.value,
    type: s.type,
    category: s.category,
  }));

  const { error } = await c
    .get("supabase")
    .from("system_settings")
    .upsert(upsertData, { onConflict: "user_id, key" });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

export default ownerRoutes;
