const AUTH = "auth";
const lookup = {
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
export default (request: Request) => {
  const hasAuth = request.headers.has("x-api-key") || request.headers.has("authorization")
  if (!hasAuth) return new Response("Unauthorized", {
    status: 403
  })
  
  const url = new URL(request.url)
  const route = routeFromUrl(url);
  if (route.length > 0 && route[0] === AUTH) {
    return new URL(`/.netlify/functions/auth`, request.url)
  }
  const endpoint: string = lookup[route.length as 0|1|2|3] ?? "";
  if (!endpoint) {
    return new Response("Not Found", {
      status: 404
    })
  }
  const search = new URLSearchParams();
  const [left="", uuid="", right=""] = route;

  if (route.length > 0) {
    if (!SENSING.has(left)) {
      return new Response("Not Found", {
        status: 404
      })
    }
    search.append('left', left);
  }
  if (route.length > 1) search.append('uuid', uuid);
  if (route.length > 2) {
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
