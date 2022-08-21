const { createProxyMiddleware } = require("http-proxy-middleware");

// Proxy requests to /api to http://localhost:8888/wpi
module.exports = function expressMiddleware(router) {
    router.use(
        "/api",
        createProxyMiddleware({
            target: "http://localhost:8888/api/",
            changeOrigin: true,
        }),
    );
};