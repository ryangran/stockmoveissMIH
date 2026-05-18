import { supabase } from './supabase'
import type {
  Product, Sale, SaleItem, StockMovement,
  AppUser, UserRole, TabKey, PaymentMethod,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function mapProduct(r: any): Product {
  return {
    id: r.id, name: r.name, category: r.category, sku: r.sku,
    price: Number(r.price), cost: Number(r.cost),
    quantity: r.quantity, minQuantity: r.min_quantity,
    color: r.color ?? undefined, size: r.size ?? undefined, model: r.model ?? undefined,
  }
}

function mapSaleItem(r: any): SaleItem {
  return {
    productId: r.product_id, productName: r.product_name, sku: r.sku,
    quantity: r.quantity, unitPrice: Number(r.unit_price), subtotal: Number(r.subtotal),
  }
}

function mapSale(r: any): Sale {
  return {
    id: r.id,
    items: (r.sale_items ?? []).map(mapSaleItem),
    sellerId: r.seller_id, sellerName: r.seller_name,
    paymentMethod: r.payment_method as PaymentMethod,
    subtotal: Number(r.subtotal), discount: Number(r.discount), total: Number(r.total),
    createdAt: r.created_at,
  }
}

function mapUser(r: any): AppUser {
  return {
    id: r.id, username: r.username, name: r.name,
    role: r.role as UserRole,
    phone: r.phone ?? undefined, email: r.email ?? undefined,
    active: r.active,
    allowedTabs: (r.allowed_tabs ?? ['dashboard', 'pdv']) as TabKey[],
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function authenticateUser(username: string, password: string): Promise<AppUser | null> {
  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', hash)
    .eq('active', true)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`Supabase: ${error.message} (${error.code})`)
  return data ? mapUser(data) : null
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('users').select('*').order('name')
  if (error) throw error
  return (data ?? []).map(mapUser)
}

export async function createUser(u: {
  username: string; password: string; name: string; role: UserRole
  phone?: string; email?: string; allowedTabs: TabKey[]
}): Promise<AppUser> {
  const hash = await hashPassword(u.password)
  const { data, error } = await supabase.from('users').insert({
    username: u.username, password_hash: hash, name: u.name, role: u.role,
    phone: u.phone || null, email: u.email || null,
    active: true, allowed_tabs: u.allowedTabs,
  }).select().single()
  if (error) throw error
  return mapUser(data)
}

export async function updateUser(id: string, changes: {
  name?: string; phone?: string; email?: string
  active?: boolean; allowedTabs?: TabKey[]; password?: string
}): Promise<void> {
  const update: any = {}
  if (changes.name !== undefined)       update.name = changes.name
  if (changes.phone !== undefined)      update.phone = changes.phone || null
  if (changes.email !== undefined)      update.email = changes.email || null
  if (changes.active !== undefined)     update.active = changes.active
  if (changes.allowedTabs !== undefined) update.allowed_tabs = changes.allowedTabs
  if (changes.password)                 update.password_hash = await hashPassword(changes.password)
  const { error } = await supabase.from('users').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) throw error
  return (data ?? []).map(mapProduct)
}

export async function addProduct(p: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase.from('products').insert({
    name: p.name, category: p.category, sku: p.sku,
    price: p.price, cost: p.cost, quantity: p.quantity,
    min_quantity: p.minQuantity, color: p.color || null,
    size: p.size || null, model: p.model || null,
  }).select().single()
  if (error) throw error
  return mapProduct(data)
}

export async function updateProduct(id: string, changes: Partial<Product>): Promise<void> {
  const u: any = {}
  if (changes.name !== undefined)        u.name = changes.name
  if (changes.category !== undefined)    u.category = changes.category
  if (changes.sku !== undefined)         u.sku = changes.sku
  if (changes.price !== undefined)       u.price = changes.price
  if (changes.cost !== undefined)        u.cost = changes.cost
  if (changes.quantity !== undefined)    u.quantity = changes.quantity
  if (changes.minQuantity !== undefined) u.min_quantity = changes.minQuantity
  if (changes.color !== undefined)       u.color = changes.color || null
  if (changes.size !== undefined)        u.size = changes.size || null
  if (changes.model !== undefined)       u.model = changes.model || null
  const { error } = await supabase.from('products').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function getSales(limit?: number): Promise<Sale[]> {
  let q = supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapSale)
}

export async function getSalesToday(): Promise<Sale[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('sales').select('*, sale_items(*)')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapSale)
}

export async function getSalesThisMonth(): Promise<Sale[]> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data, error } = await supabase
    .from('sales').select('*, sale_items(*)')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapSale)
}

export async function getLast7DaysRevenue(): Promise<{ date: string; total: number }[]> {
  const results: { date: string; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    const { data } = await supabase
      .from('sales').select('total')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
    const total = (data ?? []).reduce((s: number, v: any) => s + Number(v.total), 0)
    results.push({ date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }), total })
  }
  return results
}

export async function getLowStockProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*')
  if (error) throw error
  return (data ?? []).map(mapProduct).filter((p: Product) => p.quantity <= p.minQuantity)
}

export async function getSellerRanking(users: AppUser[]): Promise<{ user: AppUser; total: number; count: number }[]> {
  const sellers = users.filter(u => u.role === 'seller' && u.active)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data } = await supabase
    .from('sales').select('seller_id, total')
    .gte('created_at', start.toISOString())
  const salesData = data ?? []
  return sellers.map(user => {
    const mine = salesData.filter((s: any) => s.seller_id === user.id)
    return {
      user,
      total: mine.reduce((s: number, v: any) => s + Number(v.total), 0),
      count: mine.length,
    }
  }).sort((a, b) => b.total - a.total)
}

export async function addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<void> {
  const { data: saleData, error: e1 } = await supabase.from('sales').insert({
    seller_id: sale.sellerId, seller_name: sale.sellerName,
    payment_method: sale.paymentMethod,
    subtotal: sale.subtotal, discount: sale.discount, total: sale.total,
  }).select().single()
  if (e1) throw e1

  const { error: e2 } = await supabase.from('sale_items').insert(
    sale.items.map(item => ({
      sale_id: saleData.id,
      product_id: item.productId, product_name: item.productName, sku: item.sku,
      quantity: item.quantity, unit_price: item.unitPrice, subtotal: item.subtotal,
    }))
  )
  if (e2) throw e2

  for (const item of sale.items) {
    const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.productId).single()
    if (prod) {
      await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.quantity) }).eq('id', item.productId)
      await supabase.from('stock_movements').insert({
        product_id: item.productId, product_name: item.productName,
        type: 'out', quantity: item.quantity,
        reason: `Venda #${saleData.id.slice(-6).toUpperCase()}`,
      })
    }
  }
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function addStockEntry(productId: string, quantity: number, reason: string): Promise<void> {
  const { data: prod } = await supabase.from('products').select('quantity, name').eq('id', productId).single()
  if (!prod) return
  await supabase.from('products').update({ quantity: prod.quantity + quantity }).eq('id', productId)
  await supabase.from('stock_movements').insert({
    product_id: productId, product_name: prod.name,
    type: 'in', quantity, reason,
  })
}
