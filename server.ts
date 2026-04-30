import { createAdaptorServer } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync } from "fs";
import { resolve } from "path";
import cron from "node-cron";
import api from "./src/api/index";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
  process.exit(1);
});

async function main() {
  const { runMigrations } = await import("./src/lib/migrate");
  await runMigrations();

  const { ensureEmailTemplates } = await import("./src/lib/email-templates");
  ensureEmailTemplates();

  const { validateStartup } = await import("./src/lib/startup");
  await validateStartup();

  const { startPriceCheckCron } = await import("./src/lib/cron");
  startPriceCheckCron(cron);

  const app = new Hono();

  app.route("/api", api);

  if (!dev) {
    app.use("*", serveStatic({ root: "./dist/client" }));
    app.get("*", (c) => {
      try {
        const html = readFileSync(resolve(process.cwd(), "dist/client/index.html"), "utf-8");
        return c.html(html);
      } catch {
        return c.text("Not found", 404);
      }
    });
  }

  const server = createAdaptorServer(app);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`> Port ${port} is already in use`);
    } else {
      console.error("[server] HTTP server error:", err);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? "dev" : "prod"}]`);
  });

  async function shutdown(signal: string) {
    console.log(`> ${signal} received — shutting down gracefully`);
    server.close(async () => {
      const { db } = await import("./src/lib/db");
      await db.$disconnect().catch(() => null);
      console.log("> Shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("> Shutdown timed out — forcing exit");
      process.exit(1);
    }, 60_000);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main();
