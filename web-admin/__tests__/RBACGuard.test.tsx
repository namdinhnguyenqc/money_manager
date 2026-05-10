import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import RBACGuard from '../src/components/RBACGuard'
import { evaluateRBACGuard } from '../src/utils/rbacGuard'

describe('RBACGuard', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('renders children when role is allowed', async () => {
    window.localStorage.setItem('userRole', 'OWNER')
    const { getByTestId } = render(
      <RBACGuard allowedRoles={["OWNER"]}>
        <div data-testid="child">child</div>
      </RBACGuard>
    )
    await waitFor(() => {
      expect(getByTestId('child')).toBeInTheDocument()
    })
  })

  it('rejects roles that are not allowed', () => {
    const decision = evaluateRBACGuard({ token: 'tok', role: 'ADMIN' })
    expect(decision.ok).toBe(false)
    expect(decision.redirectTo).toBe('/not-authorized')
  })
})
