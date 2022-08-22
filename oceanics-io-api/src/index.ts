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

/**
 * Initialize the database
 */
const configure: ApiHandler = async () => {
  return {
    statusCode: 204
  }
}

// HTTP method router
export const handler = NetlifyRouter({
  GET: index,
  POST: configure
}, apiSpec.paths["/"])
