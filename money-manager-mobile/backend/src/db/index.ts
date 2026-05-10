// Lightweight in-memory DB layer for MVP BE (persistes during runtime)
// Real Postgres adapter is available under money-manager-mobile/backend/src/db/real.ts
// When DATABASE_URL is provided, we will route all DB operations to Postgres.
const USE_REAL_DB = !!process.env.DATABASE_URL
let _realDbInitialized = false

async function _ensureRealDb() {
  if (USE_REAL_DB && !_realDbInitialized) {
    const mod = await import('./real.js')
    if (mod?.initRealDb) mod.initRealDb()
    _realDbInitialized = true
  }
}

type User = {
  id: string
  email: string
  name?: string
  phone?: string
  avatarUrl?: string
  role?: string
  status?: string
  authProvider?: string
  emailVerifiedAt?: string
  isProfileCompleted?: boolean
  onboardingStep?: string
  lastLoginAt?: string
  passwordHash?: string
  createdAt?: string
  updatedAt?: string
}

type SocialAccount = {
  id: string
  userId: string
  provider: string
  providerUserId: string
  providerEmail?: string
  providerEmailVerified?: boolean
  providerName?: string
  providerAvatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

type UserProfile = {
  id: string
  userId: string
  fullName?: string
  phone?: string
  provinceCode?: string
  provinceName?: string
  districtCode?: string
  districtName?: string
  addressLine?: string
  fullAddress?: string
  phoneVerifiedAt?: string
  verificationStatus?: string
  createdAt?: string
  updatedAt?: string
}

export let users: User[] = []
export let socialAccounts: SocialAccount[] = []
export let userProfiles: UserProfile[] = []

export function resetDB() {
  users = []
  socialAccounts = []
  userProfiles = []
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    try {
      const mod = await import('./real.js')
      const res = await (mod as any).query(
        `SELECT id, email, password_hash, full_name, phone, avatar_url, role, is_active, created_at, updated_at, auth_provider, email_verified_at, is_profile_completed, onboarding_step, last_login_at
         FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      )
      const row = res?.rows?.[0]
      if (!row) return null
      return {
        id: row.id,
        email: row.email,
        name: row.full_name ?? undefined,
        avatarUrl: row.avatar_url ?? undefined,
        role: row.role ?? 'OWNER',
        status: row.is_active ? 'active' : 'inactive',
        authProvider: row.auth_provider ?? 'local',
        emailVerifiedAt: row.email_verified_at ?? undefined,
        isProfileCompleted: row.is_profile_completed ?? false,
        onboardingStep: row.onboarding_step ?? 'COMPLETE_PROFILE',
        lastLoginAt: row.last_login_at ?? undefined,
        passwordHash: row.password_hash ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      }
    } catch {
      // Fallback to memory on error
    }
  }
  const e = email.toLowerCase().trim()
  const u = users.find((u) => u.email.toLowerCase() === e)
  return u ?? null
}

export async function findUserById(id: string): Promise<User | null> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    try {
      const mod = await import('./real.js')
      const res = await (mod as any).query(
        `SELECT id, email, password_hash, full_name, phone, avatar_url, role, is_active, created_at, updated_at, auth_provider, email_verified_at, is_profile_completed, onboarding_step, last_login_at
         FROM users WHERE id = $1 LIMIT 1`,
        [id]
      )
      const row = res?.rows?.[0]
      if (!row) return null
      return {
        id: row.id,
        email: row.email,
        name: row.full_name ?? undefined,
        avatarUrl: row.avatar_url ?? undefined,
        role: row.role ?? 'OWNER',
        status: row.is_active ? 'active' : 'inactive',
        authProvider: row.auth_provider ?? 'local',
        emailVerifiedAt: row.email_verified_at ?? undefined,
        isProfileCompleted: row.is_profile_completed ?? false,
        onboardingStep: row.onboarding_step ?? 'COMPLETE_PROFILE',
        lastLoginAt: row.last_login_at ?? undefined,
        passwordHash: row.password_hash ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      }
    } catch {
      // Fall back to memory
    }
  }
  const u = users.find((u) => u.id === id)
  return u ?? null
}

export async function createUser(payload: Partial<User>): Promise<User> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    const email = (payload.email ?? '').toLowerCase().trim()
    const fullName = payload.name ?? (payload as any)['fullName'] ?? (payload as any)['full_name'] ?? ''
    const avatarUrl = payload.avatarUrl ?? (payload as any)['avatar_url'] ?? ''
    const role = (payload.role ?? 'OWNER') as string
    const status = (payload.status ?? 'active') as string
    const authProvider = (payload.authProvider ?? (payload as any)['auth_provider'] ?? 'local') as string
    const emailVerifiedAt = payload.emailVerifiedAt ?? null
    const isProfileCompleted = payload.isProfileCompleted ?? false
    const onboardingStep = payload.onboardingStep ?? 'COMPLETE_PROFILE'
    const lastLoginAt = payload.lastLoginAt ?? null
    const passwordHash = payload.passwordHash ?? undefined
    const mod = await import('./real.js')
    const res = await (mod as any).query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_active, avatar_url, auth_provider, email_verified_at, is_profile_completed, onboarding_step, last_login_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(), NOW()) RETURNING *`,
      [email, passwordHash, fullName, payload.phone ?? null, role, status === 'active', avatarUrl, authProvider, emailVerifiedAt, isProfileCompleted, onboardingStep, lastLoginAt]
    )
      ;
    const row = res?.rows?.[0]
    if (!row) throw new Error('Failed to create user')
    return {
      id: row.id,
      email: row.email,
      name: row.full_name ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      role: row.role ?? 'OWNER',
      status: row.is_active ? 'active' : 'inactive',
      authProvider: row.auth_provider ?? 'local',
      emailVerifiedAt: row.email_verified_at ?? undefined,
      isProfileCompleted: row.is_profile_completed ?? false,
      onboardingStep: row.onboarding_step ?? 'COMPLETE_PROFILE',
      lastLoginAt: row.last_login_at ?? undefined,
      passwordHash: row.password_hash ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    } as User
  }
  const id = payload.id ?? require('crypto').randomUUID()
  const user: User = {
    id,
    email: (payload.email ?? '').toLowerCase().trim(),
    name: payload.name ?? (payload as any)['fullName'],
    avatarUrl: payload.avatarUrl ?? (payload as any)['avatar_url'],
    role: payload.role ?? 'OWNER',
    status: payload.status ?? 'active',
    authProvider: payload.authProvider ?? (payload as any)['auth_provider'] ?? 'local',
    emailVerifiedAt: payload.emailVerifiedAt ?? null,
    isProfileCompleted: payload.isProfileCompleted ?? false,
    onboardingStep: payload.onboardingStep ?? 'COMPLETE_PROFILE',
    lastLoginAt: payload.lastLoginAt ?? null,
    passwordHash: payload.passwordHash ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any
  users.push(user)
  return user
}

export async function updateUser(user: User): Promise<void> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    const mappingEmail = user.email ?? ''
    const mod = await import('./real.js')
    await (mod as any).query(
      `UPDATE users
       SET email = $1, password_hash = $2, full_name = $3, phone = $4, role = $5, is_active = $6, avatar_url = $7, auth_provider = $8, email_verified_at = $9, is_profile_completed = $10, onboarding_step = $11, last_login_at = $12, updated_at = NOW()
       WHERE id = $13`,
      [mappingEmail, user.passwordHash, user.name ?? null, /* phone */ null, user.role, user.status === 'active', user.avatarUrl ?? null, user.authProvider ?? 'local', user.emailVerifiedAt ?? null, user.isProfileCompleted ?? false, user.onboardingStep ?? null, user.lastLoginAt ?? null, user.id]
    )
    return
  }
  const idx = users.findIndex((u) => u.id === user.id)
  if (idx >= 0) {
    user.updatedAt = new Date().toISOString()
    users[idx] = user
  }
}

