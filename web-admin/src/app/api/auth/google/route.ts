import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const adminEmailsList = (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter((e) => e)

function isAdminEmail(email?: string) {
  if (!email) return false
  if (adminEmailsList.length > 0) {
    return adminEmailsList.includes(email)
  }
  // Fallback: allow domain-based admin emails
  return email.endsWith('@yourdomain.com')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const idToken = body?.idToken
    if (!idToken) {
      return NextResponse.json({ message: 'Missing idToken' }, { status: 400 })
    }
    if (!clientId) {
      return NextResponse.json({ message: 'Google client ID not configured' }, { status: 500 })
    }
    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    const payload = ticket.getPayload()
    const email = payload?.email
    if (!email) {
      return NextResponse.json({ message: 'Invalid token payload' }, { status: 400 })
    }
    if (!isAdminEmail(email)) {
      return NextResponse.json({ message: 'Forbidden: admin access required' }, { status: 403 })
    }
    // Simple session token (to be swapped with real JWT)
    const cryptoModule = await import('crypto')
    const secret = process.env.NEXT_PUBLIC_JWT_SECRET || 'CHANGE_ME'
    const token = cryptoModule
      .createHash('sha256')
      .update(`${email}:${Date.now()}`)
      .update(secret)
      .digest('hex')
    return NextResponse.json({ accessToken: token }, { status: 200 })
  } catch (err) {
    console.error('Google login error', err)
    return NextResponse.json({ message: 'Google login failed' }, { status: 500 })
  }
}
