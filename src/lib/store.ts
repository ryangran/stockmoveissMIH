import type { Product, Sale, StockMovement, PaymentMethod } from './types'

interface Seller { id: string; name: string; phone: string; email: string; active: boolean }

const KEYS = {
  products: 'smv_products_v2',
  sales: 'smv_sales_v2',
  sellers: 'smv_sellers_v2',
  movements: 'smv_movements_v2',
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Products ─────────────────────────────────────────────────────────────────

export function getProducts(): Product[] {
  return read<Product[]>(KEYS.products) ?? []
}

export function saveProducts(products: Product[]): void {
  write(KEYS.products, products)
}

export function addProduct(p: Omit<Product, 'id'>): Product {
  const product = { ...p, id: genId() }
  const list = getProducts()
  list.push(product)
  saveProducts(list)
  return product
}

export function updateProduct(id: string, changes: Partial<Product>): void {
  const list = getProducts().map((p) => (p.id === id ? { ...p, ...changes } : p))
  saveProducts(list)
}

export function deleteProduct(id: string): void {
  saveProducts(getProducts().filter((p) => p.id !== id))
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export function getSales(): Sale[] {
  return read<Sale[]>(KEYS.sales) ?? []
}

export function saveSales(sales: Sale[]): void {
  write(KEYS.sales, sales)
}

export function addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Sale {
  const newSale: Sale = { ...sale, id: genId(), createdAt: new Date().toISOString() }
  const list = getSales()
  list.push(newSale)
  saveSales(list)
  // deduct stock
  const products = getProducts()
  for (const item of newSale.items) {
    const product = products.find((p) => p.id === item.productId)
    if (product) {
      updateProduct(product.id, { quantity: Math.max(0, product.quantity - item.quantity) })
      addMovement({
        productId: product.id,
        productName: product.name,
        type: 'out',
        quantity: item.quantity,
        reason: `Venda #${newSale.id.slice(-6).toUpperCase()}`,
      })
    }
  }
  return newSale
}

// ── Sellers ───────────────────────────────────────────────────────────────────

export function getSellers(): Seller[] {
  return read<Seller[]>(KEYS.sellers) ?? []
}

export function saveSellers(sellers: Seller[]): void {
  write(KEYS.sellers, sellers)
}

export function addSeller(s: Omit<Seller, 'id'>): Seller {
  const seller = { ...s, id: genId() }
  const list = getSellers()
  list.push(seller)
  saveSellers(list)
  return seller
}

export function updateSeller(id: string, changes: Partial<Seller>): void {
  saveSellers(getSellers().map((s) => (s.id === id ? { ...s, ...changes } : s)))
}

export function deleteSeller(id: string): void {
  saveSellers(getSellers().filter((s) => s.id !== id))
}

// ── Stock movements ───────────────────────────────────────────────────────────

export function getMovements(): StockMovement[] {
  return read<StockMovement[]>(KEYS.movements) ?? []
}

export function addMovement(m: Omit<StockMovement, 'id' | 'createdAt'>): StockMovement {
  const movement: StockMovement = { ...m, id: genId(), createdAt: new Date().toISOString() }
  const list = getMovements()
  list.push(movement)
  write(KEYS.movements, list)
  return movement
}

export function addStockEntry(productId: string, quantity: number, reason: string): void {
  const product = getProducts().find((p) => p.id === productId)
  if (!product) return
  updateProduct(productId, { quantity: product.quantity + quantity })
  addMovement({ productId, productName: product.name, type: 'in', quantity, reason })
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

export function getSalesToday(): Sale[] {
  const today = new Date().toDateString()
  return getSales().filter((s) => new Date(s.createdAt).toDateString() === today)
}

export function getSalesThisMonth(): Sale[] {
  const now = new Date()
  return getSales().filter((s) => {
    const d = new Date(s.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
}

export function getLast7DaysRevenue(): { date: string; total: number }[] {
  const sales = getSales()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toDateString()
    const total = sales
      .filter((s) => new Date(s.createdAt).toDateString() === dateStr)
      .reduce((sum, s) => sum + s.total, 0)
    return {
      date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      total,
    }
  })
}

export function getSellerRanking(): { seller: Seller; total: number; count: number }[] {
  const sales = getSalesThisMonth()
  const sellers = getSellers()
  return sellers
    .filter((s) => s.active)
    .map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id)
      return {
        seller,
        total: sellerSales.reduce((sum, s) => sum + s.total, 0),
        count: sellerSales.length,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function getLowStockProducts(): Product[] {
  return getProducts().filter((p) => p.quantity <= p.minQuantity)
}
