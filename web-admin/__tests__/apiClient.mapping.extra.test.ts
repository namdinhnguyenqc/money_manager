import { describe, it, expect } from 'vitest'
import { buildUrl } from '../src/utils/apiClient'
import { API_URL } from '../src/lib/api'

describe('API Client URL mapping - extra cases', () => {
  it('maps relative path with leading slash', () => {
    const url = buildUrl('/owner/boarding-houses')
    expect(url).toBe(`${API_URL}/owner/boarding-houses`)
  })

  it('maps relative path without leading slash', () => {
    const url = buildUrl('public/boarding-houses')
    expect(url).toBe(`${API_URL}/public/boarding-houses`)
  })

  it('passes through absolute URL unchanged', () => {
    const url = buildUrl('https://external.api/endpoint')
    expect(url).toBe('https://external.api/endpoint')
  })
})
