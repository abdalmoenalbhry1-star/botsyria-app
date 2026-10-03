import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  try {
    const server = require("../dist/server.cjs");
    const app = server.default || server.app || server;

    return app(req, res);
  } catch (error) {
    console.error("SERVER_LOAD_ERROR:", error);

    return res.status(500).json({
      error: "SERVER_LOAD_ERROR",
      message: error?.message || String(error),
      name: error?.name || "Error"
    });
  }
}
