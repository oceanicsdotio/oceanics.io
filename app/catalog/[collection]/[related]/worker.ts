import { postError, status, validateAndGetAccessToken } from "@catalog/worker";

async function listen(message: MessageEvent) {
  const accessToken = validateAndGetAccessToken(message);
    if (!accessToken) {
      return;
    }
  if (message.data.type !== "getLinked") {
    postError(`unknown message format: ${message.data.type}`);
    return
  }
  const { data: { user, query } } = message.data;
  if (typeof user === "undefined") {
    postError(`worker missing user data: ${JSON.stringify(message)}`);
    return
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    postError(`worker missing access token`);
    return
  }
  const { panic_hook, getLinked } = await import("@oceanics/app");
  panic_hook();
  const result = await getLinked(access_token, query);
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