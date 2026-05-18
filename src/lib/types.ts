export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'financing'

export type StockMovementType = 'in' | 'out' | 'adjustment'

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

export interface Seller {
  id: string
  name: string
  phone: string
  email: string
  active: boolean
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
