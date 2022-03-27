/**
 * Cloud function version of API
 */
import type { Handler } from "@netlify/functions";
import { connect, tokenClaim, parseFunctionsPath } from "./shared/driver";
import { catchAll } from "./shared/middleware";
import { Node, Links } from "./shared/pkg/oceanics_io_wasm";

/**
 * Connect two nodes.
 */
const join = async (left: Node, right: Node, label: string) => {
  await connect((new Links(label)).join(left, right).query);
  return {
    statusCode: 204
  }
}

/**
 * Drop connection between nodes. 
 */
const drop = async (left: Node, right: Node) => {
  await connect((new Links()).drop(left, right).query);
  return {
    statusCode: 204
  }
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.
 
 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
export const handler: Handler = async ({ headers, httpMethod, ...rest }) => {

  let user: Node;
  try {
    const auth = headers["authorization"]
    const token = auth.split(":").pop();
    user = tokenClaim(token, process.env.SIGNING_KEY)
  } catch {
    return {
      statusCode: 403,
      data: { message: "Unauthorized" }
    }
  }

  const [left, right] = parseFunctionsPath({ httpMethod, ...rest })

  switch (httpMethod) {
    case "POST":
      return catchAll(join)(left, right, "Join")
    case "DELETE":
      return catchAll(drop)(left, right)
    case "OPTIONS":
      return {
        statusCode: 204,
        headers: { "Allow": "OPTIONS,GET,POST,DELETE" }
      }
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Invalid HTTP Method" }),
        headers: { "Content-Type": "application/json" }
      }
  }
}
