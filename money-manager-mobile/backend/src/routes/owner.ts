import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireOwner } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const ownerRoutes = new Hono<AppEnv>();

ownerRoutes.use("*", requireAuth, requireOwner);

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
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
  isPublic: z.boolean().default(false),
});

const updateRoomSchema = roomSchema.partial();

ownerRoutes.get("/boarding-houses", async (c) => {
  const currentUser = c.get("user");
  const { page = "1", limit = "20", status = "" } = c.req.query();

  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-bh-1", name: "Mock Boarding House", address: "123 Main St", status: "ACTIVE", isPublic: true, ownerId: currentUser.id, createdAt: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
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

  if (env.IS_MOCK) {
    return c.json({
      id: bhId,
      name: "Mock Boarding House",
      address: "123 Main St",
      description: "Mock description",
      latitude: 10.8231,
      longitude: 106.6297,
      status: "ACTIVE",
      isPublic: true,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
    });
  }

  const { data, error } = await supabaseAdmin
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
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const { name, address, description, latitude, longitude, status, isPublic } = validation.data;

  if (env.IS_MOCK) {
    return c.json({
      id: "mock-bh-new",
      name,
      address,
      description,
      latitude,
      longitude,
      status,
      isPublic,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
    }, 201);
  }

  const { data: bh, error } = await supabaseAdmin
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

  if (error) {
    console.error("Error creating boarding house:", error);
    return c.json({ error: "Failed to create boarding house" }, 500);
  }

  return c.json({
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
  }, 201);
});

ownerRoutes.patch("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const validation = updateBoardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const existing = await supabaseAdmin
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

  if (env.IS_MOCK) {
    return c.json({
      id: bhId,
      ...updateData,
      ownerId: currentUser.id,
    });
  }

  const { data, error } = await supabaseAdmin
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

  const existing = await supabaseAdmin
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  if (env.IS_MOCK) {
    return c.json({ success: true });
  }

  const { error } = await supabaseAdmin
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

  const bhCheck = await supabaseAdmin
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-room-1", name: "Room 101", boardingHouseId: bhId, price: 1500000, status: "AVAILABLE", isPublic: true, createdAt: new Date().toISOString() },
      ],
    });
  }

  let query = supabaseAdmin
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

  const bhCheck = await supabaseAdmin
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const validation = roomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const { name, price, status, isPublic } = validation.data;

  if (env.IS_MOCK) {
    return c.json({
      id: "mock-room-new",
      name,
      boardingHouseId: bhId,
      price,
      status,
      isPublic,
      createdAt: new Date().toISOString(),
    }, 201);
  }

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      name,
      boarding_house_id: bhId,
      price,
      status,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }

  return c.json({
    id: room.id,
    name: room.name,
    boardingHouseId: room.boarding_house_id,
    price: room.price,
    status: room.status,
    isPublic: room.is_public,
    createdAt: room.created_at,
  }, 201);
});

ownerRoutes.patch("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");
  const parsed = await c.req.json();

  const roomCheck = await supabaseAdmin
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await supabaseAdmin
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  const validation = updateRoomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.isPublic !== undefined) {
    updateData.is_public = validation.data.isPublic;
    delete updateData.isPublic;
  }
  updateData.updated_at = new Date().toISOString();

  if (env.IS_MOCK) {
    return c.json({
      id: roomId,
      ...updateData,
      boardingHouseId: roomCheck.data.boarding_house_id,
    });
  }

  const { data, error } = await supabaseAdmin
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

  const roomCheck = await supabaseAdmin
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await supabaseAdmin
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  if (env.IS_MOCK) {
    return c.json({ success: true });
  }

  const { error } = await supabaseAdmin
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
  const { page = "1", limit = "20", status = "" } = c.req.query();

  const { data: boardingHouses } = await supabaseAdmin
    .from("boarding_houses")
    .select("id")
    .eq("owner_id", currentUser.id);

  const bhIds = boardingHouses?.map((bh) => bh.id) || [];

  if (bhIds.length === 0) {
    return c.json({ data: [], pagination: { page: 1, limit: 20, total: 0 } });
  }

  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-lead-1", guestName: "Nguyễn Văn A", guestPhone: "0912345678", guestEmail: "a@example.com", boardingHouseId: bhIds[0], status: "NEW", message: "Tôi quan tâm phòng 101", createdAt: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
    .from("leads")
    .select("*", { count: "exact" })
    .in("boarding_house_id", bhIds);

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

export default ownerRoutes;