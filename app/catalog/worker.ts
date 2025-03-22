// Convenience method for updating frontend status
import { status, postError, validateAndGetAccessToken } from "./worker-utils";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  try {
    const accessToken = validateAndGetAccessToken(message);
    if (!accessToken) {
      return;
    }
    if (message.data.type !== "getIndex") {
      postError(`Unknown message type: ${message.data.type}`);
      return;
    }
    status(`Working`);
    const { panic_hook, getIndex } = await import("@oceanics/app");
    panic_hook();
    const result = await getIndex(accessToken);
    status(`Found ${result.length} collections`);
    self.postMessage({
      type: message.data.type,
      data: result
    });
  } catch (error: any) {
    postError(`Unexpected error: ${error.message}`);
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", (event) => {
  try {
    listen(event);
  } catch (error: any) {
    postError(`Failed to process message: ${error.message}`);
  }
});
export {}
