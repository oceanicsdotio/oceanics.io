import type { Context } from "https://edge.netlify.com";

const AUTH = "auth";
const lookup = {
    [AUTH]: AUTH,
    0: `index`,
    1: `collection`,
    2: `entity`,
    3: `topology`
};

const filterPath = (x: string) => 
    x
    && !["api", "index"].includes(x)
    && !x.includes("htm")

const routeFromUrl = (url: string) =>
    new URL(url)
        .pathname
        .replaceAll(")", "")
        .split(/[(/.]/)
        .filter(filterPath)

// Replace parenthesis syntax with paths, because it's WAY easier
export default (request: Request, context: Context) => {
    const hasAuth = request.headers.has("x-api-key") || request.headers.has("authorization")
    if (!hasAuth) {
        return new Response("Unauthorized", {
            status: 403
        })
    }

    const route = routeFromUrl(request.url);
    const count = route.length as keyof typeof lookup;
    const endpoint: string = count > 0 && route[0] === AUTH ?
        AUTH : (lookup[count] ?? "");

    return endpoint ?
        context.rewrite(`/.netlify/functions/${endpoint}`) :
        new Response("Not Found", {
            status: 404
        })
};
