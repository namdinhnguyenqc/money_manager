import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CANONICAL_HOST = 'tcareproduction.vercel.app'
const ADMIN_PORTAL_HOST = 'tcareproduction.vercel.app'
const PREVIEW_HOST_PREFIXES = [
  'trocare-production-',
  'tcare-production-',
  'tcare.production-',
  'tcareproduction-',
]

const shouldRedirectToCanonicalHost = (host: string) => {
  if (!host.endsWith('.vercel.app')) return false
  if (host === CANONICAL_HOST) return false
  return PREVIEW_HOST_PREFIXES.some(prefix => host.startsWith(prefix))
}

const privateRoutes = [
  '/admin',
  '/super-admin',
  '/owner',
  '/facilities',
  '/contracts',
  '/invoices',
  '/deposits',
  '/payments',
  '/rooms',
  '/settings',
  '/complete-profile',
]

const isPrivateRoute = (pathname: string) => privateRoutes.some(path => pathname === path || pathname.startsWith(`${path}/`))

const withNoStore = (response: NextResponse) => {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('Surrogate-Control', 'no-store')
  return response
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host')?.split(':')[0] || ''

  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && host !== ADMIN_PORTAL_HOST) {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.host = ADMIN_PORTAL_HOST
    return NextResponse.redirect(url, 308)
  }

  if (shouldRedirectToCanonicalHost(host)) {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.host = CANONICAL_HOST
    return NextResponse.redirect(url, 308)
  }

  if (isPrivateRoute(pathname)) {
    return withNoStore(NextResponse.next())
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
