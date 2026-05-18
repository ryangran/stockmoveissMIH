import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Diamond, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate({ to: '/' })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate({ to: '/' })
    } catch (err: any) {
      setError(err.message ?? 'Erro ao entrar')
      console.error('[login error]', err)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'oklch(0.12 0.014 74)', border: '1px solid oklch(0.18 0.018 74)',
    borderRadius: 9, color: 'oklch(0.93 0.015 74)',
    fontSize: 14, fontFamily: 'Syne', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'oklch(0.07 0.010 74)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(ellipse at 30% 40%, oklch(0.72 0.130 73 / 0.06) 0%, transparent 60%)',
    }}>
      <div style={{ width: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.62 0.130 68))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px oklch(0.72 0.130 73 / 0.4)',
          }}>
            <Diamond size={24} style={{ color: 'oklch(0.07 0.010 74)' }} strokeWidth={2.5} />
          </div>
          <p className="font-display" style={{ fontSize: 26, fontWeight: 600, color: 'oklch(0.72 0.130 73)', letterSpacing: '0.04em' }}>
            STOCKMÓVEIS
          </p>
          <p style={{ fontSize: 12, color: 'oklch(0.55 0.020 74)', letterSpacing: '0.12em', marginTop: 4, fontWeight: 600 }}>
            GESTÃO COMERCIAL
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'oklch(0.10 0.012 74)',
            border: '1px solid oklch(0.18 0.018 74)',
            borderRadius: 16, padding: '32px',
            boxShadow: '0 24px 64px oklch(0 0 0 / 0.4)',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Entrar</p>
          <p style={{ fontSize: 13, color: 'oklch(0.55 0.020 74)', marginBottom: 24 }}>
            Acesse o painel com suas credenciais
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(0.55 0.020 74)', display: 'block', marginBottom: 6 }}>
                USUÁRIO
              </label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                style={inp} placeholder="seu.usuario" autoComplete="username"
                onFocus={e => (e.target.style.borderColor = 'oklch(0.72 0.130 73)')}
                onBlur={e => (e.target.style.borderColor = 'oklch(0.18 0.018 74)')}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'oklch(0.55 0.020 74)', display: 'block', marginBottom: 6 }}>
                SENHA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...inp, paddingRight: 42 }} placeholder="••••••"
                  autoComplete="current-password"
                  onFocus={e => (e.target.style.borderColor = 'oklch(0.72 0.130 73)')}
                  onBlur={e => (e.target.style.borderColor = 'oklch(0.18 0.018 74)')}
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'oklch(0.55 0.020 74)', display: 'flex' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'oklch(0.60 0.20 25 / 0.12)', border: '1px solid oklch(0.60 0.20 25 / 0.35)', borderRadius: 8, fontSize: 13, color: 'oklch(0.72 0.20 25)' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', marginTop: 22, padding: '13px',
              background: loading ? 'oklch(0.55 0.09 73)' : 'linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))',
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              color: 'oklch(0.07 0.010 74)', fontWeight: 800, fontSize: 14, fontFamily: 'Syne',
              letterSpacing: '0.04em',
              boxShadow: loading ? 'none' : '0 4px 16px oklch(0.72 0.130 73 / 0.4)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
