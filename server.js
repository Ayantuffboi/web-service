const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const PORT = process.env.PORT || 10000;

const TARGET = "https://bio-research-labs.publicvm.com";

app.get("/", (req, res) => {
  res.send(`
    <h1>Proxy is running</h1>
    <p>Try <a href="/proxy/">/proxy/</a></p>
  `);
});

const proxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,

  pathRewrite: {
    "^/proxy": ""
  },

  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader("Referer", TARGET + "/");
      proxyReq.setHeader("Origin", TARGET);
    },

    proxyRes: (proxyRes) => {
      // Prevent the target from blocking iframe embedding.
      delete proxyRes.headers["x-frame-options"];

      if (proxyRes.headers["content-security-policy"]) {
        delete proxyRes.headers["content-security-policy"];
      }
    },

    error: (err, req, res) => {
      console.error("Proxy error:", err);

      if (!res.headersSent) {
        res.status(502).send("Proxy error: " + err.message);
      }
    }
  }
});

app.use("/proxy", proxy);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on port ${PORT}`);
});
