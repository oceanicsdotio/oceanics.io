import { Node } from "oceanics-io-api-wasm";
import apiSpec from "./shared/bathysphere.json";
import { 
  connect, 
  NetlifyRouter, 
  ApiHandler, 
  READ_ONLY, 
  recordsToUniqueRoutes 
} from "./shared/middleware";

/**
 * Get an array of all collections by Node type
 */
const index: ApiHandler = async () => {
  const { query } = Node.allLabels();
  const queryResult = await connect(query, READ_ONLY);
  return {
    statusCode: 200,
    data: recordsToUniqueRoutes(queryResult)
  };
}

// HTTP method router
export const handler = NetlifyRouter({
  GET: index
}, apiSpec.paths["/"])