export async function findSocialAccountByProviderUserId(provider: string, providerUserId: string): Promise<SocialAccount | null> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    try {
      const mod = await import('./real.js')
      const res = await (mod as any).query(
        `SELECT id, user_id, provider, provider_user_id, provider_email, provider_email_verified, provider_name, provider_avatar_url, created_at, updated_at
         FROM social_accounts WHERE provider = $1 AND provider_user_id = $2 LIMIT 1`,
        [provider, providerUserId]
      )
      const row = res?.rows?.[0]
      if (!row) return null
      return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        providerUserId: row.provider_user_id,
        providerEmail: row.provider_email ?? undefined,
        providerEmailVerified: row.provider_email_verified ?? false,
        providerName: row.provider_name ?? undefined,
        providerAvatarUrl: row.provider_avatar_url ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      }
    } catch {
      // fallback to memory
    }
  }
  const s = socialAccounts.find((sa) => sa.provider === provider && sa.providerUserId === providerUserId)
  return s ?? null
}

export async function createSocialAccount(payload: Partial<SocialAccount>): Promise<SocialAccount> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    const mod = await import('./real.js')
    const res = await (mod as any).query(
      `INSERT INTO social_accounts (user_id, provider, provider_user_id, provider_email, provider_email_verified, provider_name, provider_avatar_url, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), NOW()) RETURNING *`,
      [payload.userId, payload.provider ?? 'google', payload.providerUserId, payload.providerEmail ?? '', payload.providerEmailVerified ?? false, payload.providerName ?? '', payload.providerAvatarUrl ?? '']
    )
    const row = res?.rows?.[0]
    if (!row) throw new Error('Failed to create social account')
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerUserId: row.provider_user_id,
      providerEmail: row.provider_email ?? undefined,
      providerEmailVerified: row.provider_email_verified ?? false,
      providerName: row.provider_name ?? undefined,
      providerAvatarUrl: row.provider_avatar_url ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    }
  }
  const acc: SocialAccount = {
    id: payload.id ?? require('crypto').randomUUID(),
    userId: payload.userId!,
    provider: payload.provider ?? 'google',
    providerUserId: payload.providerUserId!,
    providerEmail: payload.providerEmail ?? '',
    providerEmailVerified: payload.providerEmailVerified ?? false,
    providerName: payload.providerName ?? '',
    providerAvatarUrl: payload.providerAvatarUrl ?? '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  socialAccounts.push(acc)
  return acc
}

