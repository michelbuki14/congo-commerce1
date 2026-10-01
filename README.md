# Congo Commerce

Congo Commerce is a modern commerce platform built on Base44, designed to streamline storefront operations, sales workflows, and business tooling in a single app experience.

## Overview

This repository contains the source for the Congo Commerce application, including the React + Vite frontend and the Base44-powered integration layer. It is built for rapid iteration, local development, and deployment through the Base44 platform.

## Why this project exists

Congo Commerce brings essential commerce workflows together in one place, enabling teams to manage operations more efficiently while keeping the product experience flexible and easy to extend.

## Tech stack

- React
- Vite
- TypeScript / JavaScript
- Base44 SDK and CLI
- Tailwind-based UI patterns

## Prerequisites

Before working with the project locally, make sure you have:

- Node.js and npm
- Deno
- The Base44 CLI

Install the CLI:

```bash
npm install -g base44@latest
```

Verify the installation:

```bash
base44 --help
```

## Local development

The recommended workflow for this project is to run the app through the Base44 CLI so the local backend is started correctly.

> Important: do not use `npm run dev` as the primary local development command for this Base44 app unless you are intentionally working against a remote hosted backend.

### One-time setup

```bash
base44 login
base44 link
```

### Run locally

```bash
base44 dev
```

This command starts the local Base44 backend and frontend together. The application URL is printed in the terminal, typically on `http://localhost:5173`.

### Frontend-only mode with hosted backend

```bash
base44 dev --remote
```

This is useful for UI-driven work while connected to the live hosted Base44 backend. Note that writes in this mode target production data.

## Project scripts

Common commands used in the repo:

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
├── base44/              # Base44 project configuration
├── public/              # Static assets
├── scripts/             # Utility and data scripts
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── .env.local           # Local environment values (do not commit secrets)
├── README.md            # Project documentation
├── AGENTS.md            # Local workflow and Base44 guidance
└── third_party/         # Vendored third-party patches
```

## Publishing

After you push your changes, publish the app from the Base44 dashboard:

```bash
base44 dashboard open
```

This repository syncs with Base44 through Git, so publishing is handled through the dashboard rather than a direct CLI deploy.

## Notes

- Run `base44 link` after cloning a fresh copy of the project.
- Local entity data is in-memory only and resets when the local Base44 backend restarts.
- Never commit secrets or environment values from `.env.local`.

## Resources

- Base44 CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Base44 local development docs: https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview
- Support: https://app.base44.com/support
