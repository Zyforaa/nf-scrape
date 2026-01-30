# Netflix Metadata Explorer

A web application for exploring detailed metadata, artwork, and technical specifications of Netflix content. Built with React and deployed on Cloudflare Workers, this tool provides a clean interface for looking up Netflix titles by their video ID.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Configuration](#configuration)
7. [Deployment](#deployment)
8. [API Reference](#api-reference)
9. [Project Structure](#project-structure)
10. [Troubleshooting](#troubleshooting)
11. [License](#license)

---

## Overview

Netflix Metadata Explorer allows users to input a Netflix video ID and retrieve comprehensive metadata including title information, quality capabilities (4K, HDR, Dolby Atmos), content advisories, artwork assets, and technical details. The application proxies requests through a Cloudflare Worker to Netflix's internal GraphQL API.

This tool is intended for research and educational purposes. It is not affiliated with or endorsed by Netflix.

---

## Features

### Core Functionality

- **Metadata Lookup**: Enter any Netflix video ID to retrieve full title metadata including runtime, release date, maturity rating, and availability status.

- **Quality Capabilities Grid**: Visual TRUE/FALSE grid showing support for Ultra 4K HD, HDR, HDR10+, Dolby Vision, Dolby Atmos, Spatial Audio, 5.1 surround, and offline downloads.

- **Artwork Gallery**: Browse all available artwork including box art, high-resolution box art, story art, and title logos. Click any image to open it in a full-screen lightbox.

- **Content Advisory Details**: View maturity ratings, certification board information, and specific content warning reasons.

- **Countdown Timer**: For upcoming releases, displays a live countdown to availability.

### Search and History

- **URL State Management**: The current video ID is synced to the URL query parameter, allowing users to share direct links to specific lookups and use browser navigation.

- **Search History**: The last 20 searches are stored locally and displayed as an autocomplete dropdown, showing both the video ID and title for quick access.

- **Batch Lookup**: Enter multiple video IDs separated by commas to fetch and compare up to four titles simultaneously.

### Comparison Mode

- **Side-by-Side Comparison**: When multiple IDs are provided, titles are displayed in a comparison grid showing key attributes like year, runtime, rating, and quality support.

### Export and Sharing

- **Export as JSON**: Copy the complete metadata response as formatted JSON.

- **Export as Markdown**: Generate a human-readable Markdown document with key details.

- **Share Link**: Copy a direct URL that will load the current title when opened.

### User Interface

- **Dark and Light Themes**: Toggle between dark and light color schemes. The preference is persisted to local storage.

- **Skeleton Loading States**: Animated placeholder content displays while data is being fetched, providing visual feedback without layout shift.

- **Toast Notifications**: Success and error messages appear as non-intrusive toasts in the bottom-right corner.

- **Keyboard Shortcuts**:
  - `Ctrl+K` or `Cmd+K`: Focus the search input
  - `Ctrl+Shift+L` or `Cmd+Shift+L`: Toggle theme
  - `Escape`: Close modals and clear focus

- **Copy to Clipboard**: Quick copy buttons for video IDs and other frequently needed values.

### Analytics Dashboard

- **Local Analytics**: Track total searches, average response time, and view recent query history. Data is stored locally and accessible via the chart icon in the header.

### Rate Limiting Indicator

- **Visual Quota Display**: A progress bar in the header shows remaining API quota when rate limit headers are present.

### Progressive Web App

- **Installable**: The application includes a web manifest and can be installed to the home screen on supported devices.

- **Offline Support**: A service worker caches static assets for faster subsequent loads and basic offline capability.

---

## Architecture

The application consists of two main components:

### Frontend

- React 19 with TypeScript
- Vite for development and building
- CSS custom properties for theming
- Sonner for toast notifications

### Backend

- Cloudflare Workers for serverless API
- Cloudflare KV for cookie storage
- Proxies requests to Netflix's GraphQL endpoint

The frontend is served as static assets from Cloudflare's edge network, while API requests are handled by the Worker running in the same deployment.

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

- Node.js version 18 or later
- npm version 8 or later
- A Cloudflare account (free tier is sufficient)
- Wrangler CLI (installed as a dev dependency)

You will also need valid Netflix session cookies for the API to function. These can be obtained from an authenticated Netflix session in your browser.

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nf-scrape
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Local Environment

Create a `.dev.vars` file in the project root for local secrets:

```
API_KEY=your-local-api-key
```

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`. The Vite development server includes hot module replacement and will proxy API requests to the local Worker.

### 5. Access Cloudflare Bindings

While running the dev server, press `b` and Enter to list configured Cloudflare bindings, which is useful for debugging KV access.

---

## Configuration

### KV Namespace Setup

The application uses Cloudflare KV to store Netflix cookies securely. To set up the namespace:

1. Create the KV namespace:

```bash
npx wrangler kv namespace create NETFLIX_KV
```

2. Copy the output ID and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "NETFLIX_KV",
    "id": "your-namespace-id-here"
  }
]
```

3. For local development, also create a preview namespace:

```bash
npx wrangler kv namespace create NETFLIX_KV --preview
```

Add the preview ID to your wrangler configuration.

### API Key Configuration

The cookie update endpoint is protected by an API key. Set it as a secret:

```bash
npx wrangler secret put API_KEY
```

Enter a strong, random string when prompted. This key must be provided in the `X-API-Key` header when updating cookies.

### Updating Netflix Cookies

Cookies must be updated periodically as Netflix sessions expire. Use the secured API endpoint:

```bash
curl -X POST https://your-worker-domain.workers.dev/api/cookies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"cookies": "your-netflix-cookie-string"}'
```

To obtain cookies, log into Netflix in your browser, open Developer Tools, navigate to the Network tab, and copy the Cookie header from any request to `netflix.com`.

---

## Deployment

### Build the Application

```bash
npm run build
```

This compiles TypeScript and bundles the React application for production.

### Deploy to Cloudflare

```bash
npm run deploy
```

This runs the build and then deploys the Worker and assets to Cloudflare. The first deployment will prompt you to authenticate with Cloudflare if you haven't already.

### Custom Domain (Optional)

To use a custom domain:

1. Add the domain to your Cloudflare account
2. In the Cloudflare dashboard, navigate to Workers and Routes
3. Add a route pattern pointing to your Worker

### Environment-Specific Configuration

For staging or production environments, you can define environment-specific settings in `wrangler.jsonc`:

```jsonc
{
  "env": {
    "production": {
      "kv_namespaces": [
        {
          "binding": "NETFLIX_KV",
          "id": "production-namespace-id"
        }
      ]
    }
  }
}
```

Deploy to a specific environment:

```bash
npx wrangler deploy --env production
```

---

## API Reference

### GET /api/metadata

Retrieves metadata for a Netflix title.

**Query Parameters:**

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| videoId   | string | Yes      | Numeric Netflix video ID       |

**Response:**

```json
{
  "data": {
    "unifiedEntities": [
      {
        "videoId": 12345678,
        "title": "Example Title",
        "latestYear": 2024,
        "runtimeSec": 7200,
        "isAvailable": true,
        "playbackBadges": ["VIDEO_ULTRA_HD", "AUDIO_DOLBY_ATMOS"],
        ...
      }
    ]
  }
}
```

**Error Responses:**

- `400`: Missing or invalid videoId
- `500`: Failed to fetch from Netflix API

### POST /api/cookies

Updates the Netflix cookies stored in KV. Requires authentication.

**Headers:**

| Header     | Required | Description                    |
|------------|----------|--------------------------------|
| X-API-Key  | Yes      | API key configured as secret   |

**Body:**

```json
{
  "cookies": "NetflixId=...; SecureNetflixId=...; ..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cookies updated successfully"
}
```

**Error Responses:**

- `401`: Invalid or missing API key
- `400`: Missing cookies field or invalid JSON
- `500`: KV namespace not configured

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

---

## Project Structure

```
nf-scrape/
├── public/
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
├── src/
│   ├── App.tsx            # Main React application
│   ├── App.css            # Styles and design tokens
│   ├── main.tsx           # React entry point
│   └── index.css          # Base styles
├── worker/
│   ├── index.ts           # Cloudflare Worker entry
│   └── env.d.ts           # TypeScript environment types
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── wrangler.jsonc         # Cloudflare Workers configuration
└── README.md              # This file
```

---

## Troubleshooting

### Metadata requests return errors

Verify that valid Netflix cookies are stored in KV. Cookies expire and must be refreshed periodically. Check the Worker logs in the Cloudflare dashboard for specific error messages.

### KV namespace not found

Ensure the KV namespace ID in `wrangler.jsonc` matches the actual namespace. Run `npx wrangler kv namespace list` to see available namespaces.

### Local development issues

If the dev server fails to start, try removing `node_modules` and reinstalling:

```bash
rm -rf node_modules
npm install
```

Ensure you have the correct Node.js version by checking with `node --version`.

### CORS errors in browser

The Worker includes CORS headers for all API routes. If you encounter CORS issues, verify the request is going to the correct origin and that the `Access-Control-Allow-Origin` header is present in responses.

### Build failures

TypeScript errors will prevent the build from completing. Run `npm run lint` to check for issues and `npx tsc --noEmit` to validate types without building.

---

## License

This project is provided for educational and research purposes. Netflix is a registered trademark of Netflix, Inc. This project is not affiliated with, endorsed by, or connected to Netflix in any way.

Use of this tool must comply with Netflix's Terms of Service. The authors accept no responsibility for misuse of this software.
