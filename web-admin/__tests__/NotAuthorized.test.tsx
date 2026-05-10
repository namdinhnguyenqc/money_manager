import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import NotAuthorizedPage from '../src/app/not-authorized/page'

describe('Not Authorized Page', () => {
  it('renders Not Authorized message', () => {
    render(<NotAuthorizedPage />)
    expect(screen.getByText(/Không đủ quyền truy cập/i)).toBeInTheDocument()
  })
})
