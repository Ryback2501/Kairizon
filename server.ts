import { createServer } from "http";
import { parse } from "url";
import next from "next";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Validate env and DB connectivity before serving any traffic
  const { validateStartup } = await import("./src/lib/startup");
  await validateStartup();

  // Lazy import to avoid loading Prisma/services before Next.js is ready
  const { startPriceCheckCron } = await import("./src/lib/cron");
  startPriceCheckCron(cron);

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
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
