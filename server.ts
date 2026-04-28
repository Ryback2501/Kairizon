import { createServer } from "http";
import next from "next";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
  process.exit(1);
});

app.prepare().then(async () => {
  // Apply schema migrations, then validate DB connectivity
  const { runMigrations } = await import("./src/lib/migrate");
  await runMigrations();

  const { ensureEmailTemplates } = await import("./src/lib/email-templates");
  ensureEmailTemplates();

  const { validateStartup } = await import("./src/lib/startup");
  await validateStartup();

  // Lazy import to avoid loading Prisma/services before Next.js is ready
  const { startPriceCheckCron } = await import("./src/lib/cron");
  startPriceCheckCron(cron);

  const server = createServer((req, res) => {
    handle(req, res);
  });

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

  // Graceful shutdown — allow in-flight requests and cron jobs to finish
  async function shutdown(signal: string) {
    console.log(`> ${signal} received — shutting down gracefully`);
    server.close(async () => {
      const { db } = await import("./src/lib/db");
      await db.$disconnect().catch(() => null);
      console.log("> Shutdown complete");
      process.exit(0);
    });

    // Force-exit if shutdown takes too long (e.g. hung scraper)
    setTimeout(() => {
      console.error("> Shutdown timed out — forcing exit");
      process.exit(1);
    }, 60_000);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
});
