import { buildUrl } from '../src/utils/apiClient'
import { API_URL } from '../src/lib/api'

describe('API URL mapping', () => {
  test('buildUrl prefixes with API_URL for a relative path', () => {
    const url = buildUrl('/owner/boarding-houses')
    expect(url).toBe(`${API_URL}/owner/boarding-houses`)
  })
})
