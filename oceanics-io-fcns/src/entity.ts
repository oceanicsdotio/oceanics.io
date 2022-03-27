/**
 * Cloud function version of API
 */
import type { Handler } from "@netlify/functions";
import { connect, tokenClaim, parseFunctionsPath, transform } from "./shared/driver";
import { catchAll } from "./shared/middleware";
import { Node, Links } from "./shared/pkg/oceanics_io_wasm";


/**
 * Create some nodes, usually one, within the graph. This will
 * automatically be attached to User and Provider nodes (internal).
 * 
 * Blank and null values are ignored, and will not overwrite existing
 * properties. This implies that once a property is set once, it cannot
 * be "unset" without special handling. 
 * 
 * Location data receives additional processing logic internally.
 */
const create = async (left: Node, right: Node) => {
  const cypher = (new Links("Create", 0, 0, "")).insert(left, right)
  await connect(cypher.query)
  return { statusCode: 204 }
}

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * 
 * by any single property. 
 */
const metadata = async (left: Node, right: Node) => {
  const { query } = (new Links()).query(left, right, right.symbol);
  const value = transform((await connect(query))).map(node => node[1]);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@iot.count": value.length,
      value,
    })
  }
}

/**
 * Delete a pattern from the graph. Be careful, this can
 * remove all nodes matching the pattern. We usually restrict
 * to a pattern with an indexed/unique property when called
 * through the API to prevent unintentional data loss. 
 * 
 * The underlying query explicitly forbids dropping `Providers`
 * labels
 * 
 */
const remove = async (left: Node, right: Node) => {
  const link = new Links();
  const { query } = link.deleteChild(left, right);
  await connect(query)
  return {
    statusCode: 204
  }
}

export const handler: Handler = async ({ headers, httpMethod, ...rest }) => {

  let user: Node;
  try {
    const auth = headers["authorization"]
    const token = auth.split(":").pop();
    user = tokenClaim(token, process.env.SIGNING_KEY)
  } catch {
    return {
      statusCode: 403,
      body: { message: "Unauthorized" }
    }
  }

  const nodes = parseFunctionsPath({ httpMethod, ...rest })

  switch (httpMethod) {
    case "GET":
      return catchAll(metadata)(user, nodes[0])
    case "POST":
      return catchAll(create)(user, nodes[0])
    case "DELETE":
      return catchAll(remove)(user, nodes[0]);
    case "OPTIONS":
      return {
        statusCode: 204,
        headers: { "Allow": "OPTIONS,GET,POST,PUT,DELETE" }
      }
    default:
      return {
        statusCode: 405,
        data: { message: "Invalid HTTP Method" }
      }
  }
}
