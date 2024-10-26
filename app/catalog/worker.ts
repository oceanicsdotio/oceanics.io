type ModuleType = typeof import("@oceanics/app");
type WorkerCache = {
  handlers: { [key: string]: Function },
};
let CACHE: WorkerCache | null = null;
const MOBILE = Boolean(
  navigator.userAgent.match(
    /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
  )
);
/**
 * Only perform startup routine once
 */
async function startup(message: MessageEvent){
  const { data: {user} } = message.data;
  if (typeof user === "undefined") {
    throw Error(`worker missing user data: ${JSON.stringify(message)}`)
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    throw Error(`worker missing access token`)
  }
  const { panic_hook, getIndex, getCollection, getEntity, createEntity, deleteEntity, getLinked } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  return {
    handlers: {
      getIndex: getIndex.bind(undefined, access_token),
      getCollection: getCollection.bind(undefined, access_token),
      getLinked: getLinked.bind(undefined, access_token),
      getEntity: getEntity.bind(undefined, access_token),
      createEntity: createEntity.bind(undefined, access_token),
      deleteEntity: async (query: any) => {
        const result = await deleteEntity(access_token, query)
        return {
          success: result,
          uuid: query.left_uuid
        }
      }
    }
  }
}
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  if (!CACHE) {
    try {
      CACHE = await startup(message);
    } catch (error: any) {
      self.postMessage({
        type: "error",
        data: error.message
      });
      return
    }
  }
  const { handlers: { [message.data.type]: handler = null } } = CACHE as WorkerCache;
  if (!handler) {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${message.data.type}`
    });
    return
  }
  try {
    const data = await handler(message.data.data.query, message.data.data.body);
    self.postMessage({
      type: message.data.type,
      data
    });
  } catch (error: any) {
    self.postMessage({
      type: "error",
      data: error.message
    });
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
