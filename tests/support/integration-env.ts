import { testEnv } from "./test-env";

Object.assign(process.env, testEnv, {
  NODE_ENV: "test",
  // Fake sandbox credentials; all HTTP calls to this base URL are stubbed in tests.
  MP_ACCESS_TOKEN: "TEST-fake-token",
  MP_WEBHOOK_SECRET: "whsec_integration",
  MP_API_BASE_URL: "http://mp.mock",
});
