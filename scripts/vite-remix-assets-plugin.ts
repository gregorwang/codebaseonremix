import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  listRemixSourceFiles,
  readRemixSourceFile,
} from "./remix-assets";

const PREFIX = "/__remix-assets";

export function remixAssetsDevPlugin(): Plugin {
  return {
    name: "remix-assets-dev",
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith(PREFIX)) {
          next();
          return;
        }

        try {
          if (url.pathname === `${PREFIX}/list`) {
            const dir = url.searchParams.get("dir") ?? "app";
            const files = listRemixSourceFiles(dir);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ files }));
            return;
          }

          if (url.pathname === `${PREFIX}/read`) {
            const filePath = url.searchParams.get("path");
            if (!filePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing path parameter" }));
              return;
            }
            const content = readRemixSourceFile(filePath);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ path: filePath, content }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Request failed",
            }),
          );
        }
      });
    },
  };
}
