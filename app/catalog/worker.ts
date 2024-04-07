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
 * Transformation of database index is much easy in JS
 */
function transformIndex ({ name: left }: {name: string}) {
  const key = left
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  const href = `/catalog/${key}`;
  const content = left.split(/\.?(?=[A-Z])/).join(" ");
  return {
    left,
    href,
    content
  }
}
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
  const { panic_hook, getIndex, getCollection, getEntity, createEntity, deleteEntity } = await import("@oceanics/app");
  panic_hook();
  return {
    handlers: {
      getIndex: async () => {
        const result = await getIndex(access_token);
        const index = result.map(transformIndex)
        return {
          index,
          mobile: MOBILE
        }
      },
      getCollection: getCollection.bind(undefined, access_token),
      getCount: async (message: {left:  string}) => {
        const result = await getCollection(access_token, message);
        return {
          count: result["@iot.count"],
          left: message.left
        }
      },
      getEntity: getEntity.bind(undefined, access_token),
      createEntity: createEntity.bind(undefined, access_token),
      deleteEntity: deleteEntity.bind(undefined, access_token)
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
    const data = await handler(message.data.data);
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
