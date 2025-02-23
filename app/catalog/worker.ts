// Convenience method for updating frontend status
// as seen by the end user.
const status = (message: string) => {
  self.postMessage({
    type: "status",
    data: {
      message
    }
  })
}
// Convenience method for posting error message
// to the frontend. Conditional handling may apply.
export const postError = (message: string) => {
  self.postMessage({
    type: "error",
    data: {
      message
    }
  })
}
function validateAndGetAccessToken(message: MessageEvent) {
  status(`Validating`);
  if (!message.data || !message.data.data) {
    postError("Invalid message format");
    return null;
  }
  const { data: { user } } = message.data;
  if (typeof user === "undefined" || !user) {
    postError("Missing user data")
    return null
  }
  let userData: any;
  try {
    userData = JSON.parse(user);
  } catch {
    postError("Invalid user data");
    return null
  }
  const { token: { access_token = null } } = userData;
  if (!access_token) {
    postError("Missing access token")
    return null
  }
  return access_token
}
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
