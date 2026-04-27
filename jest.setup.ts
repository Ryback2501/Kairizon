// Global test setup
// Extend Jest matchers or configure global mocks here if needed

// Provide a valid DATABASE_URL for the LibSQL adapter so db.ts can construct
// its PrismaClient without errors at module-load time. Integration tests
// override this with the real test DB path via the DATABASE_URL env var.
// Unit tests mock the repository layer so the DB is never actually queried.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file::memory:";
