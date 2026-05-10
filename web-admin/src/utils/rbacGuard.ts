// Server-side and client-side RBAC helper utilities to determine access decisions
export type RBACGuardQuery = {
  token?: string | null
  role?: string | null
  path?: string
}

export type RBACGuardDecision = {
  ok: boolean
  redirectTo?: string
}

// Basic decision logic: require token; require OWNER role for access to /owner/* pages
export function evaluateRBACGuard({ token, role }: RBACGuardQuery): RBACGuardDecision {
  if (!token) {
    return { ok: false, redirectTo: '/login/owner' }
  }
  if (role === 'OWNER' || role === 'SUPER_ADMIN') {
    return { ok: true }
  }
  // If role exists but is not allowed, redirect to not-authorized
  return { ok: false, redirectTo: '/not-authorized' }
}
