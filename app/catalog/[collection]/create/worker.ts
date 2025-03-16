import {status, validateAndGetAccessToken, postError} from "@catalog/worker";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const accessToken = validateAndGetAccessToken(message);
  if (!accessToken) {
    return;
  }
  if (message.data.type !== "createEntity") {
    postError(`unknown message format: ${message.data.type}`);
    return
  }
  const { data: { query, body } } = message.data;
  const { panic_hook, createEntity } = await import("@oceanics/app");
  panic_hook();
  const result = await createEntity(accessToken, query, body);
  status(`Created 1`);
  self.postMessage({
    type: message.data.type,
    data: result
  });
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);

export {}