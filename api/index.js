import { createRequire } from "module";

const require = createRequire(import.meta.url);
const server = require("../dist/server.cjs");

export default server.default || server.app || server;
