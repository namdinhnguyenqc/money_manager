// Vercel entry point.
//
// Plain JS on purpose: tsconfig scopes tsc to src/, so a .ts file here would sit
// outside the build and "../src/index.js" would not resolve at run time. This
// imports the compiled output that `npm run build` produces instead.
//
// Exporting `fetch` rather than a default handler is what makes Vercel treat
// this as a Web-standard function. A default export is read as Node's
// `(req, res)` signature, which hands Hono an IncomingMessage whose `headers`
// is a plain object — `this.raw.headers.get is not a function` — and then hangs
// until the 60s timeout because nothing ever writes to `res`.
//
// vercel.json rewrites every path here, so one function serves the whole Hono
// app. src/index.ts skips binding a port when process.env.VERCEL is set, so
// importing it does not start a server.
import app from "../dist/index.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export function fetch(request) {
  return app.fetch(request);
}
