import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, ArrowDown, Package, AlertTriangle, DollarSign, X, Check, CheckSquare, Square, MinusSquare } from "lucide-react";
import { getProducts, addProduct, updateProduct, deleteProduct, addStockEntry } from "../lib/db";
import type { Product } from "../lib/types";

export const Route = createFileRoute("/estoque")({
  component: Estoque,
});

const CATEGORIES = ["Sofás", "Mesas", "Dormitório", "Sala", "Escritório", "Outros"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = {
  name: "", category: "Sofás", sku: "", price: "", cost: "", quantity: "", minQuantity: "2", color: "", model: "",
};

function Estoque() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: getProducts });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [stockModal, setStockModal] = useState<{ product: Product; qty: string; reason: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const addMutation = useMutation({
    mutationFn: (data: Omit<Product, "id">) => addProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      toast.success("Produto cadastrado");
      setShowModal(false);
    },
    onError: () => toast.error("Erro ao cadastrar produto"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Product> }) => updateProduct(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      toast.success("Produto atualizado");
      setShowModal(false);
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      toast.success("Produto excluído");
    },
    onError: () => toast.error("Erro ao excluir produto"),
  });

  const stockMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) =>
      addStockEntry(productId, quantity, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lowStock"] });
      toast.success(`+${vars.quantity} unidades adicionadas`);
      setStockModal(null);
    },
    onError: () => toast.error("Erro ao registrar entrada"),
  });

  const categories = useMemo(() => ["Todos", ...CATEGORIES], []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "Todos" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const totalValue = products.reduce((s, p) => s + p.price * p.quantity, 0);
  const totalCost = products.reduce((s, p) => s + p.cost * p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length;

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, category: p.category, sku: p.sku,
      price: String(p.price), cost: String(p.cost),
      quantity: String(p.quantity), minQuantity: String(p.minQuantity),
      color: p.color ?? "", model: p.model ?? "",
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name || !form.sku || !form.price || !form.cost) {
      toast.error("Preencha nome, SKU, preço e custo");
      return;
    }
    const data = {
      name: form.name, category: form.category, sku: form.sku,
      price: parseFloat(form.price), cost: parseFloat(form.cost),
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 2,
      color: form.color || undefined,
      model: form.model || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, changes: data });
    } else {
      addMutation.mutate(data);
    }
  }

  function handleDelete(id: string) {
    if (confirm("Excluir este produto?")) {
      deleteMutation.mutate(id);
    }
  }

  async function handleDeleteSelected() {
    if (!confirm(`Excluir ${selected.size} produto(s) selecionado(s)?`)) return;
    const count = selected.size;
    for (const id of Array.from(selected)) {
      await deleteProduct(id);
    }
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["lowStock"] });
    toast.success(`${count} produto(s) excluído(s)`);
  }

  function handleStockEntry() {
    if (!stockModal) return;
    const qty = parseInt(stockModal.qty);
    if (!qty || qty <= 0) { toast.error("Informe uma quantidade válida"); return; }
    stockMutation.mutate({
      productId: stockModal.product.id,
      quantity: qty,
      reason: stockModal.reason || "Entrada manual",
    });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const someFilteredSelected = filtered.some((p) => selected.has(p.id)) && !allFilteredSelected;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const s = new Set(prev);
        filtered.forEach((p) => s.delete(p.id));
        return s;
      });
    } else {
      setSelected((prev) => {
        const s = new Set(prev);
        filtered.forEach((p) => s.add(p.id));
        return s;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
    border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)",
    fontSize: 13, fontFamily: "Syne", outline: "none",
  };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>Estoque</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>{products.length} produtos cadastrados</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px",
            background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))",
            border: "none", borderRadius: 9, cursor: "pointer",
            color: "oklch(0.07 0.010 74)", fontWeight: 700, fontSize: 13, fontFamily: "Syne",
            boxShadow: "0 4px 14px oklch(0.72 0.130 73 / 0.35)",
          }}
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "TOTAL PRODUTOS", value: String(products.length), icon: Package, color: "var(--muted-foreground)" },
          { label: "VALOR EM ESTOQUE", value: fmt(totalValue), icon: DollarSign, color: "var(--gold)" },
          { label: "CUSTO EM ESTOQUE", value: fmt(totalCost), icon: DollarSign, color: "var(--muted-foreground)" },
          { label: "ESTOQUE BAIXO", value: String(lowStockCount), icon: AlertTriangle, color: lowStockCount > 0 ? "oklch(0.75 0.20 25)" : "var(--muted-foreground)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>{label}</p>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="font-mono-num" style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px", marginBottom: 14,
          background: "oklch(0.72 0.130 73 / 0.10)",
          border: "1px solid oklch(0.72 0.130 73 / 0.35)",
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div style={{ height: 16, width: 1, background: "var(--border)" }} />
          <button
            onClick={() => setSelected(new Set())}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 12, fontFamily: "Syne", fontWeight: 600, padding: "4px 8px", borderRadius: 6 }}
          >
            Limpar seleção
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleDeleteSelected}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              background: "oklch(0.60 0.20 25 / 0.15)",
              border: "1px solid oklch(0.60 0.20 25 / 0.4)",
              borderRadius: 7, cursor: "pointer",
              color: "oklch(0.72 0.20 25)", fontSize: 12, fontWeight: 700, fontFamily: "Syne",
            }}
          >
            <Trash2 size={13} /> Excluir selecionados
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            style={{ ...inputStyle, paddingLeft: 34 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: cat === categoryFilter ? "1px solid var(--gold)" : "1px solid var(--border)",
              background: cat === categoryFilter ? "oklch(0.72 0.130 73 / 0.12)" : "transparent",
              color: cat === categoryFilter ? "var(--gold)" : "var(--muted-foreground)",
              cursor: "pointer", transition: "all 0.12s",
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            Carregando produtos...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "11px 12px 11px 16px", width: 40 }}>
                  <button
                    onClick={toggleSelectAll}
                    title={allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: allFilteredSelected || someFilteredSelected ? "var(--gold)" : "var(--muted-foreground)" }}
                  >
                    {allFilteredSelected
                      ? <CheckSquare size={16} />
                      : someFilteredSelected
                      ? <MinusSquare size={16} />
                      : <Square size={16} />}
                  </button>
                </th>
                {["Produto", "SKU", "Categoria", "Qtd", "Preço", "Custo", "Margem", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const margin = ((p.price - p.cost) / p.price) * 100;
                const isLow = p.quantity <= p.minQuantity;
                const isSelected = selected.has(p.id);
                return (
                  <tr key={p.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSelected ? "oklch(0.72 0.130 73 / 0.06)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? "oklch(0.72 0.130 73 / 0.06)" : "transparent"; }}
                  >
                    <td style={{ padding: "13px 12px 13px 16px", width: 40 }}>
                      <button
                        onClick={() => toggleSelect(p.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: isSelected ? "var(--gold)" : "var(--muted-foreground)" }}
                      >
                        {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                      {(p.color || p.model) && (
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                          {[p.color, p.model].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--muted-foreground)" }}>{p.sku}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "var(--surface-2)", color: "var(--muted-foreground)" }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="font-mono-num" style={{
                          fontSize: 15, fontWeight: 700,
                          color: p.quantity === 0 ? "oklch(0.65 0.22 25)" : isLow ? "oklch(0.78 0.18 55)" : "var(--foreground)",
                        }}>
                          {p.quantity}
                        </span>
                        {isLow && <AlertTriangle size={12} style={{ color: p.quantity === 0 ? "oklch(0.65 0.22 25)" : "oklch(0.78 0.18 55)" }} />}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{fmt(p.price)}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span className="font-mono-num" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{fmt(p.cost)}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span className="font-mono-num" style={{ fontSize: 12, fontWeight: 600, color: margin > 35 ? "oklch(0.62 0.16 145)" : margin > 20 ? "var(--gold)" : "oklch(0.65 0.22 25)" }}>
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setStockModal({ product: p, qty: "", reason: "" })}
                          title="Entrada de estoque"
                          style={{ width: 28, height: 28, borderRadius: 6, background: "oklch(0.62 0.16 145 / 0.15)", border: "1px solid oklch(0.62 0.16 145 / 0.3)", cursor: "pointer", color: "oklch(0.62 0.16 145)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: "oklch(0.60 0.20 25 / 0.12)", border: "1px solid oklch(0.60 0.20 25 / 0.25)", cursor: "pointer", color: "oklch(0.65 0.22 25)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            Nenhum produto encontrado
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--card)", border: "1px solid oklch(0.72 0.130 73 / 0.3)", borderRadius: 14, padding: "28px", width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>{editingId ? "Editar Produto" : "Novo Produto"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>NOME DO PRODUTO *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ex: Sofá Retrátil 3 Lugares" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>SKU *</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={inputStyle} placeholder="SOF-001" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>CATEGORIA</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>PREÇO DE VENDA *</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} placeholder="0.00" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>CUSTO *</label>
                <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} style={inputStyle} placeholder="0.00" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>QUANTIDADE</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} placeholder="0" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>QTDE MÍNIMA</label>
                <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} style={inputStyle} placeholder="2" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>COR</label>
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={inputStyle} placeholder="Ex: Cinza" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>MODELO</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle} placeholder="Ex: Oslo" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--foreground)", fontSize: 13, fontFamily: "Syne", fontWeight: 600 }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={addMutation.isPending || updateMutation.isPending}
                style={{ flex: 2, padding: "11px", background: "linear-gradient(135deg, oklch(0.78 0.130 78), oklch(0.65 0.130 68))", border: "none", borderRadius: 8, cursor: "pointer", color: "oklch(0.07 0.010 74)", fontSize: 13, fontFamily: "Syne", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} /> {editingId ? "Salvar alterações" : "Cadastrar produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock entry modal */}
      {stockModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--card)", border: "1px solid oklch(0.62 0.16 145 / 0.3)", borderRadius: 14, padding: "28px", width: 400, boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>Entrada de Estoque</h2>
              <button onClick={() => setStockModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>{stockModal.product.name}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>QUANTIDADE A ADICIONAR</label>
                <input type="number" value={stockModal.qty} onChange={(e) => setStockModal({ ...stockModal, qty: e.target.value })} style={inputStyle} placeholder="0" onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>MOTIVO</label>
                <input value={stockModal.reason} onChange={(e) => setStockModal({ ...stockModal, reason: e.target.value })} style={inputStyle} placeholder="Compra, devolução..." onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStockModal(null)} style={{ flex: 1, padding: "11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--foreground)", fontSize: 13, fontFamily: "Syne", fontWeight: 600 }}>Cancelar</button>
              <button
                onClick={handleStockEntry}
                disabled={stockMutation.isPending}
                style={{ flex: 2, padding: "11px", background: "oklch(0.62 0.16 145)", border: "none", borderRadius: 8, cursor: "pointer", color: "oklch(0.07 0.010 74)", fontSize: 13, fontFamily: "Syne", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ArrowDown size={14} /> Confirmar entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
