export type SocialAccount = {
  id: string
  userId: string
  provider: string
  providerUserId: string
  providerEmail?: string
  providerEmailVerified?: boolean
  providerName?: string
  providerAvatarUrl?: string
  createdAt?: string
  updatedAt?: string
}