export async function findProfileByUserId(userId: string): Promise<UserProfile | null> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    try {
      const mod = await import('./real.js')
      const res = await (mod as any).query(
        `SELECT id, user_id, full_name, phone, province_code, province_name, district_code, district_name, address_line, full_address, phone_verified_at, verification_status, created_at, updated_at
         FROM user_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      )
      const row = res?.rows?.[0]
      if (!row) return null
      return {
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name ?? undefined,
        phone: row.phone ?? undefined,
        provinceCode: row.province_code ?? undefined,
        provinceName: row.province_name ?? undefined,
        districtCode: row.district_code ?? undefined,
        districtName: row.district_name ?? undefined,
        addressLine: row.address_line ?? undefined,
        fullAddress: row.full_address ?? undefined,
        phoneVerifiedAt: row.phone_verified_at ?? undefined,
        verificationStatus: row.verification_status ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      }
    } catch {
      // fallback to memory
    }
  }
  const p = userProfiles.find((up) => up.userId === userId)
  return p ?? null
}

export async function upsertUserProfile(profile: Partial<UserProfile> & { userId: string }): Promise<UserProfile> {
  if (USE_REAL_DB) {
    await _ensureRealDb()
    const userId = profile.userId
    // Try to update existing profile
    const mod = await import('./real.js')
    const existing = await (mod as any).query(
      `SELECT id FROM user_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    const now = new Date().toISOString()
    if (existing?.rows?.length) {
      const res = await (mod as any).query(
        `UPDATE user_profiles
         SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone), province_code = COALESCE($4, province_code), province_name = COALESCE($5, province_name), district_code = COALESCE($6, district_code), district_name = COALESCE($7, district_name), address_line = COALESCE($8, address_line), full_address = COALESCE($9, full_address), phone_verified_at = COALESCE($10, phone_verified_at), verification_status = COALESCE($11, verification_status), updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, profile.fullName, profile.phone, profile.provinceCode, profile.provinceName, profile.districtCode, profile.districtName, profile.addressLine, profile.fullAddress, profile.phoneVerifiedAt, profile.verificationStatus]
      )
      const row = res?.rows?.[0]
      if (row) {
        return {
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name ?? undefined,
          phone: row.phone ?? undefined,
          provinceCode: row.province_code ?? undefined,
          provinceName: row.province_name ?? undefined,
          districtCode: row.district_code ?? undefined,
          districtName: row.district_name ?? undefined,
          addressLine: row.address_line ?? undefined,
          fullAddress: row.full_address ?? undefined,
          phoneVerifiedAt: row.phone_verified_at ?? undefined,
          verificationStatus: row.verification_status ?? undefined,
          createdAt: row.created_at ?? undefined,
          updatedAt: row.updated_at ?? undefined,
        }
      }
    }
    // If not updated above, fall back to insert
  }
  const existingIdx = userProfiles.findIndex((p) => p.userId === profile.userId)
  const now = new Date().toISOString()
  const row: UserProfile = {
    id: profile.id ?? require('crypto').randomUUID(),
    userId: profile.userId,
    fullName: profile.fullName,
    phone: profile.phone,
    provinceCode: profile.provinceCode,
    provinceName: profile.provinceName,
    districtCode: profile.districtCode,
    districtName: profile.districtName,
    addressLine: profile.addressLine,
    fullAddress: profile.fullAddress ?? [profile.addressLine, profile.districtName, profile.provinceName].filter(Boolean).join(' '),
    phoneVerifiedAt: profile.phoneVerifiedAt ?? undefined,
    verificationStatus: profile.verificationStatus ?? 'PENDING',
    createdAt: profile.createdAt ?? now,
    updatedAt: now
  }
  if (existingIdx >= 0) {
    userProfiles[existingIdx] = row
  } else {
    userProfiles.push(row)
  }
  return row
}

export async function ensureSeedData() {
  if (users.length === 0) {
    const u = await createUser({ email: 'owner@example.com', name: 'Seed Owner', role: 'OWNER', passwordHash: 'seed' })
    await upsertUserProfile({ userId: u.id, fullName: 'Seed Owner', phone: '', provinceCode: '', provinceName: '', districtCode: '', districtName: '', addressLine: '' })
  }
  return true
}
