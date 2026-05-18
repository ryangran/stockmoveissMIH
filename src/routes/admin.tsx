import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Plus, Shield, Edit2, Trash2, ToggleLeft, ToggleRight,
  X, Check, Key, User as UserIcon, TrendingUp, ShoppingBag, Award,
} from 'lucide-react'
import { getUsers, createUser, updateUser, deleteUser, getSalesThisMonth } from '../lib/db'
import { useAuth } from '../lib/auth'
import { ALL_TABS, TAB_LABELS, ALL_PERMISSIONS, PERMISSION_LABELS } from '../lib/types'
import type { AppUser, UserRole, TabKey, PermissionKey } from '../lib/types'

export const Route = createFileRoute('/admin')({
  component: AdminPanel,
})

const EMPTY_FORM = {
  username: '', password: '', name: '', role: 'seller' as UserRole,
  phone: '', email: '', allowedTabs: ['dashboard', 'pdv'] as TabKey[],
}

const inp = {
  width: '100%', padding: '9px 12px', background: 'oklch(0.13 0.014 74)',
  border: '1px solid oklch(0.18 0.018 74)', borderRadius: 8,
  color: 'oklch(0.93 0.015 74)', fontSize: 13, fontFamily: 'Syne', outline: 'none',
}

const GOLD = 'oklch(0.72 0.130 73)'
const GOLD_DIM = 'oklch(0.62 0.110 73)'
const COLORS = [
  'oklch(0.72 0.130 73)', 'oklch(0.65 0.150 55)', 'oklch(0.60 0.14 200)',
  'oklch(0.65 0.16 145)', 'oklch(0.62 0.18 310)', 'oklch(0.68 0.14 30)',
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'oklch(0.12 0.014 74)', border: '1px solid oklch(0.22 0.018 74)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color: GOLD }}>
        {mode === 'revenue' ? fmt(payload[0].value) : `${payload[0].value} vendas`}
      </p>
    </div>
  )
}

