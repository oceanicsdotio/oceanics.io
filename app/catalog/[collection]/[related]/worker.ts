import { postError, status, validateAndGetAccessToken } from "@catalog/worker";
/**
 * The worker processes messages from the main thread,
 * related to topological queries needed to build a graph
 * visualization and exploration tool, similar to the features
 * of neo4j console, but without a global view of all data.
 * 
 * This includes retrieving the root node, and all linked nodes.
 */
async function listen(message: MessageEvent) {
  const accessToken = validateAndGetAccessToken(message);
  if (!accessToken) {
    return;
  }
  if (message.data.type !== "getLinked") {
    postError(`unknown message format: ${message.data.type}`);
    return
  }
  const { data: { query } } = message.data;
  const { panic_hook, getLinked } = await import("@oceanics/app");
  panic_hook();
  const result = await getLinked(accessToken, query);
  status(`Found ${result.value.length}`);
  if (!result.page.next) result.page.next = undefined
  if (!result.page.previous) result.page.previous = undefined
  self.postMessage({
    type: message.data.type,
    data: result
  });
}
self.addEventListener("message", listen);

export {}