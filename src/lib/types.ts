export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'financing'
export type StockMovementType = 'in' | 'out' | 'adjustment'
export type UserRole = 'admin' | 'seller'

export const ALL_TABS = ['dashboard', 'pdv', 'estoque', 'vendedores', 'relatorios'] as const
export type TabKey = (typeof ALL_TABS)[number]

export const TAB_LABELS: Record<TabKey, string> = {
  dashboard: 'Dashboard',
  pdv: 'PDV / Caixa',
  estoque: 'Estoque',
  vendedores: 'Vendedores',
  relatorios: 'Relatórios',
}

export interface AppUser {
  id: string
  username: string
  name: string
  role: UserRole
  phone?: string
  email?: string
  active: boolean
  allowedTabs: TabKey[]
}

export interface Product {
  id: string
  name: string
  category: string
  sku: string
  price: number
  cost: number
  quantity: number
  minQuantity: number
  color?: string
  size?: string
  model?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface SaleItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  sellerId: string
  sellerName: string
  paymentMethod: PaymentMethod
  subtotal: number
  discount: number
  total: number
  createdAt: string
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  type: StockMovementType
  quantity: number
  reason: string
  createdAt: string
}
