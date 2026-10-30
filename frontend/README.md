# Occasio frontend

React 19 + Vite + Tailwind CSS v4 + react-konva. See the [root README](../README.md) for
setup and [CLAUDE.md](../CLAUDE.md) for architecture.

```bash
pnpm dev:frontend              # http://localhost:5173
pnpm --filter frontend lint    # oxlint
pnpm --filter frontend build   # tsc -b && vite build
```

Routes: `/` (editor; `/?edit=<id>` edits a pending card), `/scheduled`, `/login`, `/register`,
and `/render` (headless-render target used by the backend).
