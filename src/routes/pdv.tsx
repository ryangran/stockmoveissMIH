import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X, Tag } from "lucide-react";
import { getProducts, getSellers, addSale } from "../lib/store";
import type { CartItem, PaymentMethod } from "../lib/types";

export const Route = createFileRoute("/pdv")({
  component: PDV,
});

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: "pix", label: "PIX", icon: "◈" },
  { key: "cash", label: "Dinheiro", icon: "◎" },
  { key: "debit", label: "Débito", icon: "▣" },
  { key: "credit", label: "Crédito", icon: "◆" },
  { key: "financing", label: "Financiamento", icon: "◇" },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PDV() {
  const [allProducts] = useState(() => getProducts());
  const [sellers] = useState(() => getSellers().filter((s) => s.active));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(allProducts.map((p) => p.category)))], [allProducts]);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "Todos" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [allProducts, search, category]);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountValue = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountValue);

  function addToCart(productId: string) {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    if (product.quantity === 0) {
      toast.error("Produto sem estoque");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function handleConfirm() {
    if (cart.length === 0) { toast.error("Adicione produtos ao carrinho"); return; }
    if (!sellerId) { toast.error("Selecione um vendedor"); return; }
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return;

    addSale({
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: i.product.price,
        subtotal: i.product.price * i.quantity,
      })),
      sellerId: seller.id,
      sellerName: seller.name,
      paymentMethod: payment,
      subtotal,
      discount: discountValue,
      total,
    });

    setConfirmed(true);
    toast.success(`Venda de ${fmt(total)} registrada!`);
    setTimeout(() => {
      setCart([]);
      setDiscount("");
      setPayment("pix");
      setShowConfirm(false);
      setConfirmed(false);
    }, 1800);
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Products panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>PDV / Caixa</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Vendedor:</span>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
                  color: "var(--foreground)", padding: "6px 12px", fontSize: 13, fontFamily: "Syne", cursor: "pointer",
                  outline: "none",
                }}
              >
                {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto por nome ou SKU..."
              style={{
                width: "100%", padding: "10px 12px 10px 38px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--foreground)", fontSize: 14, fontFamily: "Syne",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          {/* Category chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: cat === category ? "1px solid var(--gold)" : "1px solid var(--border)",
                  background: cat === category ? "oklch(0.72 0.130 73 / 0.15)" : "transparent",
                  color: cat === category ? "var(--gold)" : "var(--muted-foreground)",
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {filtered.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id);
              const outOfStock = product.quantity === 0;
              return (
                <div
                  key={product.id}
                  onClick={() => !outOfStock && addToCart(product.id)}
                  style={{
                    background: inCart ? "oklch(0.72 0.130 73 / 0.08)" : "var(--card)",
                    border: inCart ? "1px solid oklch(0.72 0.130 73 / 0.5)" : "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "16px",
                    cursor: outOfStock ? "not-allowed" : "pointer",
                    transition: "all 0.12s",
                    opacity: outOfStock ? 0.45 : 1,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!outOfStock) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-2px)";
                      el.style.boxShadow = "0 6px 20px oklch(0 0 0 / 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "none";
                    el.style.boxShadow = "none";
                  }}
                >
                  {inCart && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      background: "var(--gold)", color: "var(--primary-foreground)",
                      borderRadius: 999, width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {inCart.quantity}
                    </div>
                  )}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                      color: "var(--muted-foreground)", background: "var(--surface-2)",
                      padding: "2px 6px", borderRadius: 4,
                    }}>
                      {product.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{product.name}</p>
                  {product.color && <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>{product.color}</p>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <p className="font-mono-num" style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>
                      {fmt(product.price)}
                    </p>
                    <p style={{
                      fontSize: 11, fontWeight: 600,
                      color: product.quantity <= product.minQuantity ? "oklch(0.78 0.18 55)" : "var(--muted-foreground)",
                    }}>
                      {outOfStock ? "Sem estoque" : `${product.quantity} un`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart panel */}
      <div style={{
        width: 340, flexShrink: 0,
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Cart header */}
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <ShoppingCart size={18} style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Carrinho</span>
          {cart.length > 0 && (
            <span style={{
              marginLeft: "auto", background: "var(--gold)", color: "var(--primary-foreground)",
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            }}>
              {cart.reduce((s, i) => s + i.quantity, 0)} itens
            </span>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <ShoppingCart size={36} style={{ color: "var(--surface-3)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Clique em um produto para adicionar</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{
                  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                      {item.product.name.split(" ").slice(0, 4).join(" ")}
                    </p>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2, flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="font-mono-num" style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <span className="font-mono-num" style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                      {fmt(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        {cart.length > 0 && (
          <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
            {/* Discount */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Tag size={14} style={{ color: "var(--muted-foreground)" }} />
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Desconto (R$)"
                style={{
                  flex: 1, padding: "7px 10px", background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 7, color: "var(--foreground)", fontSize: 13, fontFamily: "JetBrains Mono", outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Totals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, padding: "10px 12px", background: "var(--card)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted-foreground)" }}>
                <span>Subtotal</span>
                <span className="font-mono-num">{fmt(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "oklch(0.65 0.22 25)" }}>
                  <span>Desconto</span>
                  <span className="font-mono-num">- {fmt(discountValue)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "var(--gold)", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 4 }}>
                <span>Total</span>
                <span className="font-mono-num">{fmt(total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 8 }}>FORMA DE PAGAMENTO</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {PAYMENT_OPTIONS.slice(0, 3).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPayment(opt.key)}
                    style={{
                      padding: "8px 4px",
                      background: payment === opt.key ? "oklch(0.72 0.130 73 / 0.15)" : "var(--surface-2)",
                      border: payment === opt.key ? "1px solid oklch(0.72 0.130 73 / 0.6)" : "1px solid var(--border)",
                      borderRadius: 7, cursor: "pointer",
                      color: payment === opt.key ? "var(--gold)" : "var(--muted-foreground)",
                      fontSize: 12, fontWeight: 600, fontFamily: "Syne",
                      transition: "all 0.12s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{opt.icon}</span>
                    <span style={{ fontSize: 10 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 6 }}>
                {PAYMENT_OPTIONS.slice(3).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPayment(opt.key)}
                    style={{
                      padding: "8px 4px",
                      background: payment === opt.key ? "oklch(0.72 0.130 73 / 0.15)" : "var(--surface-2)",
                      border: payment === opt.key ? "1px solid oklch(0.72 0.130 73 / 0.6)" : "1px solid var(--border)",
                      borderRadius: 7, cursor: "pointer",
                      color: payment === opt.key ? "var(--gold)" : "var(--muted-foreground)",
                      fontSize: 12, fontWeight: 600, fontFamily: "Syne",
                      transition: "all 0.12s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{opt.icon}</span>
                    <span style={{ fontSize: 10 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))",
                border: "none", borderRadius: 10, cursor: "pointer",
                color: "oklch(0.07 0.010 74)", fontWeight: 800, fontSize: 15, fontFamily: "Syne",
                letterSpacing: "0.04em", transition: "opacity 0.15s, transform 0.1s",
                boxShadow: "0 4px 16px oklch(0.72 0.130 73 / 0.4)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              REGISTRAR VENDA
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "oklch(0 0 0 / 0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--card)",
            border: "1px solid oklch(0.72 0.130 73 / 0.4)",
            borderRadius: 16, padding: "32px",
            width: 420, boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)",
          }}>
            {confirmed ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "oklch(0.62 0.16 145 / 0.2)",
                  border: "2px solid oklch(0.62 0.16 145)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <Check size={28} style={{ color: "oklch(0.62 0.16 145)" }} />
                </div>
                <p className="font-display" style={{ fontSize: 24, fontWeight: 600, color: "var(--foreground)" }}>Venda registrada!</p>
                <p className="font-mono-num" style={{ fontSize: 22, color: "var(--gold)", fontWeight: 700, marginTop: 8 }}>{fmt(total)}</p>
              </div>
            ) : (
              <>
                <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Confirmar venda</h2>
                <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 20 }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)} produto(s) · {sellers.find((s) => s.id === sellerId)?.name}
                </p>
                <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "12px 0", marginBottom: 20 }}>
                  {cart.map((item) => (
                    <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                      <span style={{ color: "var(--muted-foreground)" }}>{item.quantity}× {item.product.name.split(" ").slice(0, 4).join(" ")}</span>
                      <span className="font-mono-num" style={{ color: "var(--foreground)" }}>{fmt(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                  {discountValue > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                      <span style={{ color: "oklch(0.65 0.22 25)" }}>Desconto</span>
                      <span className="font-mono-num" style={{ color: "oklch(0.65 0.22 25)" }}>- {fmt(discountValue)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 17, color: "var(--gold)", marginTop: 10 }}>
                    <span>Total</span>
                    <span className="font-mono-num">{fmt(total)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    style={{ flex: 1, padding: "12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--foreground)", fontSize: 14, fontFamily: "Syne", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <X size={15} /> Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))", border: "none", borderRadius: 8, cursor: "pointer", color: "oklch(0.07 0.010 74)", fontSize: 14, fontFamily: "Syne", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 16px oklch(0.72 0.130 73 / 0.4)" }}
                  >
                    <Check size={15} /> Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
