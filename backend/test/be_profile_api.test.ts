import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import registerAuthRoutes from '../src/routes/authRoutes'
import registerProfileRoutes from '../src/routes/profileRoutes'
import registerBusinessRoutes from '../src/routes/businessRoutes'

describe('BE Profile APIs & Guard', () => {
  const app = express()
  app.use(express.json())
  registerAuthRoutes(app)
  registerProfileRoutes(app)
  registerBusinessRoutes(app)

  beforeAll(() => {
    // setup base state via registration in tests
  })

  afterAll(() => {
    // cleanup
  })

  it('GET /me/profile returns current user + profile', async () => {
    await request(app).post('/auth/register').send({ email: 'profileapi@example.com', password: 'Password1', full_name: 'Profile API', phone: '0123456789' })
    const loginRes = await request(app).post('/auth/login').send({ email: 'profileapi@example.com', password: 'Password1' })
    const token = loginRes.body?.token
    const res = await request(app).get('/me/profile').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('user')
    expect(res.body).toHaveProperty('profile')
  })

  it('POST /me/profile/complete missing phone -> 400 VALIDATION_ERROR', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email: 'profileapi@example.com', password: 'Password1' })
    const token = loginRes.body?.token
    const res = await request(app).post('/me/profile/complete').set('Authorization', `Bearer ${token}`).send({ fullName: 'Profile API', provinceCode: 'P01', provinceName: 'Province', districtCode: 'D01', districtName: 'District', addressLine: '123 Street' })
    expect(res.status).toBe(400)
  })

  it('POST /me/profile/complete valid -> creates profile & marks complete', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email: 'profileapi@example.com', password: 'Password1' })
    const token = loginRes.body?.token
    const res = await request(app).post('/me/profile/complete').set('Authorization', `Bearer ${token}`).send({
      fullName: 'Profile API',
      phone: '0123456789',
      provinceCode: 'P01',
      provinceName: 'Province',
      districtCode: 'D01',
      districtName: 'District',
      addressLine: '123 Street'
    })
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.body).toHaveProperty('nextStep')
  })

  it('PUT /me/profile updates fields', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email: 'profileapi@example.com', password: 'Password1' })
    const token = loginRes.body?.token
    const res = await request(app).put('/me/profile').set('Authorization', `Bearer ${token}`).send({
      fullName: 'Profile API Updated',
      phone: '0987654321',
      provinceCode: 'P02',
      provinceName: 'New Province',
      districtCode: 'D02',
      districtName: 'New District',
      addressLine: '999 New Ave',
      avatarUrl: 'https://host/avatar.png'
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('profile')
  })

  it('PUT /me/profile with email should NOT change user email', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email: 'profileapi@example.com', password: 'Password1' })
    const token = loginRes.body?.token
    const res = await request(app).put('/me/profile').set('Authorization', `Bearer ${token}`).send({ email: 'hacker@gmail.com' })
    expect(res.status).toBe(200)
    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`)
    expect(meRes.body.email).toBe('profileapi@example.com')
  })
})
