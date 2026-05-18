import React, { createContext, useContext, useState } from 'react'
import type { AppUser } from './types'
import { authenticateUser } from './db'

interface AuthCtx {
  user: AppUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} })

export function useAuth() {
  return useContext(AuthContext)
}

function loadSaved(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('smv_session_v2')
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(loadSaved)

  async function login(username: string, password: string) {
    const found = await authenticateUser(username, password)
    if (!found) throw new Error('Usuário ou senha incorretos')
    setUser(found)
    localStorage.setItem('smv_session_v2', JSON.stringify(found))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('smv_session_v2')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}
