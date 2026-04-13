// Simple password-based admin auth using a hashed env var.
// For production, swap for Supabase Auth or NextAuth.

export function checkAdminPassword(password: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD
  if (!adminPass) return false
  return password === adminPass
}

export function getAdminCookie(cookies: { get: (name: string) => { value: string } | undefined }): boolean {
  const token = cookies.get('rice_admin')?.value
  return token === process.env.ADMIN_PASSWORD
}
