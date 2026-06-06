/**
 * lib/roles.ts
 *
 * Central registry for system role lookups.
 *
 * Rules:
 *  - NEVER hardcode UUIDs in business logic — always look up by `name`.
 *  - Results are cached in-process for the lifetime of the worker to avoid
 *    repeated round-trips for every request.
 *  - Cache can be invalidated explicitly (e.g. after a migration or seed).
 */

import { supabaseAdmin } from "./supabase.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SystemRoleName =
  | "OWNER"
  | "OWNER_BASIC"
  | "OWNER_PREMIUM"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "USER"
  | (string & {}); // allow arbitrary role names without losing autocomplete

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  max_boarding_houses: number | null;
  max_rooms_per_house: number | null;
};

// ── In-process cache ───────────────────────────────────────────────────────────

/** name → RoleRow */
const _cache = new Map<string, RoleRow>();
let _fullyLoaded = false;

/**
 * Fetch ALL roles once and warm the cache.
 * Subsequent calls are instant (no DB round-trip).
 */
async function warmCache(): Promise<void> {
  if (_fullyLoaded) return;

  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id, name, description, max_boarding_houses, max_rooms_per_house");

  if (error) {
    console.error("[roles] Failed to warm cache:", error.message);
    return;
  }

  for (const row of data ?? []) {
    _cache.set(row.name, row as RoleRow);
  }
  _fullyLoaded = true;
}

/** Clear the cache — call this after any migration or role update. */
export function invalidateRoleCache(): void {
  _cache.clear();
  _fullyLoaded = false;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Look up a role by name.  Returns `null` if the role doesn't exist.
 *
 * @example
 *   const role = await getRoleByName("OWNER_BASIC");
 *   const roleId = role?.id;
 */
export async function getRoleByName(name: SystemRoleName): Promise<RoleRow | null> {
  if (_cache.has(name)) return _cache.get(name)!;

  // Warm the entire cache on first miss (one query, not N).
  await warmCache();

  return _cache.get(name) ?? null;
}

/**
 * Look up the `id` of a role by name.
 * Throws if the role is not found — forces the caller to handle the missing
 * config case explicitly rather than silently storing `undefined`.
 */
export async function getRoleId(name: SystemRoleName): Promise<string> {
  const role = await getRoleByName(name);
  if (!role) {
    throw new Error(
      `[roles] System role "${name}" not found in the database. ` +
      `Run the seed script or check the roles table.`
    );
  }
  return role.id;
}

/**
 * Determine whether a `role.name` belongs to the premium tier.
 * Convention: any role whose name contains "PREMIUM" is treated as premium.
 * This avoids coupling to a specific role name string.
 */
export function isRolePremium(roleName: string | null | undefined): boolean {
  return typeof roleName === "string" && roleName.toUpperCase().includes("PREMIUM");
}

/**
 * Resolve plan limits from a RoleRow.
 * NULL in DB = unlimited (Infinity).
 */
export function limitsFromRole(role: Pick<RoleRow, "max_boarding_houses" | "max_rooms_per_house"> | null) {
  return {
    maxBoardingHouses: role?.max_boarding_houses ?? Infinity,
    maxRoomsPerHouse:  role?.max_rooms_per_house  ?? Infinity,
  };
}

/**
 * Look up a role name by its ID.
 * Returns `null` if the role is not found.
 */
export async function getRoleNameById(roleId: string | null | undefined): Promise<string | null> {
  if (!roleId) return null;
  await warmCache();
  for (const role of _cache.values()) {
    if (role.id === roleId) return role.name;
  }
  return null;
}

/**
 * Check if a role ID belongs to a premium tier.
 */
export async function isRoleIdPremium(roleId: string | null | undefined): Promise<boolean> {
  const name = await getRoleNameById(roleId);
  return isRolePremium(name);
}

/** Ensure the roles cache is warmed. */
export async function warmRoleCache(): Promise<void> {
  await warmCache();
}

/** Synchronous version of isRoleIdPremium — requires warmRoleCache() to be called beforehand. */
export function isRoleIdPremiumSync(roleId: string | null | undefined): boolean {
  if (!roleId) return false;
  for (const role of _cache.values()) {
    if (role.id === roleId) {
      return isRolePremium(role.name);
    }
  }
  return false;
}
