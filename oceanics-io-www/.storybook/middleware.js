const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Proxy requests from storybook components:
 * https://github.com/aeksco/react-typescript-web-extension-starter/issues/5
 */
module.exports = function expressMiddleware(router) {
    router.use(
        "/api/auth",
        createProxyMiddleware({
            target: "http://localhost:8888/.netlify/functions/auth",
            changeOrigin: true,
        }),
    );
};
