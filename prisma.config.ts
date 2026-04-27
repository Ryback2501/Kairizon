import { defineConfig } from 'prisma/config'

const DATABASE_FILE = process.env.DATABASE_FILE ?? 'kairizon.db'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? `file:./data/${DATABASE_FILE}`,
  },
})
