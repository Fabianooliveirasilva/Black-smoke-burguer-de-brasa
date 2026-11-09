/** Environment shared by integration tests and the Playwright test server. Never real credentials. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://burger:burger_dev_password@localhost:5433/blacksmoke_test";

export const testEnv = {
  DATABASE_URL: TEST_DATABASE_URL,
  BETTER_AUTH_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:3100",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  UPLOAD_DIR: `${process.cwd()}/storage/test-uploads`,
  TRUST_PROXY: "true",
};

export const ADMIN = { email: "admin@test.local", password: "Admin#Test2026!" };
