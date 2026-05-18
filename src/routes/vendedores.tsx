import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Phone, Mail, TrendingUp, ShoppingBag, DollarSign, Shield } from "lucide-react";
import { getUsers, getSalesThisMonth } from "../lib/db";

export const Route = createFileRoute("/vendedores")({
  component: Vendedores,
});

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function Vendedores() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const { data: salesMonth = [], isLoading: loadingSales } = useQuery({ queryKey: ["salesMonth"], queryFn: getSalesThisMonth });

  const sellers = useMemo(() => users.filter((u) => u.role === "seller"), [users]);

  const sellerStats = useMemo(() =>
    sellers.map((seller) => {
      const sellerSales = salesMonth.filter((s) => s.sellerId === seller.id);
      const total = sellerSales.reduce((s, v) => s + v.total, 0);
      const profit = sellerSales.reduce((s, v) => s + v.total * 0.35, 0);
      const avgTicket = sellerSales.length > 0 ? total / sellerSales.length : 0;
      return { seller, total, profit, count: sellerSales.length, avgTicket };
    }).sort((a, b) => b.total - a.total),
    [sellers, salesMonth]
  );

  const topTotal = sellerStats[0]?.total ?? 1;
  const monthTotal = salesMonth.reduce((s, v) => s + v.total, 0);

  const medalColors = ["var(--gold)", "oklch(0.75 0.02 74)", "oklch(0.65 0.12 50)"];

  const isLoading = loadingUsers || loadingSales;

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>Vendedores</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>{sellers.filter((s) => s.active).length} ativos · desempenho do mês</p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px",
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: 9, fontSize: 12, color: "var(--muted-foreground)",
        }}>
          <Shield size={13} />
          <span>Gerencie vendedores no Painel Admin</span>
        </div>
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

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--muted-foreground)", fontSize: 13 }}>
          Carregando dados...
        </div>
      ) : sellers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--muted-foreground)", fontSize: 14 }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum vendedor cadastrado</p>
          <p>Acesse o Painel Admin para criar logins de vendedores.</p>
        </div>
      ) : (
        /* Seller cards grid */
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
      )}
    </div>
  );
}
