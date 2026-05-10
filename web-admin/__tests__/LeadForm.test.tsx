import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import LeadForm from '../src/components/LeadForm'

describe('LeadForm', () => {
  it('submits payload via onSubmit', () => {
    const onSubmit = vi.fn()
    render(<LeadForm onSubmit={onSubmit} />)
    const nameInput = screen.getByPlaceholderText('Họ tên') as HTMLInputElement
    const phoneInput = screen.getByPlaceholderText('Số điện thoại') as HTMLInputElement
    const messageInput = screen.getByPlaceholderText('Nội dung quan tâm') as HTMLTextAreaElement
    fireEvent.change(nameInput, { target: { value: 'Test Lead' } })
    fireEvent.change(phoneInput, { target: { value: '123456789' } })
    fireEvent.change(messageInput, { target: { value: 'Inquiry about BH 101' } })
    fireEvent.click(screen.getByText('Send Lead'))
    // Expect onSubmit to have been called with payload
    expect(onSubmit).toHaveBeenCalled()
    const arg = onSubmit.mock.calls[0][0]
    // Accept either guestName or name depending on prop; LeadForm uses guestName
    expect(arg).toHaveProperty('guestName', 'Test Lead')
    expect(arg).toHaveProperty('guestPhone', '123456789')
    expect(arg).toHaveProperty('message', 'Inquiry about BH 101')
  })
})
