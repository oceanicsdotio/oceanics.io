import { connect, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import { Node } from "oceanics-io-api-wasm";
import apiSpec from "./shared/bathysphere.json";

// Convenience methods for chaining
const restricted = new Set(["Provider", "User"]);
const extractLabel = ({ _fields: [label] }) => label;
const filterLabels = (label: string) => !restricted.has(label);
const uniqueLabels = ({records}) => records.flatMap(extractLabel).filter(filterLabels);

/**
 * Get an array of all collections by Node type
 */
const index: ApiHandler = async () => {
  const filteredLabels = await connect(Node.allLabels().query).then(uniqueLabels);
  return {
    statusCode: 200,
    data: filteredLabels.map((label: string) => Object({
      name: label,
      url: `/api/${label}`
    }))
  };
}

// HTTP Router
export const handler = NetlifyRouter({
  GET: index
}, apiSpec.paths["/"])
