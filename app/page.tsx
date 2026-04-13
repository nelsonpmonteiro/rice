import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getUserFromToken } from '@/lib/auth'
import UserDashboard from './_components/UserDashboard'

export default async function HomePage() {
  const cookieStore = cookies()
  const token = cookieStore.get('rice_session')?.value

  if (!token) redirect('/login')

  const user = await getUserFromToken(token)
  if (!user) redirect('/login')

  return <UserDashboard user={user} />
}
