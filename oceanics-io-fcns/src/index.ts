import { connect, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import { Node } from "./shared/pkg";

// Convenience methods for chaining
const restricted = new Set(["Provider", "User"]);
const extractLabel = ({ _fields: [label] }) => label;
const filterLabels = ({label}) => !restricted.has(label);
const uniqueLabels = ({records}) => records.flatMap(extractLabel).filter(filterLabels);

/**
 * Get an array of all collections by Node type
 */
const index: ApiHandler = async () => {
  const labels = await connect(Node.allLabels().query, uniqueLabels);
  return {
    statusCode: 200,
    data: labels.map((label: string) => Object({
      name: label,
      url: `/api/${label}`
    }))
  };
}

// HTTP Router
export const handler = NetlifyRouter({
  GET: index
})
