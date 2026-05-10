import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import KPICard from '../src/components/KPICard'

describe('KPICard', () => {
  it('renders title and value', () => {
    render(<KPICard title="Total" value={123} />) // value is numeric
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText(/123/)).toBeInTheDocument()
  })

  it('renders suffix when provided', () => {
    render(<KPICard title="Rate" value={10} suffix="%" />)
    expect(screen.getByText('Rate')).toBeInTheDocument()
    expect(screen.getByText(/10%/)).toBeInTheDocument()
  })

  it('renders delta when provided', () => {
    render(<KPICard title="Delta" value={5} delta={1} />)
    expect(screen.getByText('Delta: 1')).toBeInTheDocument()
  })
})
