import {status, postError, validateAndGetAccessToken} from "@catalog/worker";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const { data: { user, query, body }, type } = message.data;
  if (typeof user === "undefined") {
    postError(`worker missing user data: ${JSON.stringify(message)}`)
    return
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    postError(`worker missing access token`);
    return
  }
  switch (type) {
    case "getEntity":
      const { getEntity } = await import("@oceanics/app");
      const getEntityResult = await getEntity(access_token, query);
      status(`Found ${getEntityResult.value.length}`);
      if (getEntityResult.value.length === 1) {
        self.postMessage({
          type,
          data: {
            value: getEntityResult.value[0]
          }
        })
      }
      return;
    case "updateEntity":
      const { updateEntity } = await import("@oceanics/app");
      const updated = await updateEntity(access_token, query, body);
      if (updated) {
        status(`Updated 1`);
      }
      return;
    case "deleteEntity":
      const { deleteEntity } = await import("@oceanics/app");
      const deleted = await deleteEntity(access_token, query);
      if (deleted) {
        status(`Deleted 1`);
      }
      return;
    default:
      postError(`unknown message format: ${message.data.type}`);
      return;
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
export {}