# instantVault

Secure, automated backups for your [InstantDB](https://instantdb.com) databases. Connect an app, point it at storage, and never lose your data.

instantVault lets you register your InstantDB apps, configure where their backups live — **bring your own S3-compatible bucket** or use **managed R2** — and manage it all from a single dashboard. Credentials (admin tokens and storage keys) are encrypted at rest with AES-256-GCM.

- 🗄️ **Connect InstantDB apps** — register apps by ID + admin token, validated on save
- 🪣 **Bring your own storage** — any S3-compatible bucket (R2, S3, B2, …), or let us host it
- 🔐 **Encrypted credentials** — tokens and keys are symmetrically encrypted before they touch the database
- ⏸️ **Full control** — pause, resume, and monitor apps from the dashboard

See [pricing](/pricing): free to self-host, or $5/month managed with a 30-day trial.

## Tech Stack

- **[TanStack Start](https://tanstack.com/start)** — full-stack React 19 framework with file-based routing and server functions
- **[InstantDB](https://instantdb.com)** — the app's own real-time database (`@instantdb/react` on the client, `@instantdb/admin` on the server)
- **[HeroUI v3](https://heroui.com)** + **[Tailwind CSS v4](https://tailwindcss.com)** — UI components and styling
- **[aws4fetch](https://github.com/mhart/aws4fetch)** — signed requests to S3-compatible storage
- **[Biome](https://biomejs.dev)** — linting and formatting
- **[Vitest](https://vitest.dev)** — testing

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- An InstantDB app — create one free at [instantdb.com](https://instantdb.com/dash)

### Install

```bash
bun install
```

### Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Scope | Description |
| --- | --- | --- |
| `VITE_INSTANT_APP_ID` | client | Your InstantDB app ID (public) |
| `INSTANT_APP_ID` | server | Same app ID, for the Admin SDK |
| `INSTANT_ADMIN_TOKEN` | server | InstantDB admin token — keep secret |
| `INSTANT_VAULT_SECRET` | server | Secret used to derive the AES-256-GCM key for encrypting stored credentials — keep secret |

### Push the schema

The schema and permissions live in [`src/instant.schema.ts`](src/instant.schema.ts) and [`src/instant.perms.ts`](src/instant.perms.ts). Push them to your app:

```bash
npx instant-cli push schema --yes
npx instant-cli push perms --yes
```

### Run

```bash
bun run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
bun run dev              # start the dev server on port 3000
bun run build            # build for production
bun run preview          # preview the production build
bun run test             # run tests with Vitest
bun run generate-routes  # regenerate the TanStack route tree
bun run check            # lint + format with Biome
```

Before committing, run `bun check --write` to auto-fix formatting and lint issues in a single pass.

## Project Structure

```
src/
├── routes/
│   ├── _home/          # marketing pages (landing, pricing, privacy, terms)
│   ├── _dashboard/     # authenticated app (apps, buckets, settings)
│   └── api/            # API routes
├── server/             # server functions, Admin SDK, credential encryption
├── components/         # shared and dashboard UI components
├── db/                 # client-side InstantDB init
├── instant.schema.ts   # InstantDB schema (apps, buckets, users, …)
└── instant.perms.ts    # InstantDB permissions
```

## How it works

- **Client reads** go through InstantDB's real-time React hooks — no loaders, optimistic by default.
- **Privileged writes** (connecting an app, saving storage credentials) run as TanStack **server functions** that verify the caller's InstantDB refresh token, validate the credentials against the live service, and encrypt secrets via [`crypto.server.ts`](src/server/crypto.server.ts) before persisting them with the Admin SDK.
- **Ownership** is always derived from the verified token server-side — a client-supplied user ID is never trusted.

## License

MIT — fork it, ship it.
