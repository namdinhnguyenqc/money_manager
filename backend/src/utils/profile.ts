import type { UserProfile } from '../models/userProfile.js'


export function isProfileCompleted(user: any, profile: any): boolean {
  if (!user) return false
  if (!user.is_profile_completed) return false
  // more checks can be added if needed
  return true
}

export function syncProfileCompletion(user: any, profile: Partial<UserProfile> | null) {
  const completed = !!profile && Object.keys(profile).length > 0
  user.is_profile_completed = completed
  user.onboarding_step = completed ? 'DONE' : 'COMPLETE_PROFILE'
  return { isProfileCompleted: completed, onboarding_step: user.onboarding_step }
}
