import { Context, Config } from "@netlify/edge-functions";
import specification from "../../specification.json" assert { type: "json" };

const allowed = new Set([
  "Things",
  "Sensors",
  "Observations",
  "ObservedProperties",
  "FeaturesOfInterest",
  "HistoricalLocations",
  "Locations",
  "DataStreams"
]);

const lookup = {
  "/.netlify/functions/collection": "/{entity}",
  "/.netlify/functions/entity": "/{entity}({uuid})",
  "/.netlify/functions/index": "/",
  "/.netlify/functions/linked": "/{root}({rootId})/{entity}",
  "/.netlify/functions/topology": "/{root}({rootId})/{entity}({entityId})"
}

function err_response(message: string, status_code: number, details: string) {
  return {
    headers: {
      "Content-Type": "application/problem+json"
    },
    status_code,
    body: {
      message,
      details
    }
  }
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const query = url.searchParams;
  const left = query.get("left");
  const right = query.get("right");
  const method = request.method;
  const auth_header = request.headers.get("authorization");
  const no_auth_header = typeof auth_header === "undefined";
  const key = lookup[url.pathname];
  const path = specification.paths[key];
  const pathSpec = path[method.toLowerCase()];
  const [security] = pathSpec.security;
  let errors: string[] = []
  if (left && !allowed.has(left)) {
    return err_response("Not Found", 404, "Unknown Label")
  }
  if (right && !allowed.has(right)) {
    return err_response("Not Found", 404, "Unknown Label")
  }
  if (typeof pathSpec === "undefined") {
    return err_response("Invalid HTTP method", 405, "Not specified")
  }
  if (method === "POST" && !request.body) {
    return err_response("Bad request", 405, "Missing post body")
  }
  if (method === "OPTIONS" && no_auth_header) {
    return err_response("Unauthorized", 403, "Unauthorized")
  }
  if (typeof security === "undefined") {
    return err_response("Unauthorized", 403, "Missing security definition")
  }
  if ("BearerAuth" in security && no_auth_header) {
    return err_response("Unauthorized", 403, "Unauthorized")
  }
  console.log({
    errors,
    url
  })
  // Get the page content
  return context.next();
};

export const config: Config = {
  path: [
    "/.netlify/functions/collection", 
    "/.netlify/functions/entity",
    "/.netlify/functions/index",
    "/.netlify/functions/linked",
    "/.netlify/functions/topology",
  ],
};