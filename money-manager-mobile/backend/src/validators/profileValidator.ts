export type ValidationErrors = { [key: string]: string }

export function validateProfileInput(input: any): { valid: boolean; errors?: ValidationErrors } {
  const errors: ValidationErrors = {}
  if (!input) {
    return { valid: false, errors: { general: 'Invalid input' } }
  }
  // Minimal validation to satisfy MVP tests
  if (!input.fullName || typeof input.fullName !== 'string' || input.fullName.trim().length < 2) {
    errors.fullName = 'Full name is required'
  }
  if (!input.phone || typeof input.phone !== 'string' || input.phone.trim().length < 7) {
    errors.phone = 'Phone is required'
  }
  if (!input.provinceCode) errors.provinceCode = 'Province code required'
  if (!input.provinceName) errors.provinceName = 'Province name required'
  if (!input.districtCode) errors.districtCode = 'District code required'
  if (!input.districtName) errors.districtName = 'District name required'
  if (!input.addressLine || typeof input.addressLine !== 'string' || input.addressLine.trim().length < 5) {
    errors.addressLine = 'Address line required'
  }

  const isValid = Object.keys(errors).length === 0
  return { valid: isValid, errors: isValid ? undefined : errors }
}
