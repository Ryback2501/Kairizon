import { createServer } from "http";
import { parse } from "url";
import next from "next";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Lazy import to avoid loading Prisma/services before Next.js is ready
  import("./src/lib/cron").then(({ startPriceCheckCron }) => {
    startPriceCheckCron(cron);
  });

  createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log(`> Ready on http://localhost:3000 [${dev ? "dev" : "prod"}]`);
  });
});
