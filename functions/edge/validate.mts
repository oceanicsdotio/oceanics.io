import { Context, Config } from "@netlify/edge-functions";
import specification from "../../specification.json" assert { type: "json" };

const allowed = new Set([
  "DataStreams",
  "FeaturesOfInterest",
  "HistoricalLocations",
  "Locations",
  "Observations",
  "ObservedProperties",
  "Sensors",
  "Things"
]);

const lookup = {
  "/.netlify/functions/collection": "/{entity}",
  "/.netlify/functions/entity": "/{entity}({uuid})",
  "/.netlify/functions/index": "/",
  "/.netlify/functions/linked": "/{root}({rootId})/{entity}",
  "/.netlify/functions/topology": "/{root}({rootId})/{entity}({uuid})"
}

function err_response(message: string, status_code: number, details: string) {
  let body = JSON.stringify({
    message,
    details
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/problem+json"
    },
    status: status_code,
    statusText: message
  })
}

function opt_response(options: string[]) {
  const lower = ["options", ...options] as string[];
  const allow = lower.map((each: string)=>each.toUpperCase()).sort();
  return new Response(null, {
    status: 204,
    statusText: "OK",
    headers: {
      "allow": allow.join(",")
    }
  })
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
  if (left && !allowed.has(left)) {
    return err_response("Not Found", 404, "Unknown Label")
  }
  if (right && !allowed.has(right)) {
    return err_response("Not Found", 404, "Unknown Label")
  }
  if (method === "OPTIONS") {
    return opt_response(Object.keys(path))
  }
  const pathSpec = path[method.toLowerCase()];
  const [security] = pathSpec.security;
  if (typeof pathSpec === "undefined") {
    return err_response("Invalid HTTP method", 405, "Not specified")
  }
  if (method === "POST" && !request.body) {
    return err_response("Bad request", 405, "Missing post body")
  }
  if (typeof security === "undefined") {
    return err_response("Unauthorized", 403, "Missing security definition")
  }
  if ("BearerAuth" in security && no_auth_header) {
    return err_response("Unauthorized", 403, "Missing authorization header")
  }
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