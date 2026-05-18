# a-blank-palette

Projeto React full-stack gerado via [Lovable](https://lovable.dev), usando TanStack Start + Cloudflare Workers.

## Stack

- **Framework**: TanStack Start (React 19 + TanStack Router)
- **Estilização**: Tailwind CSS v4
- **Componentes**: shadcn/ui (Radix UI primitives)
- **Formulários**: React Hook Form + Zod
- **Queries**: TanStack Query
- **Deploy**: Cloudflare Workers (via Wrangler)
- **Build**: Vite + Bun

## Estrutura

```
src/
├── routes/          # Páginas (file-based routing via TanStack Router)
│   ├── __root.tsx   # Layout raiz
│   └── index.tsx    # Página principal
├── components/
│   └── ui/          # Componentes shadcn/ui
├── hooks/           # Custom hooks React
├── lib/             # Utilitários (cn, etc.)
├── router.tsx       # Configuração do router
├── server.ts        # Entry point Cloudflare Worker
├── start.ts         # Entry point TanStack Start
└── styles.css       # Estilos globais (Tailwind)
```

## Comandos

```bash
bun dev          # servidor de desenvolvimento
bun build        # build de produção
bun preview      # preview do build
bun lint         # ESLint
bun format       # Prettier
```

## Deploy

Deploy via Cloudflare Workers com Wrangler. Configuração em `wrangler.jsonc`.

```bash
bunx wrangler deploy
```

## Regra obrigatória

**Todo arquivo alterado deve ter um commit separado ou agrupado com mensagem descritiva antes de qualquer nova alteração.**

Fluxo mínimo após cada mudança:

```bash
git add <arquivo(s)>
git commit -m "descrição clara do que foi alterado"
```

Nunca acumular mudanças sem commitar.

## Convenções

- Componentes em `src/components/ui/` são gerados pelo shadcn e não devem ser editados manualmente — adicionar novos via CLI do shadcn
- Rotas novas: criar arquivo em `src/routes/` seguindo o padrão TanStack Router (file-based)
- Estilização via classes Tailwind; evitar CSS inline
- Validação de formulários sempre com Zod + React Hook Form
