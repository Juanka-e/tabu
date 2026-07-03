process.env.NODE_ENV = "production";
process.env.PORT = "3201";
process.env.HOST = "127.0.0.1";

import("../server").catch((error) => {
  console.error(error);
  process.exit(1);
});
