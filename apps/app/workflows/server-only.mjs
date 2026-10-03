/*
 * Outside Next.js, `import "server-only"` throws (it's only empty under the
 * react-server condition). The workflow service and the tests run server
 * code directly, so this resolve hook swaps it for an empty module.
 * Loaded with `node --import ./workflows/server-only.mjs`.
 */
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
        return next(specifier, context);
      }
    `),
);
