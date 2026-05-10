import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import googleAuthRoutes from '../src/routes/googleAuthRoutes'
import { googleAuthController } from '../src/controllers/googleAuthController'
import { mockDb, resetMockDb } from '../src/controllers/authController'
import * as goSvc from '../src/services/googleAuthService'

describe('BE Google Social Auth flow (integration)', () => {
  const app = express()
  app.use(express.json())
  googleAuthRoutes(app)

  beforeAll(() => {
    resetMockDb()
  })

  afterAll(() => {
    resetMockDb()
  })

  it('google login for new user -> complete profile', async () => {
    const payload = {
      sub: 'google_sub_new',
      email: 'newuser@example.com',
      email_verified: true,
      name: 'New User',
      picture: 'https://avatar',
    }
    vi.spyOn(goSvc, 'verifyGoogleIdToken').mockResolvedValue(payload as any)
    const res = await request(app).post('/auth/google').send({ idToken: 'token-xyz', platform: 'web' })
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.body).toHaveProperty('nextStep')
    expect(res.body.nextStep).toMatch(/COMPLETE_PROFILE|DASHBOARD/)
  })

  it('google login for existing user with complete profile -> DASHBOARD', async () => {
    // setup existing user with complete profile
    const user = {
      id: 'existing-user-1',
      email: 'existing@example.com',
      name: 'Existing User',
      avatar_url: '',
      role: 'OWNER',
      status: 'active',
      auth_provider: 'google',
      email_verified_at: new Date(),
      is_profile_completed: true,
      onboarding_step: 'DONE',
      last_login_at: new Date(),
    }
    mockDb.users.push(user)
    mockDb.social_accounts.push({
      id: 'social-1', user_id: user.id, provider: 'google', provider_user_id: 'sub-existing', provider_email: user.email, provider_email_verified: true, provider_name: user.name, provider_avatar_url: '', created_at: new Date(), updated_at: new Date()
    })
    const payload = { sub: 'sub-existing', email: user.email, email_verified: true, name: user.name, picture: '' }
    vi.spyOn(goSvc, 'verifyGoogleIdToken').mockResolvedValue(payload as any)
    const res = await request(app).post('/auth/google').send({ idToken: 'token-existing', platform: 'web' })
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.body).toHaveProperty('nextStep')
    expect(res.body.nextStep).toBe('DASHBOARD')
  })

  it('google login for existing user without profile -> COMPLETE_PROFILE', async () => {
    const user = {
      id: 'existing-user-2', email: 'noprofile@example.com', name: 'No Profile', avatar_url: '', role:'OWNER', status:'active', auth_provider:'google', email_verified_at: new Date(), is_profile_completed: false, onboarding_step: 'COMPLETE_PROFILE', last_login_at: new Date()
    }
    mockDb.users.push(user)
    mockDb.social_accounts.push({ id: 'social-2', user_id: user.id, provider:'google', provider_user_id:'sub-noprofile', provider_email: user.email, provider_email_verified: true, provider_name: user.name, provider_avatar_url: '', created_at: new Date(), updated_at: new Date() })
    const payload = { sub: 'sub-noprofile', email: user.email, email_verified: true, name: user.name, picture: '' }
    vi.spyOn(goSvc, 'verifyGoogleIdToken').mockResolvedValue(payload as any)
    const res = await request(app).post('/auth/google').send({ idToken: 'token-noprofile', platform: 'web' })
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.body.nextStep).toBe('COMPLETE_PROFILE')
  })
})
