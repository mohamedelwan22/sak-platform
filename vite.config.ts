import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import http from "node:http";

function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          const url = `http://localhost:3001${req.url}`;
          const proxyReq = http.request(
            url,
            {
              method: req.method,
              headers: { ...req.headers, host: "localhost:3001" },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
              proxyRes.pipe(res);
            },
          );
          proxyReq.on("error", () => {
            res.writeHead(502);
            res.end("Bad Gateway");
          });
          req.pipe(proxyReq);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: [apiProxyPlugin()],
});
