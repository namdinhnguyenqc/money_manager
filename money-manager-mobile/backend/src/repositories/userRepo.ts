import { findUserByEmail, findUserById, createUser, updateUser } from '../db/index.js'

export async function repoFindUserByEmail(email: string) {
  return await findUserByEmail(email)
}

export async function repoFindUserById(id: string) {
  return await findUserById(id)
}

export async function repoCreateUser(payload: any) {
  return await createUser(payload)
}

export async function repoUpdateUser(user: any) {
  return await updateUser(user)
}