function AdminPanel() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  if (me && me.role !== 'admin') { navigate({ to: '/' }); return null }

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: salesMonth = [] } = useQuery({ queryKey: ['salesMonth'], queryFn: getSalesThisMonth })

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [showPwdModal, setShowPwdModal] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState('')

  const reload = () => qc.invalidateQueries({ queryKey: ['users'] })

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error('Informe o nome')
      if (!editingId && !form.username) throw new Error('Informe o usuário')
      if (!editingId && !form.password) throw new Error('Informe a senha')
      if (editingId) {
        await updateUser(editingId, {
          name: form.name, phone: form.phone, email: form.email,
          allowedTabs: form.role === 'admin' ? [...ALL_TABS] : form.allowedTabs,
        })
      } else {
        await createUser({
          username: form.username, password: form.password, name: form.name, role: form.role,
          phone: form.phone, email: form.email,
          allowedTabs: form.role === 'admin' ? [...ALL_TABS] : form.allowedTabs,
        })
      }
    },
    onSuccess: () => { reload(); setShowModal(false); toast.success(editingId ? 'Usuário atualizado' : 'Usuário criado') },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => {
      if (id === me?.id) throw new Error('Não é possível excluir o próprio usuário')
      return deleteUser(id)
    },
    onSuccess: () => { reload(); toast.success('Usuário excluído') },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleMut = useMutation({
    mutationFn: (u: AppUser) => updateUser(u.id, { active: !u.active }),
    onSuccess: reload,
  })

  const pwdMut = useMutation({
    mutationFn: async (id: string) => {
      if (!newPwd || newPwd.length < 4) throw new Error('Senha deve ter ao menos 4 caracteres')
      await updateUser(id, { password: newPwd })
    },
    onSuccess: () => { setShowPwdModal(null); setNewPwd(''); toast.success('Senha alterada') },
    onError: (e: any) => toast.error(e.message),
  })

  const tabMut = useMutation({
    mutationFn: ({ id, tabs }: { id: string; tabs: TabKey[] }) => updateUser(id, { allowedTabs: tabs }),
    onSuccess: reload,
  })

  const permMut = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: PermissionKey[] }) => updateUser(id, { permissions }),
    onSuccess: reload,
  })

  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setShowModal(true) }
  function openEdit(u: AppUser) {
    setEditingId(u.id)
    setForm({ username: u.username, password: '', name: u.name, role: u.role, phone: u.phone ?? '', email: u.email ?? '', allowedTabs: u.allowedTabs })
    setShowModal(true)
  }
  function toggleTab(u: AppUser, tab: TabKey) {
    const next = u.allowedTabs.includes(tab) ? u.allowedTabs.filter(t => t !== tab) : [...u.allowedTabs, tab]
    tabMut.mutate({ id: u.id, tabs: next })
    qc.setQueryData(['users'], (old: AppUser[] | undefined) =>
      (old ?? []).map(x => x.id === u.id ? { ...x, allowedTabs: next } : x)
    )
  }

  function togglePerm(u: AppUser, perm: PermissionKey) {
    const next = u.permissions.includes(perm) ? u.permissions.filter(p => p !== perm) : [...u.permissions, perm]
    permMut.mutate({ id: u.id, permissions: next })
    qc.setQueryData(['users'], (old: AppUser[] | undefined) =>
      (old ?? []).map(x => x.id === u.id ? { ...x, permissions: next } : x)
    )
  }

  if (isLoading) return <div style={{ padding: 40, color: 'var(--muted-foreground)' }}>Carregando...</div>

  const sellers = users.filter(u => u.role === 'seller')
  const admins = users.filter(u => u.role === 'admin')

  // Charts data
  const sellerStats = sellers.map((u, i) => {
    const mine = salesMonth.filter(s => s.sellerId === u.id)
    return {
      name: u.name.split(' ')[0],
      fullName: u.name,
      revenue: mine.reduce((s, v) => s + v.total, 0),
      count: mine.length,
      color: COLORS[i % COLORS.length],
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = sellerStats.reduce((s, v) => s + v.revenue, 0)
  const totalSales = sellerStats.reduce((s, v) => s + v.count, 0)
  const topSeller = sellerStats[0]

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'oklch(0.72 0.130 73 / 0.15)', border: '1px solid oklch(0.72 0.130 73 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>Painel Admin</h1>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 3 }}>
              {users.length} usuário(s) · {sellers.length} vendedor(es)
            </p>
          </div>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: 'linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))',
          border: 'none', borderRadius: 9, cursor: 'pointer',
          color: 'oklch(0.07 0.010 74)', fontWeight: 700, fontSize: 13, fontFamily: 'Syne',
          boxShadow: '0 4px 14px oklch(0.72 0.130 73 / 0.35)',
        }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* ── CHARTS SECTION ──────────────────────────────────────────── */}
      {sellers.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted-foreground)', marginBottom: 14 }}>
            DESEMPENHO DOS VENDEDORES — MÊS ATUAL
          </p>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { icon: <TrendingUp size={16} />, label: 'Faturamento total', value: fmt(totalRevenue) },
              { icon: <ShoppingBag size={16} />, label: 'Vendas realizadas', value: `${totalSales}` },
              { icon: <Award size={16} />, label: 'Top vendedor', value: topSeller?.fullName ?? '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'oklch(0.72 0.130 73 / 0.12)', border: '1px solid oklch(0.72 0.130 73 / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Revenue chart */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 16 }}>FATURAMENTO POR VENDEDOR (R$)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sellerStats} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.55 0.020 74)', fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.45 0.015 74)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={36} />
                  <Tooltip content={<CustomTooltip mode="revenue" />} cursor={{ fill: 'oklch(0.72 0.130 73 / 0.06)' }} />
                  <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                    {sellerStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sales count chart */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 16 }}>NÚMERO DE VENDAS POR VENDEDOR</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sellerStats} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.55 0.020 74)', fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.45 0.015 74)' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<CustomTooltip mode="count" />} cursor={{ fill: 'oklch(0.72 0.130 73 / 0.06)' }} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {sellerStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking table */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 14 }}>RANKING DETALHADO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sellerStats.map((s, i) => {
                const pct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0
                return (
                  <div key={s.fullName}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? GOLD : 'var(--muted-foreground)', width: 20, textAlign: 'center' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s.fullName}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{s.count} venda{s.count !== 1 ? 's' : ''}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{fmt(s.revenue)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
              {sellerStats.every(s => s.revenue === 0) && (
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center', padding: '8px 0' }}>Nenhuma venda registrada este mês.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section: Vendedores */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted-foreground)', marginBottom: 14 }}>VENDEDORES</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {sellers.length === 0 && (
          <div style={{ padding: '24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
            Nenhum vendedor cadastrado. Clique em "Novo Usuário" para começar.
          </div>
        )}
        {sellers.map(u => (
          <div key={u.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', opacity: u.active ? 1 : 0.55 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={16} style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}>@{u.username}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: u.active ? 'oklch(0.62 0.16 145 / 0.15)' : 'var(--surface-2)', color: u.active ? 'oklch(0.62 0.16 145)' : 'var(--muted-foreground)' }}>
                  {u.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowPwdModal(u.id)} title="Alterar senha" style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={13} />
                </button>
                <button onClick={() => openEdit(u)} style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={13} />
                </button>
                <button onClick={() => toggleMut.mutate(u)} title={u.active ? 'Desativar' : 'Ativar'} style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: u.active ? 'oklch(0.62 0.16 145)' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {u.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                </button>
                <button onClick={() => { if (confirm(`Excluir ${u.name}?`)) deleteMut.mutate(u.id) }} style={{ width: 30, height: 30, borderRadius: 7, background: 'oklch(0.60 0.20 25 / 0.12)', border: '1px solid oklch(0.60 0.20 25 / 0.25)', cursor: 'pointer', color: 'oklch(0.65 0.22 25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: 8 }}>ABAS VISÍVEIS</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ALL_TABS.map(tab => {
                  const allowed = u.allowedTabs.includes(tab)
                  return (
                    <button key={tab} onClick={() => toggleTab(u, tab)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: allowed ? '1px solid oklch(0.72 0.130 73 / 0.5)' : '1px solid var(--border)',
                      background: allowed ? 'oklch(0.72 0.130 73 / 0.12)' : 'transparent',
                      color: allowed ? GOLD : 'var(--muted-foreground)', transition: 'all 0.12s',
                    }}>
                      {allowed ? '✓ ' : ''}{TAB_LABELS[tab]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: 8 }}>PERMISSÕES DE AÇÃO</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ALL_PERMISSIONS.map(perm => {
                  const granted = u.permissions.includes(perm)
                  return (
                    <button key={perm} onClick={() => togglePerm(u, perm)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: granted ? '1px solid oklch(0.62 0.16 145 / 0.5)' : '1px solid var(--border)',
                      background: granted ? 'oklch(0.62 0.16 145 / 0.12)' : 'transparent',
                      color: granted ? 'oklch(0.62 0.16 145)' : 'var(--muted-foreground)', transition: 'all 0.12s',
                    }}>
                      {granted ? '✓ ' : ''}{PERMISSION_LABELS[perm]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section: Admins */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted-foreground)', marginBottom: 14 }}>ADMINISTRADORES</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {admins.map(u => (
          <div key={u.id} style={{ background: 'var(--card)', border: '1px solid oklch(0.72 0.130 73 / 0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'oklch(0.72 0.130 73 / 0.15)', border: '1px solid oklch(0.72 0.130 73 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={14} style={{ color: GOLD }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}>@{u.username}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.72 0.130 73 / 0.12)', color: GOLD }}>Admin</span>
            </div>
            {u.id !== me?.id && (
              <button onClick={() => setShowPwdModal(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12, fontFamily: 'Syne' }}>
                <Key size={12} /> Alterar senha
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--card)', border: '1px solid oklch(0.72 0.130 73 / 0.3)', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 24px 64px oklch(0 0 0 / 0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'name', label: 'NOME COMPLETO *', placeholder: 'João da Silva', type: 'text' },
                ...(!editingId ? [{ key: 'username', label: 'USUÁRIO *', placeholder: 'joao.silva', type: 'text' }] : []),
                ...(!editingId ? [{ key: 'password', label: 'SENHA *', placeholder: '••••••', type: 'password' }] : []),
                { key: 'phone', label: 'TELEFONE', placeholder: '(11) 99999-9999', type: 'text' },
                { key: 'email', label: 'E-MAIL', placeholder: 'email@loja.com', type: 'email' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inp} placeholder={placeholder}
                    onFocus={e => (e.target.style.borderColor = GOLD)}
                    onBlur={e => (e.target.style.borderColor = 'oklch(0.18 0.018 74)')} />
                </div>
              ))}
              {!editingId && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>PERFIL</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              )}
              {form.role === 'seller' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', display: 'block', marginBottom: 8 }}>ABAS VISÍVEIS</label>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {ALL_TABS.map(tab => {
                      const on = form.allowedTabs.includes(tab)
                      return (
                        <button type="button" key={tab} onClick={() => setForm(f => ({ ...f, allowedTabs: on ? f.allowedTabs.filter(t => t !== tab) : [...f.allowedTabs, tab] }))} style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: on ? '1px solid oklch(0.72 0.130 73 / 0.5)' : '1px solid var(--border)',
                          background: on ? 'oklch(0.72 0.130 73 / 0.12)' : 'transparent',
                          color: on ? GOLD : 'var(--muted-foreground)', transition: 'all 0.12s',
                        }}>
                          {on ? '✓ ' : ''}{TAB_LABELS[tab]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--foreground)', fontSize: 13, fontFamily: 'Syne', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} style={{ flex: 2, padding: 11, background: 'linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'oklch(0.07 0.010 74)', fontSize: 13, fontFamily: 'Syne', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Check size={14} /> {editingId ? 'Salvar' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showPwdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 360, boxShadow: '0 24px 64px oklch(0 0 0 / 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Alterar Senha</h2>
              <button onClick={() => { setShowPwdModal(null); setNewPwd('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 14 }}>
              {users.find(u => u.id === showPwdModal)?.name}
            </p>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted-foreground)', display: 'block', marginBottom: 6 }}>NOVA SENHA</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={inp} placeholder="Mínimo 4 caracteres"
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = 'oklch(0.18 0.018 74)')} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowPwdModal(null); setNewPwd('') }} style={{ flex: 1, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--foreground)', fontSize: 13, fontFamily: 'Syne', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => pwdMut.mutate(showPwdModal)} style={{ flex: 2, padding: 10, background: 'linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'oklch(0.07 0.010 74)', fontSize: 13, fontFamily: 'Syne', fontWeight: 700 }}>Salvar senha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
