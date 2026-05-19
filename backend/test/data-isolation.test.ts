import { beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import ownerRoutes, { resetMockOwnerState } from "../src/routes/owner.js";
import rentalRoutes from "../src/routes/rental.js";
import { requireCompletedProfile } from "../src/middleware/requireCompletedProfile.js";
import { resetMockDb } from "../src/mockDb.js";
import { generateAccessToken } from "../src/lib/auth.js";
import type { AppEnv } from "../src/types.js";

const buildApp = () => {
  const app = new Hono<AppEnv>();
  app.use("/owner/*", requireCompletedProfile);
  app.use("/rental/*", requireCompletedProfile);
  app.route("/owner", ownerRoutes);
  app.route("/rental", rentalRoutes);
  return app;
};

const createOwnerToken = (id: string, email: string) =>
  generateAccessToken({
    id,
    email,
    role: "OWNER",
    status: "ACTIVE",
    isProfileCompleted: true,
    onboardingStep: "DONE",
  });

const authHeaders = async (id: string, email: string) => ({
  Authorization: `Bearer ${await createOwnerToken(id, email)}`,
  "Content-Type": "application/json",
});

describe("mock mode data isolation", () => {
  beforeEach(() => {
    resetMockDb();
    resetMockOwnerState();
  });

  it("keeps owner rental data isolated per account", async () => {
    const app = buildApp();
    const ownerAHeaders = await authHeaders("owner-a", "owner-a@example.com");
    const ownerBHeaders = await authHeaders("owner-b", "owner-b@example.com");

    const createHouseRes = await app.request("/owner/boarding-houses", {
      method: "POST",
      headers: ownerAHeaders,
      body: JSON.stringify({
        name: "A Facility",
        address: "123 Isolation St",
        status: "ACTIVE",
        isPublic: false,
      }),
    });
    expect(createHouseRes.status).toBe(201);
    const createdHouse = await createHouseRes.json();

    const createRoomRes = await app.request(`/owner/boarding-houses/${createdHouse.id}/rooms`, {
      method: "POST",
      headers: ownerAHeaders,
      body: JSON.stringify({
        name: "A-101",
        price: 3200000,
        status: "AVAILABLE",
        isPublic: false,
      }),
    });
    expect(createRoomRes.status).toBe(201);
    const createdRoom = await createRoomRes.json();

    const createTenantRes = await app.request("/rental/tenants", {
      method: "POST",
      headers: ownerAHeaders,
      body: JSON.stringify({
        name: "Tenant A",
        phone: "0912345678",
        email: "tenant-a@example.com",
        idCard: "001234567890",
        address: "HCM",
      }),
    });
    expect(createTenantRes.status).toBe(201);
    const createdTenant = await createTenantRes.json();

    const createContractRes = await app.request("/rental/contracts", {
      method: "POST",
      headers: ownerAHeaders,
      body: JSON.stringify({
        roomId: Number(createdRoom.rentalRoomId),
        tenantId: Number(createdTenant.data.id),
        startDate: "2026-05-01",
        endDate: "2026-12-31",
        deposit: 3000000,
      }),
    });
    expect(createContractRes.status).toBe(201);
    const createdContract = await createContractRes.json();

    const ownerBBoardingHousesRes = await app.request("/owner/boarding-houses", {
      headers: ownerBHeaders,
    });
    expect(ownerBBoardingHousesRes.status).toBe(200);
    const ownerBBoardingHouses = await ownerBBoardingHousesRes.json();
    expect(ownerBBoardingHouses.data.some((item: any) => item.id === createdHouse.id)).toBe(false);

    const ownerBHouseRes = await app.request(`/owner/boarding-houses/${createdHouse.id}`, {
      headers: ownerBHeaders,
    });
    expect(ownerBHouseRes.status).toBe(404);

    const ownerBHouseRoomsRes = await app.request(`/owner/boarding-houses/${createdHouse.id}/rooms`, {
      headers: ownerBHeaders,
    });
    expect(ownerBHouseRoomsRes.status).toBe(404);

    const ownerBDeleteRes = await app.request(`/owner/boarding-houses/${createdHouse.id}`, {
      method: "DELETE",
      headers: ownerBHeaders,
    });
    expect(ownerBDeleteRes.status).toBe(404);

    const ownerBContractsRes = await app.request("/rental/contracts/active", {
      headers: ownerBHeaders,
    });
    expect(ownerBContractsRes.status).toBe(200);
    const ownerBContracts = await ownerBContractsRes.json();
    expect(ownerBContracts.data.some((item: any) => Number(item.id) === Number(createdContract.data.id))).toBe(false);

    const ownerBTenantsRes = await app.request("/rental/tenants", {
      headers: ownerBHeaders,
    });
    expect(ownerBTenantsRes.status).toBe(200);
    const ownerBTenants = await ownerBTenantsRes.json();
    expect(ownerBTenants.data.some((item: any) => Number(item.id) === Number(createdTenant.data.id))).toBe(false);
  });
});
