import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { evaluateRBACGuard } from '@/utils/rbacGuard'

const CANONICAL_HOST = 'trocare-production.vercel.app'

const getLoginRoute = (pathname: string) => {
  if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) return '/login/admin'
  if (pathname.startsWith('/owner') || pathname.startsWith('/facilities') || pathname.startsWith('/contracts') || pathname.startsWith('/invoices') || pathname.startsWith('/payments') || pathname.startsWith('/settings')) return '/login/owner'
  return '/login'
}

const shouldRedirectToCanonicalHost = (host: string) => {
  if (!host.endsWith('.vercel.app')) return false
  if (host === CANONICAL_HOST) return false
  return host.startsWith('trocare-production-')
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host')?.split(':')[0] || ''

  if (shouldRedirectToCanonicalHost(host)) {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.host = CANONICAL_HOST
    return NextResponse.redirect(url, 308)
  }

  const token = req.cookies.get('accessToken')?.value

  // GLOBAL BYPASS FOR OWNER TESTING: If token exists, let them into owner routes
  const ownerRoutes = ['/owner', '/facilities', '/contracts', '/invoices', '/payments', '/settings', '/complete-profile']
  if (token && ownerRoutes.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
