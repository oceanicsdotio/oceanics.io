// @ts-ignore: tsc doesn't get deno?
import type { Context } from "https://edge.netlify.com";

const AUTH = "auth";
const lookup = {
  [AUTH]: AUTH,
  0: `index`,
  1: `collection`,
  2: `entity`,
  3: `topology`
};

const SENSING = new Set([
  "Things",
  "Sensors",
  "Observations",
  "ObservedProperties",
  "FeaturesOfInterest",
  "HistoricalLocations",
  "Locations",
  "DataStreams",
])

const filterPath = (x: string) =>
  x
  && !["api", "index"].includes(x)
  && !x.includes("htm")

const routeFromUrl = (url: URL) =>
  url.pathname
    .replaceAll(")", "")
    .split(/[(/.]/)
    .filter(filterPath)

// Replace parenthesis syntax with paths, because it's WAY easier
export default (request: Request, context: Context) => {
  const hasAuth = request.headers.has("x-api-key") || request.headers.has("authorization")
  if (!hasAuth) return new Response("Unauthorized", {
    status: 403
  })
  
  const url = new URL(request.url)
  const route = routeFromUrl(url);
  const count = route.length as keyof typeof lookup;
  if (count > 0 && route[0] === AUTH) {
    return context.rewrite(`/.netlify/functions/auth`)
  }
  const endpoint: string = lookup[count] ?? "";
  if (!endpoint) {
    return new Response("Not Found", {
      status: 404
    })
  }
  const search = new URLSearchParams();
  const [left="", uuid="", right=""] = route;

  if (count > 0) {
    if (!SENSING.has(left)) {
      return new Response("Not Found", {
        status: 404
      })
    }
    search.append('left', left);
  }
  if (count > 1) search.append('uuid', uuid);
  if (count > 2) {
    if (!SENSING.has(right)) {
      return new Response("Not Found", {
        status: 404
      })
    }
    search.append('right', right)
    
  }
  const target = `${url.origin}/.netlify/functions/${endpoint}?${search.toString()}`;
  
  return fetch(target, {
    headers: request.headers,
    method: request.method,
    body: request.body
  });
};
