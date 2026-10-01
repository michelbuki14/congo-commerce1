# Congo Commerce

**The all-in-one commerce platform for teams that move fast.** Build, deploy, and scale your storefront operations without the headache. Congo Commerce brings inventory management, sales workflows, and business automation together in one beautiful, extensible platform.

## Why Congo Commerce

Managing commerce operations shouldn't require 10 different tools. Congo Commerce unifies your workflow—from storefront management to order fulfillment—in a single app that gets out of your way and lets you focus on growing your business.

- **Built on Base44** — Deploy anywhere, iterate instantly
- **Developer-first** — Extend with code, not config
- **Real-time collaboration** — Your team stays in sync
- **Local-first development** — Build and test offline

## What's included

| Feature | Description |
|---------|-------------|
| **Inventory Management** | Track stock, manage SKUs, and automate reordering |
| **Order Processing** | Process orders, track fulfillment, and manage shipping |
| **Sales Dashboard** | Real-time insights into revenue, customers, and trends |
| **Team Collaboration** | Shared workflows with role-based access control |
| **Extensibility** | Open API and SDK for custom integrations |
| **Local Backend** | Run everything locally during development with Deno |

## How it works

```
┌─────────────────────────────────────────────┐
│  Your Team                                  │
│  (Browser)                                  │
└────────────┬────────────────────────────────┘
             │
        ┌────▼────────────────────┐
        │  Congo Commerce UI      │
        │  (React + Vite)         │
        │                         │
        │  • Inventory            │
        │  • Orders               │
        │  • Analytics            │
        └────┬────────────────────┘
             │
        ┌────▼──────────────────────────────┐
        │  Base44 Backend (Local or Hosted)  │
        │                                   │
        │  • Entities & Functions            │
        │  • Auth & Permissions              │
        │  • Integrations & APIs             │
        └────┬──────────────────────────────┘
             │
        ┌────▼──────────────────┐
        │ Your Data & Services  │
        │ (In-memory or remote) │
        └───────────────────────┘
```

**During local development:** The Base44 CLI starts both frontend and backend on your machine. You can work offline, test new features, and deploy when ready.

**In production:** Your code syncs through Git and deploys through the Base44 dashboard, keeping your infrastructure simple and your deployments reliable.

## Getting started

### Prerequisites

- Node.js and npm
- Deno
- Base44 CLI

Install the CLI:

```bash
npm install -g base44@latest
```

### One-time setup

```bash
# Clone the repo
git clone https://github.com/michelbuki14/congo-commerce1
cd congo-commerce1

# Install and link
npm install
base44 login
base44 link
```

### Run locally

```bash
base44 dev
```

Open the URL printed in your terminal (usually `http://localhost:5173`). Your app is now running with a local backend—no need to wait for cloud deployments.

### Work against hosted backend

```bash
base44 dev --remote
```

Connected to live data? Use this for frontend-only work. ⚠️ Writes go to production.

## Project structure

```text
congo-commerce1/
├── src/                   # React application
│   ├── pages/            # UI pages and routes
│   ├── components/        # Reusable React components
│   ├── api/              # Base44 client and API layer
│   └── styles/           # Tailwind and custom styles
├── base44/               # Base44 config
├── public/               # Static assets
├── scripts/              # Utilities and data scripts
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
└── README.md             # You are here
```

## Development workflow

1. **Make your changes** — Edit files in `src/` and see live updates in the browser
2. **Test locally** — Use `base44 dev` to verify everything works
3. **Push to Git** — Commit and push your changes to GitHub
4. **Deploy** — Open `base44 dashboard open` and publish from the dashboard

The repo syncs with Base44 through Git, so your deployment is as simple as a Git push.

## Available commands

```bash
npm run dev          # Frontend only (against remote backend)
npm run build        # Build for production
npm run lint         # Check code quality
npm run typecheck    # TypeScript type checking
npm run test         # Run tests
```

For the full Base44 experience, always use:

```bash
base44 dev           # Local backend + frontend
base44 dev --remote  # Frontend + hosted backend
```

## Resources

- [Base44 CLI Reference](https://docs.base44.com/developers/references/cli/get-started/overview.md)
- [Local Development Guide](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview)
- [Base44 Support](https://app.base44.com/support)

## Contributing

We welcome contributions! Please read our contribution guidelines and feel free to open issues or submit pull requests.

## License

This project is proprietary software. See the LICENSE file for details.

---

**Built with ❤️ by the Congo Commerce team. Deployed by Base44.**
