# Congo Commerce

Congo Commerce is a Base44 app for managing commerce workflows, storefront operations, and related business tooling. This repository contains the app source for the frontend and Base44 integration layer.

## Overview

This project is built as a Base44 application using React + Vite, with Base44-managed backend support and local development through the Base44 CLI.

## Prerequisites

Before you start, make sure you have:

- Node.js and npm
- Deno
- The Base44 CLI

Install the CLI:

```bash
npm install -g base44@latest
```

Verify it works:

```bash
base44 --help
```

## Local development

Important: do not run `npm run dev` directly for this Base44 app unless you are only working against a remote hosted backend. The local Base44 backend must be started through the CLI.

### One-time setup

```bash
base44 login
base44 link
```

### Start the app locally

```bash
base44 dev
```

This starts the local Base44 backend and frontend together. The frontend URL will be printed in the terminal, usually something like `http://localhost:5173`.

### Frontend only against a hosted backend

```bash
base44 dev --remote
```

Use this when you want to work on the UI while using the live hosted Base44 backend. Note that writes in this mode go to production data.

## Available project scripts

```bash
npm install
npm run build
npm run lint
npm run typecheck
npm run test
```

## Project structure

```text
.
├── src/                 # Frontend application source
├── base44/              # Base44 configuration
├── public/              # Static assets
├── scripts/             # Utility scripts
├── package.json         # Project scripts and dependencies
├── vite.config.js       # Vite configuration
├── .env.local           # Local environment variables (do not commit secrets)
├── README.md            # Project documentation
└── AGENTS.md            # Agent workflow and Base44 guidance
```

## Publishing changes

After pushing your changes to GitHub, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

This repository syncs with Base44 through Git, so publishing is done through the dashboard rather than a direct CLI deploy.

## Notes

- `base44 link` is required for each fresh clone.
- Local entity data is in-memory only and resets when the local Base44 backend restarts.
- Do not commit secrets or `.env.local` contents.

## References

- Base44 CLI docs: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Base44 local development docs: https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview
