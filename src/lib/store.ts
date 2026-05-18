import type { Product, Sale, Seller, StockMovement, PaymentMethod } from './types'

const KEYS = {
  products: 'smv_products_v1',
  sales: 'smv_sales_v1',
  sellers: 'smv_sellers_v1',
  movements: 'smv_movements_v1',
  initialized: 'smv_initialized_v1',
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

// ── Seed ──────────────────────────────────────────────────────────────────────

function generateSampleSales(products: Product[], sellers: Seller[]): Sale[] {
  const paymentMethods: PaymentMethod[] = ['cash', 'pix', 'debit', 'credit', 'financing']
  const sales: Sale[] = []

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const numSales = Math.floor(Math.random() * 5) + 1
    for (let j = 0; j < numSales; j++) {
      const seller = sellers[Math.floor(Math.random() * sellers.length)]
      const numItems = Math.floor(Math.random() * 2) + 1
      const items = Array.from({ length: numItems }, () => {
        const product = products[Math.floor(Math.random() * products.length)]
        const qty = Math.floor(Math.random() * 2) + 1
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.price,
          subtotal: product.price * qty,
        }
      })
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
      const discount = Math.random() > 0.75 ? Math.round(subtotal * 0.05 * 100) / 100 : 0
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60))
      sales.push({
        id: genId(),
        items,
        sellerId: seller.id,
        sellerName: seller.name,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        subtotal,
        discount,
        total: subtotal - discount,
        createdAt: date.toISOString(),
      })
    }
  }
  return sales
}

export function initSampleData(): void {
  if (localStorage.getItem(KEYS.initialized)) return

  const products: Product[] = [
    { id: genId(), name: 'Sofá Retrátil 3 Lugares', category: 'Sofás', sku: 'SOF-001', price: 2890, cost: 1800, quantity: 5, minQuantity: 2, color: 'Cinza', model: 'Oslo' },
    { id: genId(), name: 'Sofá Canto 5 Lugares', category: 'Sofás', sku: 'SOF-002', price: 4200, cost: 2600, quantity: 2, minQuantity: 1, color: 'Bege', model: 'Corner Luxe' },
    { id: genId(), name: 'Mesa de Jantar 6 Cadeiras', category: 'Mesas', sku: 'MES-001', price: 3200, cost: 1950, quantity: 3, minQuantity: 1, color: 'Imbuia', model: 'Classic' },
    { id: genId(), name: 'Mesa de Jantar 4 Cadeiras', category: 'Mesas', sku: 'MES-002', price: 2100, cost: 1280, quantity: 4, minQuantity: 2, color: 'Branco', model: 'Minimal' },
    { id: genId(), name: 'Guarda-Roupa 6 Portas', category: 'Dormitório', sku: 'GRO-001', price: 2100, cost: 1300, quantity: 7, minQuantity: 2, color: 'Branco', model: 'Premium' },
    { id: genId(), name: 'Cama Box Casal Queen', category: 'Dormitório', sku: 'CAM-001', price: 1890, cost: 1100, quantity: 4, minQuantity: 2, model: 'Ortopédico Plus' },
    { id: genId(), name: 'Rack para TV 60"', category: 'Sala', sku: 'RAC-001', price: 890, cost: 520, quantity: 1, minQuantity: 2, color: 'Preto', model: 'Slim' },
    { id: genId(), name: 'Poltrona Decorativa', category: 'Sofás', sku: 'POL-001', price: 1290, cost: 780, quantity: 2, minQuantity: 1, color: 'Verde', model: 'Luxe' },
    { id: genId(), name: 'Estante Modular 5 Nichos', category: 'Sala', sku: 'EST-001', price: 760, cost: 450, quantity: 0, minQuantity: 2, color: 'Branco' },
    { id: genId(), name: 'Mesa de Centro Oval', category: 'Sala', sku: 'MEC-001', price: 680, cost: 380, quantity: 6, minQuantity: 2, color: 'Nogal' },
    { id: genId(), name: 'Criado-Mudo com Gaveta', category: 'Dormitório', sku: 'CRI-001', price: 320, cost: 185, quantity: 8, minQuantity: 3 },
    { id: genId(), name: 'Penteadeira com Espelho', category: 'Dormitório', sku: 'PEN-001', price: 1150, cost: 680, quantity: 1, minQuantity: 2, color: 'Branco' },
  ]

  const sellers: Seller[] = [
    { id: genId(), name: 'Carlos Mendonça', phone: '(11) 99876-5432', email: 'carlos@loja.com', active: true },
    { id: genId(), name: 'Ana Beatriz Lima', phone: '(11) 99765-4321', email: 'ana@loja.com', active: true },
    { id: genId(), name: 'Roberto Figueira', phone: '(11) 99654-3210', email: 'roberto@loja.com', active: true },
    { id: genId(), name: 'Juliana Costa', phone: '(11) 99543-2109', email: 'juliana@loja.com', active: true },
  ]

  const sales = generateSampleSales(products, sellers)

  saveProducts(products)
  saveSellers(sellers)
  saveSales(sales)
  write(KEYS.movements, [])
  localStorage.setItem(KEYS.initialized, '1')
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
