import { execSync } from "node:child_process";
import { startMpMock } from "./mp-mock";

export default async function globalSetup() {
  // The generated Prisma client is ESM-only; run the reset through tsx.
  execSync("pnpm exec tsx tests/support/reset-db.cli.ts", { stdio: "inherit" });
  const mock = startMpMock();
  return async () => {
    mock.close();
  };
}
