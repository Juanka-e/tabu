Object.assign(process.env, {
  NODE_ENV: "production",
  PORT: "3201",
  HOST: "127.0.0.1",
});

import("../server").catch((error) => {
  console.error(error);
  process.exit(1);
});
