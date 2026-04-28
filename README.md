# Kairizon

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Built with Claude Code](https://img.shields.io/badge/-Claude_Code-000000?logo=claude&logoColor=white)](https://claude.ai/code)
[![GitHub Release](https://img.shields.io/github/v/release/Ryback2501/Kairizon)](https://github.com/Ryback2501/Kairizon/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/Ryback2501/Kairizon/create-release.yml?label=release)](https://github.com/Ryback2501/Kairizon/actions/workflows/create-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker Hub](https://img.shields.io/badge/docker-ryback2501%2Fkairizon-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/ryback2501/kairizon)
[![Docker Pulls](https://img.shields.io/docker/pulls/ryback2501/kairizon?logo=docker&logoColor=white)](https://hub.docker.com/r/ryback2501/kairizon)
[![GitHub Stars](https://img.shields.io/github/stars/Ryback2501/Kairizon?style=flat&logo=github)](https://github.com/Ryback2501/Kairizon/stargazers)

A self-hosted Amazon price tracker. Add product URLs, set a target price, and receive an email the moment the price drops to or below your threshold. Optionally get notified when an out-of-stock item becomes available again.

> Vibe-coded with [Claude Code](https://claude.ai/code).

## Features

- Track Amazon products by URL
- Set a target price and receive an email alert when the price hits it
- Get notified when an out-of-stock product becomes available again
- Filter out second-hand listings or specific sellers per product
- Configure email notifications directly from the UI — no config files needed
- Runs entirely on your own machine; no accounts, no subscriptions
- Data saved in an SQLite *.db file (kairizon.db by default)

## Use it!

### Docker (recommended)

Pull and run the latest image:

```bash
docker run -d \
  --name kairizon \
  -v ~/kairizon/data:/app/data \
  -p 3000:3000 \
  --restart unless-stopped \
  ryback2501/kairizon:latest
```

Data is persisted in `~/kairizon/data/kairizon.db` by default, but you can define the database file as well using the environment variable `DATABASE_FILE`:

```bash
docker run -d \
  --name kairizon \
  -v ~/kairizon/data:/app/data \
  -p 3000:3000 \
  -e DATABASE_FILE=mydb.db \
  --restart unless-stopped \
  ryback2501/kairizon:latest
```
The app runs at `http://localhost:3000`.

### Deploy the project on your machine

**Prerequisites:** You need [Node.js 20+](https://nodejs.org/).

---
**Option A — Clone the source code**

1. Clone the repository from the commit tagged `latest`, which always points to the latest release:
   ```bash
   git clone --depth 1 --branch latest https://github.com/Ryback2501/Kairizon.git
   cd Kairizon
   ```
2. Create a `.env` environment file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Edit the environment file with `nano` or any other text editor to define the database file name:
   ```bash
   nano .env
   ```
4. Install the dependencies:
   ```bash
   npm install
   ```
5. Build the app:
   ```bash
   npm run build
   ```

**Option B — Download pre-built release artifacts**

1. Download and extract the `kairizon-vX.X.X.zip` from the [latest release](https://github.com/Ryback2501/Kairizon/releases/latest).
2. Create a `.env` environment file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Edit the environment file with `nano` or any other text editor to define the database file name:
   ```bash
   nano .env
   ```
4. Install the dependencies:
   ```bash
   npm ci
   ```
---
Start the app:
```bash
npm start
```

The app runs at `http://localhost:3000`.

## Configuration

All settings — SMTP server, sender address, and credentials — are configured through the **Settings** panel inside the app. No environment variables or config files needed beyond the initial setup.

To send email alerts via Gmail, create a [Google App Password](https://support.google.com/accounts/answer/185833) (requires 2FA on the account) and use it as the SMTP password with port 587 or 465.

### Data persistence

All persistent data lives in the `data/` directory (or whichever host path you mount at `/app/data` in Docker):

| File | Description |
|------|-------------|
| `kairizon.db` | SQLite database — all products and settings |
| `email-price-alert.html` | Email template for price-drop alerts |
| `email-stock-alert.html` | Email template for back-in-stock alerts |

The two HTML template files are created automatically on first startup with a default layout. You can edit them freely — they are never overwritten by the app on subsequent restarts.

#### Email template placeholders

**`email-price-alert.html`**

| Placeholder | Value |
|-------------|-------|
| `{{PRODUCT_TITLE}}` | Product name |
| `{{PRODUCT_URL}}` | Amazon product URL |
| `{{CURRENT_PRICE}}` | Current price at the time of the alert (e.g. `€29.99`) |
| `{{TARGET_PRICE}}` | Your configured target price (e.g. `€35.00`) |
| `{{PRODUCT_IMAGE}}` | Product image URL from Amazon (empty string if unavailable) |

**`email-stock-alert.html`**

| Placeholder | Value |
|-------------|-------|
| `{{PRODUCT_TITLE}}` | Product name |
| `{{PRODUCT_URL}}` | Amazon product URL |
| `{{PRODUCT_IMAGE}}` | Product image URL from Amazon (empty string if unavailable) |

## Self-hosting notes

**Backups**

You can bak up your data by copying the files at the folder you defined in the Docker command with the `-v` property.

**Updating the Docker image**
```bash
docker pull ryback2501/kairizon:latest
docker stop kairizon && docker rm kairizon
# re-run the docker run command above
```

## Contributing

Contributions and ideas are welcome. The repository is public and anyone can fork it and open a pull request.

If you have a suggestion, found a bug, or want to discuss a change before implementing it, [open an issue](https://github.com/Ryback2501/Kairizon/issues) — it's the best place to start.

To contribute code:

1. Fork the repository
2. Create a branch from `dev`: `git checkout -b feat/your-feature`
3. Make your changes and commit following [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request targeting the `dev` branch

Please keep PRs focused — one feature or fix per PR.
