Object.assign(process.env, {
  NODE_ENV: "production",
  PORT: "3201",
  HOST: "127.0.0.1",
  REDIS_URL: process.env.PLAYWRIGHT_REDIS_URL ?? "",
  SOCKET_IO_REDIS_ADAPTER_ENABLED: "false",
  ROOM_OWNERSHIP_LEASE_ENABLED: "false",
});

import("../apps/web/server").catch((error) => {
  console.error(error);
  process.exit(1);
});
