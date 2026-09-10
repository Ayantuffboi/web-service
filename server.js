const express = require("express");
const {
  createProxyMiddleware,
  responseInterceptor
} = require("http-proxy-middleware");

const app = express();

const PORT = process.env.PORT || 10000;
const TARGET = "https://bio-research-labs.publicvm.com";

const proxy = createProxyMiddleware({
  target: TARGET,

  // Make the request look like it is going to the original server.
  changeOrigin: true,

  // Allow WebSocket games.
  ws: true,

  // Keep redirects inside our proxy.
  autoRewrite: true,
  protocolRewrite: "https",

  // Rewrite cookies so login sessions can work through the proxy.
  cookieDomainRewrite: {
    "*": ""
  },

  cookiePathRewrite: {
    "*": "/"
  },

  // Don't modify binary files.
  selfHandleResponse: false,

  on: {
    proxyReq: (proxyReq, req) => {
      // Tell the original server where the request came from.
      proxyReq.setHeader("Referer", TARGET + "/");

      // Don't send the Render hostname as the Host header.
      proxyReq.setHeader("Host", new URL(TARGET).host);

      console.log("PROXY:", req.method, req.originalUrl);
    },

    proxyRes: (proxyRes, req) => {
      // Remove headers that can prevent embedding/running through the proxy.
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];

      // Some servers send restrictive cross-origin headers.
      delete proxyRes.headers["cross-origin-opener-policy"];
      delete proxyRes.headers["cross-origin-embedder-policy"];
      delete proxyRes.headers["cross-origin-resource-policy"];

      console.log(
        "RESPONSE:",
        proxyRes.statusCode,
        req.method,
        req.originalUrl
      );
    },

    error: (err, req, res) => {
      console.error("PROXY ERROR:", err);

      if (!res.headersSent) {
        res.status(502).send(`
          <h1>Proxy Error</h1>
          <p>${err.message}</p>
        `);
      }
    }
  }
});

// Health check.
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// IMPORTANT:
// Proxy everything else.
// This means /login, /api, /games, /assets,
// .wasm, .js, .css, images, audio, video, etc.
app.use("/", proxy);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on port ${PORT}`);
});

// WebSocket support for games that use WebSockets.
server.on("upgrade", proxy.upgrade);

console.log("WebSocket proxy enabled");
