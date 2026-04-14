'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'

type State = 'loading' | 'joining' | 'success' | 'already' | 'error' | 'unauthenticated'

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const token  = params.token as string

  const [state,         setState]         = useState<State>('loading')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceId,   setWorkspaceId]   = useState('')
  const [errorMsg,      setErrorMsg]      = useState('')

  useEffect(() => {
    const session = getClientSession()
    if (!session?.user) {
      setState('unauthenticated')
      return
    }
    join()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function join() {
    setState('joining')
    const res = await fetch(`/api/join/${token}`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(data.error || `Erro ${res.status}`)
      setState('error')
      return
    }

    setWorkspaceId(data.workspace_id)
    setWorkspaceName(data.workspace_name ?? 'workspace')

    if (data.already_member) { setState('already') }
    else                     { setState('success') }
  }

  if (state === 'loading' || state === 'joining') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">{state === 'joining' ? 'Entrando no workspace…' : 'Verificando convite…'}</p>
        </div>
      </div>
    )
  }

  if (state === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
        <div className="bg-brand-mid border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <h1 className="text-lg font-bold text-white">Você precisa estar logado</h1>
          <p className="text-slate-400 text-sm">
            Faça login para aceitar o convite e entrar no workspace.
          </p>
          <button
            onClick={() => router.push(`/login?next=/join/${token}`)}
            className="w-full px-5 py-2.5 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
          >
            Fazer login
          </button>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
        <div className="bg-brand-mid border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto text-2xl">❌</div>
          <h1 className="text-lg font-bold text-white">Link inválido</h1>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Ir ao dashboard
          </button>
        </div>
      </div>
    )
  }

  // success or already
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-900/30 flex items-center justify-center mx-auto text-2xl">
          {state === 'already' ? '👋' : '✅'}
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            {state === 'already' ? 'Você já é membro!' : 'Bem-vindo ao workspace!'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {state === 'already'
              ? `Você já faz parte de "${workspaceName}".`
              : `Você entrou em "${workspaceName}" com sucesso.`}
          </p>
        </div>
        <button
          onClick={() => router.push(`/workspace/${workspaceId}`)}
          className="w-full px-5 py-2.5 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
        >
          Abrir workspace →
        </button>
      </div>
    </div>
  )
}
