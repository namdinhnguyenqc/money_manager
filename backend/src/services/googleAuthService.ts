// Use global fetch (node >= 18). No additional dependency required.

export type GoogleTokenPayload = {
  sub: string
  email: string
  email_verified: string | boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  aud?: string
}

// Internal, with optional google-auth-library support for robust verification
let _GoogleClientCtor: any = null

function _getGoogleClientCtor(): any {
  if (_GoogleClientCtor) return _GoogleClientCtor
  try {
    // Lazy require to avoid hard dependency when not used in tests/environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lib = require('google-auth-library')
    _GoogleClientCtor = lib.OAuth2Client
  } catch {
    _GoogleClientCtor = null
  }
  return _GoogleClientCtor
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  if (!idToken) return null
  // Prefer using google-auth-library if available for verification
  const ClientCtor = _getGoogleClientCtor()
  if (ClientCtor) {
    try {
      const client = new ClientCtor(process.env.GOOGLE_CLIENT_ID)
      const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
      const payload = ticket.getPayload() as any
      if (payload?.sub && payload?.email) {
        return {
          sub: payload.sub,
          email: payload.email,
          email_verified: payload.email_verified ?? false,
          name: payload.name,
          given_name: payload.given_name,
          family_name: payload.family_name,
          picture: payload.picture,
          aud: payload.aud
        }
      }
    } catch {
      // fall back to legacy endpoint if verification with library fails
    }
  }

  // Fallback: use Google's token info endpoint
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.sub || !data.email) return null
    if (data.email_verified === 'true' || data.email_verified === true) {
      return {
        sub: data.sub,
        email: data.email,
        email_verified: data.email_verified,
        name: data.name,
        given_name: data.given_name,
        family_name: data.family_name,
        picture: data.picture,
        aud: data.aud
      }
    }
    return null
  } catch {
    return null
  }
}
