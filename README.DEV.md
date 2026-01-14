# Development Mode with Docker

This setup allows you to run the app in Docker with hot-reload support, so changes to source files are reflected immediately without rebuilding.

## Quick Start

```bash
# Start development container
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

## Ports

- **3072**: Vite dev server (frontend with hot-reload, same as production)
- **3073**: Backend proxy server (internal, proxied by Vite via /api)

## How It Works

1. **Source code is mounted as volumes** - Changes to files in `src/` are immediately reflected
2. **Vite dev server** runs with HMR (Hot Module Replacement) - No page refresh needed
3. **Backend proxy** runs separately on port 3073 for RSS feeds
4. **Vite proxies `/api` requests** to the backend automatically

## Accessing the App

- **Local**: http://localhost:3072
- **Via nginx proxy**: Use the same nginx config as production (port 3072) - no changes needed!

## Switching Back to Production

```bash
# Stop dev container
docker-compose -f docker-compose.dev.yml down

# Start production container
docker-compose up -d
```

## Notes

- Changes to `package.json` require rebuilding: `docker-compose -f docker-compose.dev.yml build`
- Changes to `vite.config.js` or `server.js` require container restart: `docker-compose -f docker-compose.dev.yml restart`
- Source code changes in `src/` are hot-reloaded automatically
