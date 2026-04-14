'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import type { WorkspaceMember } from '@/lib/supabase/client'

export default function MembersPanel({
  workspaceId,
  members,
  currentUserId,
  isAdmin,
  onRefresh,
}: {
  workspaceId: string
  members: WorkspaceMember[]
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [adding, setAdding] = useState(false)

  async function invite() {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    if (res.ok) {
      setEmail('')
      onRefresh()
    } else {
      setError((await res.json()).error)
    }
    setAdding(false)
  }

  async function changeRole(userId: string, role: 'admin' | 'member') {
    await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    onRefresh()
  }

  async function remove(userId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
    } else {
      onRefresh()
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Membros</h2>

      {/* Invite */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="E-mail do novo membro"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
            />
            <button
              onClick={invite}
              disabled={adding || !email.trim()}
              className="px-4 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              {adding ? '…' : 'Convidar'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {members.map(m => {
          const isSelf = m.user_id === currentUserId
          const name   = m.profiles?.name ?? 'Usuário'
          return (
            <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-brand-mid px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{name}</span>
                {isSelf && <span className="text-xs text-slate-600">(você)</span>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'admin' ? 'teal' : 'default'}>
                  {m.role === 'admin' ? 'Admin' : 'Membro'}
                </Badge>
                {isAdmin && !isSelf && (
                  <>
                    <button
                      onClick={() => changeRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                      className="text-xs text-slate-500 hover:text-brand-teal transition-colors"
                    >
                      {m.role === 'admin' ? 'Rebaixar' : 'Promover'}
                    </button>
                    <button
                      onClick={() => remove(m.user_id)}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
