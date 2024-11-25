import { postError } from "@catalog/worker";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const { data: { user, query }, type } = message.data;
  if (typeof user === "undefined") {
    postError(`worker missing user data: ${JSON.stringify(message)}`);
    return;
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    postError(`worker missing access token`);
    return
  }
  if (type !== "getCollection") {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${type}`
    });
    return
  }
  const { panic_hook, getCollection } = await import("@oceanics/app");
  try {
    panic_hook();
    const result = await getCollection(access_token, query);
    self.postMessage({
      type: "status",
      data: `Found ${result.value.length}`
    });
    self.postMessage({
      type,
      data: result
    });
  } catch (error: any) {
    postError(error.message);
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
