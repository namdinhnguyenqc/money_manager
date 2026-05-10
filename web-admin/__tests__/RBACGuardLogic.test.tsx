import { describe, it, expect } from 'vitest'
import { evaluateRBACGuard } from '../src/utils/rbacGuard'

describe('RBAC guard logic (evaluateRBACGuard)', () => {
  it('allows access when token present and role OWNER', () => {
    const res = evaluateRBACGuard({ token: 'tok', role: 'OWNER' })
    expect(res.ok).toBe(true)
  })

  it('redirects to login when no token', () => {
    const res = evaluateRBACGuard({ token: null, role: 'OWNER' })
    expect(res).toEqual({ ok: false, redirectTo: '/login/owner' })
  })

  it('redirects to not-authorized when non-owner with token', () => {
    const res = evaluateRBACGuard({ token: 'tok', role: 'ADMIN' })
    expect(res).toEqual({ ok: false, redirectTo: '/not-authorized' })
  })
})
