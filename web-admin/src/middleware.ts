import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { evaluateRBACGuard } from '@/utils/rbacGuard'

const getLoginRoute = (pathname: string) => {
  if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) return '/login/admin'
  if (pathname.startsWith('/owner') || pathname.startsWith('/facilities') || pathname.startsWith('/contracts') || pathname.startsWith('/invoices') || pathname.startsWith('/payments') || pathname.startsWith('/settings')) return '/login/owner'
  return '/login'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('accessToken')?.value

  // GLOBAL BYPASS FOR OWNER TESTING: If token exists, let them into owner routes
  const ownerRoutes = ['/owner', '/facilities', '/contracts', '/invoices', '/payments', '/settings', '/complete-profile']
  if (token && ownerRoutes.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/owner/:path*', '/owner', '/facilities/:path*', '/facilities', '/contracts/:path*', '/contracts', '/invoices/:path*', '/invoices', '/payments/:path*', '/payments', '/settings/:path*', '/settings', '/admin/:path*', '/admin', '/super-admin/:path*', '/super-admin'],
}
