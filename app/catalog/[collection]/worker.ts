import { postError, validateAndGetAccessToken, status } from "@catalog/worker-utils";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const accessToken = validateAndGetAccessToken(message);
  if (!accessToken) {
    return;
  }
  const type = message.data.type;
  if (type !== "getCollection") {
    postError(`unknown message format: ${type}`);
    return
  }
  const { panic_hook, getCollection } = await import("@oceanics/app");
  try {
    panic_hook();
    const query = message.data.data.query;
    const result = await getCollection(accessToken, query);
    status(`Found ${result.value.length}`);
    self.postMessage({
      type,
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      postError(error.message);
    }
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
/**
 * Allow duplicate names in namespace
 */ 
export {}
