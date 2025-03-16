import {status, postError, validateAndGetAccessToken} from "@catalog/worker";
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const accessToken = await validateAndGetAccessToken(message);
  if (!accessToken) {
    return;
  }
  const { data: { query, body }, type } = message.data;
  switch (type) {
    case "getEntity": {
      const { getEntity } = await import("@oceanics/app");
      const getEntityResult = await getEntity(accessToken, query);
      status(`Found ${getEntityResult.value.length}`);
      if (getEntityResult.value.length === 1) {
        self.postMessage({
          type,
          data: {
            value: getEntityResult.value[0]
          }
        })
      }
      break;
    }
    case "updateEntity": {
      const { updateEntity } = await import("@oceanics/app");
      const updated = await updateEntity(accessToken, query, body);
      if (updated) {
        status(`Updated 1`);
      }
      break;
    }
    case "deleteEntity": {
      const { deleteEntity } = await import("@oceanics/app");
      const deleted = await deleteEntity(accessToken, query);
      if (deleted) {
        status(`Deleted 1`);
      }
      break;
    }
    default:
      postError(`unknown message format: ${message.data.type}`);
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
export {}