import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Package, Users, Download, Calendar } from "lucide-react";
import { getSales, getProducts, getUsers } from "../lib/db";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
});

const TABS = [
  { key: "revenue", label: "Faturamento", icon: TrendingUp },
  { key: "products", label: "Produtos", icon: Package },
  { key: "sellers", label: "Vendedores", icon: Users },
] as const;

type Tab = (typeof TABS)[number]["key"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "var(--gold)", fontWeight: 700 }} className="font-mono-num">
          {typeof p.value === "number" && p.name === "vendas" ? p.value : fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function Relatorios() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const { data: allSalesRaw = [] } = useQuery({ queryKey: ["allSales"], queryFn: () => getSales() });
  const { data: allProducts = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const allSellers = useMemo(() => users.filter((u) => u.role === "seller" && u.active), [users]);

  const filteredSales = useMemo(() => {
    const days = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return allSalesRaw.filter((s) => new Date(s.createdAt) >= cutoff);
  }, [allSalesRaw, period]);

  // Revenue by day
  const revenueByDay = useMemo(() => {
    const days = parseInt(period);
    const map = new Map<string, { total: number; vendas: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map.set(key, { total: 0, vendas: 0 });
    }
    for (const sale of filteredSales) {
      const key = new Date(sale.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const cur = map.get(key);
      if (cur) { cur.total += sale.total; cur.vendas += 1; }
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  }, [filteredSales, period]);

  // Revenue by payment method
  const revenueByPayment = useMemo(() => {
    const map = new Map<string, number>();
    const labels: Record<string, string> = { cash: "Dinheiro", pix: "PIX", debit: "Débito", credit: "Crédito", financing: "Financiamento" };
    for (const sale of filteredSales) {
      map.set(sale.paymentMethod, (map.get(sale.paymentMethod) ?? 0) + sale.total);
    }
    return Array.from(map.entries()).map(([key, total]) => ({ name: labels[key] ?? key, total })).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const cur = map.get(item.productId) ?? { name: item.productName.split(" ").slice(0, 3).join(" "), qty: 0, total: 0 };
        cur.qty += item.quantity;
        cur.total += item.subtotal;
        map.set(item.productId, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredSales]);

  // Seller performance
  const sellerPerf = useMemo(() => {
    return allSellers.map((seller) => {
      const sellerSales = filteredSales.filter((s) => s.sellerId === seller.id);
      const total = sellerSales.reduce((s, v) => s + v.total, 0);
      const profit = total * 0.35;
      const count = sellerSales.length;
      return { name: seller.name.split(" ")[0], fullName: seller.name, total, profit, count, avgTicket: count > 0 ? total / count : 0 };
    }).sort((a, b) => b.total - a.total);
  }, [filteredSales, allSellers]);

  const totalRevenue = filteredSales.reduce((s, v) => s + v.total, 0);
  const totalProfit = totalRevenue * 0.35;
  const totalCount = filteredSales.length;
  const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  const PIE_COLORS = ["oklch(0.72 0.130 73)", "oklch(0.65 0.18 145)", "oklch(0.60 0.16 200)", "oklch(0.75 0.18 50)", "oklch(0.65 0.20 300)"];

  function exportCSV() {
    const rows = [
      ["Data", "Vendedor", "Produtos", "Pagamento", "Total"],
      ...filteredSales.map((s) => [
        new Date(s.createdAt).toLocaleDateString("pt-BR"),
        s.sellerName,
        s.items.map((i) => `${i.quantity}x ${i.productName}`).join(" | "),
        s.paymentMethod,
        s.total.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vendas-${period}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>Relatórios</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>Análise de desempenho comercial</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
          {(["7", "30", "90"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: period === p ? "1px solid var(--gold)" : "1px solid var(--border)",
              background: period === p ? "oklch(0.72 0.130 73 / 0.15)" : "transparent",
              color: period === p ? "var(--gold)" : "var(--muted-foreground)",
              cursor: "pointer", transition: "all 0.12s",
            }}>
              {p} dias
            </button>
          ))}
          <button
            onClick={exportCSV}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, cursor: "pointer", color: "var(--muted-foreground)",
              fontSize: 12, fontWeight: 600, fontFamily: "Syne",
            }}
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "FATURAMENTO", value: fmt(totalRevenue), color: "var(--gold)" },
          { label: "LUCRO ESTIMADO", value: fmt(totalProfit), color: "oklch(0.62 0.16 145)" },
          { label: "TRANSAÇÕES", value: String(totalCount), color: "var(--foreground)" },
          { label: "TICKET MÉDIO", value: fmt(avgTicket), color: "var(--foreground)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 10 }}>{label}</p>
            <p className="font-mono-num" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--surface-1)", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            borderRadius: 7, border: "none", cursor: "pointer",
            background: tab === key ? "var(--card)" : "transparent",
            color: tab === key ? "var(--gold)" : "var(--muted-foreground)",
            fontSize: 13, fontWeight: tab === key ? 700 : 500, fontFamily: "Syne",
            boxShadow: tab === key ? "0 1px 4px oklch(0 0 0 / 0.2)" : "none",
            transition: "all 0.12s",
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "revenue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 20 }}>FATURAMENTO DIÁRIO</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.018 74)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 10, fontFamily: "Syne" }} axisLine={false} tickLine={false} interval={Math.floor(revenueByDay.length / 7)} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" stroke="oklch(0.72 0.130 73)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "oklch(0.72 0.130 73)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 20 }}>POR FORMA DE PAGAMENTO</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={revenueByPayment} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {revenueByPayment.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 16 }}>DETALHAMENTO</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {revenueByPayment.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 20 }}>Sem vendas no período</p>
                )}
                {revenueByPayment.map(({ name, total }, i) => (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{name}</span>
                      </div>
                      <span className="font-mono-num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(total)}</span>
                    </div>
                    <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(total / (revenueByPayment[0]?.total || 1)) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>PRODUTOS MAIS VENDIDOS</p>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Sem vendas no período selecionado</div>
          ) : (
            <>
              <div style={{ padding: "20px 24px", marginBottom: 8 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.018 74)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.78 0.015 74)", fontSize: 11, fontFamily: "Syne" }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.72 0.130 73 / 0.05)" }} />
                    <Bar dataKey="total" fill="oklch(0.72 0.130 73)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border)" }}>
                    {["Produto", "Qtd vendida", "Receita", "% do total"].map((h) => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}
                      style={{ borderBottom: i < topProducts.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-1)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: "12px 20px" }}><span className="font-mono-num" style={{ fontSize: 13 }}>{p.qty}</span></td>
                      <td style={{ padding: "12px 20px" }}><span className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{fmt(p.total)}</span></td>
                      <td style={{ padding: "12px 20px" }}>
                        <span className="font-mono-num" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                          {totalRevenue > 0 ? ((p.total / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === "sellers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)", marginBottom: 20 }}>FATURAMENTO POR VENDEDOR</p>
            {sellerPerf.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, padding: "20px" }}>Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sellerPerf} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.018 74)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.78 0.015 74)", fontSize: 12, fontFamily: "Syne" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.72 0.130 73 / 0.05)" }} />
                  <Bar dataKey="total" fill="oklch(0.72 0.130 73)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>DESEMPENHO DETALHADO</p>
            </div>
            {sellerPerf.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Nenhum vendedor com vendas no período</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-1)" }}>
                    {["#", "Vendedor", "Vendas", "Faturamento", "Lucro", "Ticket Médio"].map((h) => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sellerPerf.map((s, i) => (
                    <tr key={s.fullName}
                      style={{ borderBottom: i < sellerPerf.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-1)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <td style={{ padding: "13px 20px" }}>
                        <span className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "var(--gold)" : "var(--muted-foreground)" }}>#{i + 1}</span>
                      </td>
                      <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 600 }}>{s.fullName}</td>
                      <td style={{ padding: "13px 20px" }}><span className="font-mono-num" style={{ fontSize: 13 }}>{s.count}</span></td>
                      <td style={{ padding: "13px 20px" }}><span className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{fmt(s.total)}</span></td>
                      <td style={{ padding: "13px 20px" }}><span className="font-mono-num" style={{ fontSize: 13, color: "oklch(0.62 0.16 145)" }}>{fmt(s.profit)}</span></td>
                      <td style={{ padding: "13px 20px" }}><span className="font-mono-num" style={{ fontSize: 13 }}>{fmt(s.avgTicket)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
