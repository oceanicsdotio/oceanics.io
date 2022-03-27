/**
 * Cloud function version of API
 */
import type { Handler } from "@netlify/functions";
import { connect, tokenClaim } from "./shared/driver";
import { catchAll } from "./shared/middleware";
import { Node } from "./shared/pkg/oceanics_io_wasm";

/**
 * Get an array of all collections by Node type
 */
const index = async () => {

  const { query } = Node.allLabels();
  const { records } = await connect(query);
  const restricted = new Set(["Provider", "User"]);
  //@ts-ignore
  const fields = new Set(records.flatMap(({ _fields: [label] }) => label)
    .filter(label => !restricted.has(label)));

  return {
    statusCode: 200,
    data: [...fields].map((label: string) => Object({
      name: label,
      url: `/api/${label}`
    }))
  };
}

export const handler: Handler = async ({ headers, httpMethod }) => {

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

  switch (httpMethod) {
    case "GET":
      return catchAll(index)();
    case "OPTIONS":
      return {
        statusCode: 204,
        headers: { "Allow": "OPTIONS,GET" }
      }
    default:
      return {
        statusCode: 405,
        body: { message: "Invalid HTTP Method" }
      }
  }
}
