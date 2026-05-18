import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trophy, Phone, Mail, ToggleLeft, ToggleRight, Trash2, Edit2, X, Check, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { getSellers, addSeller, updateSeller, deleteSeller, getSalesThisMonth } from "../lib/store";
import type { Seller } from "../lib/types";

export const Route = createFileRoute("/vendedores")({
  component: Vendedores,
});

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const EMPTY_FORM = { name: "", phone: "", email: "" };

function Vendedores() {
  const [sellers, setSellers] = useState<Seller[]>(() => getSellers());
  const [salesMonth] = useState(() => getSalesThisMonth());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);

  const reload = () => setSellers(getSellers());

  const sellerStats = sellers.map((seller) => {
    const sellerSales = salesMonth.filter((s) => s.sellerId === seller.id);
    const total = sellerSales.reduce((s, v) => s + v.total, 0);
    const profit = sellerSales.reduce((s, v) => s + v.total * 0.35, 0);
    const avgTicket = sellerSales.length > 0 ? total / sellerSales.length : 0;
    return { seller, total, profit, count: sellerSales.length, avgTicket };
  }).sort((a, b) => b.total - a.total);

  const topTotal = sellerStats[0]?.total ?? 1;
  const monthTotal = salesMonth.reduce((s, v) => s + v.total, 0);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(s: Seller) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone, email: s.email });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name) { toast.error("Informe o nome do vendedor"); return; }
    if (editingId) {
      updateSeller(editingId, form);
      toast.success("Vendedor atualizado");
    } else {
      addSeller({ ...form, active: true });
      toast.success("Vendedor cadastrado");
    }
    reload();
    setShowModal(false);
  }

  function handleDelete(id: string) {
    if (confirm("Excluir este vendedor?")) {
      deleteSeller(id);
      reload();
      toast.success("Vendedor excluído");
    }
  }

  function toggleActive(s: Seller) {
    updateSeller(s.id, { active: !s.active });
    reload();
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
    border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)",
    fontSize: 13, fontFamily: "Syne", outline: "none",
  };

  const medalColors = ["var(--gold)", "oklch(0.75 0.02 74)", "oklch(0.65 0.12 50)"];

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>Vendedores</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>{sellers.filter((s) => s.active).length} ativos · desempenho do mês</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))",
            border: "none", borderRadius: 9, cursor: "pointer",
            color: "oklch(0.07 0.010 74)", fontWeight: 700, fontSize: 13, fontFamily: "Syne",
            boxShadow: "0 4px 14px oklch(0.72 0.130 73 / 0.35)",
          }}
        >
          <Plus size={16} /> Novo Vendedor
        </button>
      </div>

      {/* Month summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "FATURAMENTO DO MÊS", value: fmt(monthTotal), icon: TrendingUp, color: "var(--gold)" },
          { label: "TOTAL DE VENDAS", value: String(salesMonth.length), icon: ShoppingBag, color: "var(--muted-foreground)" },
          { label: "TICKET MÉDIO", value: salesMonth.length > 0 ? fmt(monthTotal / salesMonth.length) : "R$0", icon: DollarSign, color: "var(--muted-foreground)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>{label}</p>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="font-mono-num" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Seller cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {sellerStats.map(({ seller, total, profit, count, avgTicket }, i) => (
          <div
            key={seller.id}
            style={{
              background: i === 0 ? "linear-gradient(135deg, oklch(0.72 0.130 73 / 0.12), oklch(0.72 0.130 73 / 0.04))" : "var(--card)",
              border: i === 0 ? "1px solid oklch(0.72 0.130 73 / 0.4)" : "1px solid var(--border)",
              borderRadius: 12, padding: "20px 22px",
              opacity: seller.active ? 1 : 0.55,
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 8px 24px oklch(0 0 0 / 0.3)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "none";
              el.style.boxShadow = "none";
            }}
          >
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: i < 3 ? `${medalColors[i]}22` : "var(--surface-2)",
                  border: `2px solid ${i < 3 ? medalColors[i] : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {i < 3 ? (
                    <Trophy size={18} style={{ color: medalColors[i] }} />
                  ) : (
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--muted-foreground)", fontFamily: "JetBrains Mono" }}>{i + 1}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{seller.name}</p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {seller.active ? "● Ativo" : "○ Inativo"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => toggleActive(seller)} title={seller.active ? "Desativar" : "Ativar"} style={{ background: "none", border: "none", cursor: "pointer", color: seller.active ? "oklch(0.62 0.16 145)" : "var(--muted-foreground)" }}>
                  {seller.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => openEdit(seller)} style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Edit2 size={12} />
                </button>
                <button onClick={() => handleDelete(seller.id)} style={{ width: 28, height: 28, borderRadius: 6, background: "oklch(0.60 0.20 25 / 0.12)", border: "1px solid oklch(0.60 0.20 25 / 0.25)", cursor: "pointer", color: "oklch(0.65 0.22 25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Contact */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {seller.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                  <Phone size={12} />{seller.phone}
                </div>
              )}
              {seller.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                  <Mail size={12} />{seller.email.split("@")[0]}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "VENDAS", value: String(count) },
                { label: "FATURAMENTO", value: fmt(total) },
                { label: "TICKET MÉDIO", value: fmt(avgTicket) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--surface-1)", borderRadius: 7, padding: "8px 10px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</p>
                  <p className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>
                <span>Participação no mês</span>
                <span className="font-mono-num">{monthTotal > 0 ? ((total / monthTotal) * 100).toFixed(1) : "0"}%</span>
              </div>
              <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${topTotal > 0 ? (total / topTotal) * 100 : 0}%`,
                  background: i === 0 ? "var(--gold)" : i === 1 ? "oklch(0.75 0.02 74)" : "var(--surface-3)",
                  borderRadius: 2, transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--card)", border: "1px solid oklch(0.72 0.130 73 / 0.3)", borderRadius: 14, padding: "28px", width: 420, boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>{editingId ? "Editar Vendedor" : "Novo Vendedor"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(["name", "phone", "email"] as const).map((field) => (
                <div key={field}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>
                    {{ name: "NOME *", phone: "TELEFONE", email: "E-MAIL" }[field]}
                  </label>
                  <input
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    style={inputStyle}
                    placeholder={{ name: "Nome completo", phone: "(11) 99999-9999", email: "email@loja.com" }[field]}
                    type={field === "email" ? "email" : "text"}
                    onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--foreground)", fontSize: 13, fontFamily: "Syne", fontWeight: 600 }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 2, padding: "11px", background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))", border: "none", borderRadius: 8, cursor: "pointer", color: "oklch(0.07 0.010 74)", fontSize: 13, fontFamily: "Syne", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} /> {editingId ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
