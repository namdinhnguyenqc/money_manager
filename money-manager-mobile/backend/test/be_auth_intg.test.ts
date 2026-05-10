import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { resetMockDb } from '../src/controllers/authController'
import registerAuthRoutes from '../src/routes/authRoutes'

describe('BE Auth API Integration (Register/Login/Me)', () => {
  const app = express()
  app.use(express.json())
  registerAuthRoutes(app)

  beforeAll(() => {
    // initialize mock db with a base user for login if needed
  })

  afterAll(() => {
    resetMockDb()
  })

  it('registers a new user with valid data', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'tea@example.com', password: 'Password1', full_name: 'Tea Tester', phone: '0123456789' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('email', 'tea@example.com')
    expect(res.body).toHaveProperty('full_name')
  })

  it('fails register with missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ email: '', password: '' })
    expect(res.status).toBe(400)
  })

  it('fails register with invalid email', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'bademail', password: 'Password1' })
    expect(res.status).toBe(400)
  })

  it('fails register with short password', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'valid@example.com', password: 'abc' })
    expect(res.status).toBe(400)
  })

  it('login with valid credentials returns a token', async () => {
    // Ensure a user exists to login
    await request(app).post('/auth/register').send({ email: 'loginme@example.com', password: 'Secret123', full_name: 'Login Me' })
    const res = await request(app).post('/auth/login').send({ email: 'loginme@example.com', password: 'Secret123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('me endpoint requires auth and returns profile when JWT provided', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email: 'loginme@example.com', password: 'Secret123' })
    const token = loginRes.body?.token
    expect(token).toBeDefined()
    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body).toHaveProperty('id')
    expect(meRes.body).toHaveProperty('email')
    expect(meRes.body).toHaveProperty('full_name')
  })

  it('me endpoint returns 401 with invalid token', async () => {
    const res = await request(app).get('/me').set('Authorization', `Bearer invalidtoken`)
    expect(res.status).toBe(401)
  })

  it('me endpoint returns 401 when no token provided', async () => {
    const res = await request(app).get('/me')
    expect(res.status).toBe(401)
  })
})
