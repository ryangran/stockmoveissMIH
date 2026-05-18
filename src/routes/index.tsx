import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Trophy,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import {
  getSalesToday,
  getSalesThisMonth,
  getLast7DaysRevenue,
  getLowStockProducts,
  getSales,
  getUsers,
} from "../lib/db";
import { useAuth } from "../lib/auth";
import type { AppUser } from "../lib/types";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit: "Débito",
  credit: "Crédito",
  financing: "Financiamento",
};

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function KpiCard({
  label, value, sub, icon: Icon, accent = false, alert = false,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean; alert?: boolean;
}) {
  return (
    <div
      style={{
        background: accent
          ? "linear-gradient(135deg, oklch(0.72 0.130 73 / 0.15), oklch(0.72 0.130 73 / 0.05))"
          : "var(--card)",
        border: accent
          ? "1px solid oklch(0.72 0.130 73 / 0.4)"
          : alert
          ? "1px solid oklch(0.60 0.20 25 / 0.4)"
          : "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = accent ? "0 8px 24px oklch(0.72 0.130 73 / 0.2)" : "0 8px 24px oklch(0 0 0 / 0.3)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "none";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: accent ? "oklch(0.72 0.130 73 / 0.2)" : alert ? "oklch(0.60 0.20 25 / 0.15)" : "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} style={{ color: accent ? "var(--gold)" : alert ? "oklch(0.70 0.22 25)" : "var(--muted-foreground)" }} />
        </div>
      </div>
      <div>
        <p className="font-mono-num" style={{
          fontSize: 26, fontWeight: 700, lineHeight: 1,
          color: accent ? "var(--gold)" : alert ? "oklch(0.75 0.20 25)" : "var(--foreground)",
          letterSpacing: "-0.02em",
        }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--gold)", fontWeight: 700 }} className="font-mono-num">{fmt(payload[0].value)}</p>
    </div>
  );
}

function Dashboard() {
  const { user: me } = useAuth();
  const isSeller = me?.role === "seller";
  const sellerId = isSeller ? me!.id : undefined;

  const { data: salesToday = [] } = useQuery({ queryKey: ["salesToday", sellerId], queryFn: () => getSalesToday(sellerId) });
  const { data: salesMonth = [] } = useQuery({ queryKey: ["salesMonth", sellerId], queryFn: () => getSalesThisMonth(sellerId) });
  const { data: chartData = [] } = useQuery({ queryKey: ["chart7days", sellerId], queryFn: () => getLast7DaysRevenue(sellerId) });
  const { data: lowStock = [] } = useQuery({ queryKey: ["lowStock"], queryFn: getLowStockProducts });
  const { data: recentSalesRaw = [] } = useQuery({ queryKey: ["recentSales", sellerId], queryFn: () => getSales(8) });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["users"], queryFn: getUsers, enabled: !isSeller });

  const recentSales = useMemo(() => {
    const all = [...recentSalesRaw];
    if (isSeller) return all.filter(s => s.sellerId === sellerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  }, [recentSalesRaw, isSeller, sellerId]);

  const ranking = useMemo(() => {
    if (isSeller) return [];
    const sellers = users.filter((u) => u.role === "seller" && u.active);
    return sellers.map((user) => {
      const mine = salesMonth.filter((s) => s.sellerId === user.id);
      return { user, total: mine.reduce((s, v) => s + v.total, 0), count: mine.length };
    }).sort((a, b) => b.total - a.total);
  }, [users, salesMonth, isSeller]);

  const todayRevenue = salesToday.reduce((s, v) => s + v.total, 0);
  const monthRevenue = salesMonth.reduce((s, v) => s + v.total, 0);
  const todayProfit = todayRevenue * 0.35;
  const maxRanking = ranking[0]?.total ?? 1;

  const now = new Date();
  const greet = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 32, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>
              {greet}, {me?.name.split(" ")[0]} 👋
            </h1>
            <p style={{ color: "var(--muted-foreground)", marginTop: 6, fontSize: 14 }}>
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.12em", fontWeight: 700 }}>
              {isSeller ? "SUAS VENDAS NO MÊS" : "FATURAMENTO DO MÊS"}
            </p>
            <p className="font-mono-num" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>{fmt(monthRevenue)}</p>
          </div>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, var(--gold) 0%, transparent 60%)", marginTop: 20, opacity: 0.4 }} />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label={isSeller ? "SUAS VENDAS HOJE" : "FATURAMENTO HOJE"} value={fmt(todayRevenue)} sub={`${salesToday.length} venda${salesToday.length !== 1 ? "s" : ""}`} icon={TrendingUp} accent />
        <KpiCard label="VENDAS HOJE" value={String(salesToday.length)} sub="transações concluídas" icon={ShoppingBag} />
        <KpiCard label="LUCRO ESTIMADO" value={fmt(todayProfit)} sub="margem ~35%" icon={ArrowUpRight} />
        <KpiCard label="ESTOQUE BAIXO" value={String(lowStock.length)} sub={lowStock.length > 0 ? "precisam de reposição" : "tudo em dia"} icon={AlertTriangle} alert={lowStock.length > 0} />
      </div>

      {/* Chart + Ranking */}
      <div style={{ display: "grid", gridTemplateColumns: isSeller ? "1fr" : "1fr 320px", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>
              {isSeller ? "SUAS VENDAS — ÚLTIMOS 7 DIAS" : "FATURAMENTO — ÚLTIMOS 7 DIAS"}
            </p>
            <p className="font-mono-num" style={{ fontSize: 13, color: "var(--gold)" }}>{fmt(chartData.reduce((s, d) => s + d.total, 0))}</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.018 74)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 11, fontFamily: "Syne" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: "oklch(0.58 0.020 74)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.72 0.130 73 / 0.05)" }} />
              <Bar dataKey="total" fill="oklch(0.72 0.130 73)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!isSeller && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Trophy size={14} style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>RANKING DO MÊS</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ranking.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 20 }}>Sem dados ainda</p>
              )}
              {ranking.map(({ user, total, count }, i) => (
                <div key={user.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? "var(--gold)" : "var(--muted-foreground)", width: 18, fontFamily: "JetBrains Mono" }}>#{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{user.name.split(" ")[0]}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{count}v</span>
                    </div>
                    <span className="font-mono-num" style={{ fontSize: 13, color: i === 0 ? "var(--gold)" : "var(--foreground)", fontWeight: 600 }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(total / maxRanking) * 100}%`, background: i === 0 ? "var(--gold)" : "var(--surface-3)", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent sales + Low stock */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>
              {isSeller ? "SUAS ÚLTIMAS VENDAS" : "ÚLTIMAS VENDAS"}
            </p>
          </div>
          {recentSales.length === 0 ? (
            <p style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Nenhuma venda registrada</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-1)" }}>
                  {["Produto", ...(isSeller ? [] : ["Vendedor"]), "Pagamento", "Total", "Hora"].map((h) => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale, i) => (
                  <tr key={sale.id}
                    style={{ borderBottom: i < recentSales.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-1)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>
                      {sale.items[0]?.productName.split(" ").slice(0, 3).join(" ")}
                      {sale.items.length > 1 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}> +{sale.items.length - 1}</span>}
                    </td>
                    {!isSeller && <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{sale.sellerName.split(" ")[0]}</td>}
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "var(--surface-2)", color: "var(--muted-foreground)" }}>
                        {PAYMENT_LABELS[sale.paymentMethod]}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span className="font-mono-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{fmt(sale.total)}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted-foreground)", fontFamily: "JetBrains Mono" }}>
                      {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: "var(--card)", border: lowStock.length > 0 ? "1px solid oklch(0.60 0.20 25 / 0.35)" : "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} style={{ color: lowStock.length > 0 ? "oklch(0.72 0.20 25)" : "var(--muted-foreground)" }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-foreground)" }}>ALERTAS DE ESTOQUE</p>
            {lowStock.length > 0 && (
              <span style={{ marginLeft: "auto", background: "oklch(0.60 0.20 25 / 0.2)", color: "oklch(0.75 0.20 25)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                {lowStock.length}
              </span>
            )}
          </div>
          <div style={{ padding: "4px 0" }}>
            {lowStock.length === 0 ? (
              <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>✓ Estoque em dia</p>
            ) : (
              lowStock.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{p.name.split(" ").slice(0, 3).join(" ")}</p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{p.sku}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="font-mono-num" style={{ fontSize: 16, fontWeight: 700, color: p.quantity === 0 ? "oklch(0.65 0.22 25)" : "oklch(0.78 0.18 55)" }}>{p.quantity}</p>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)" }}>mín: {p.minQuantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
