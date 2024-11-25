type WorkerCache = {
  handlers: { [key: string]: Function },
};
let CACHE: WorkerCache | null = null;
let postStatus = (message: string) => {
  self.postMessage({
    type: "status",
    data: {
      message
    }
  })
}
/**
 * Only perform startup routine once
 */
async function startup(message: MessageEvent) {
  const { data: { user } } = message.data;
  if (typeof user === "undefined") {
    throw Error(`worker missing user data: ${JSON.stringify(message)}`)
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    throw Error(`worker missing access token`)
  }
  const { panic_hook, getCollection, getLinked } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  async function getCollectionAndTransform(query: any) {
    const result = await getCollection(access_token, query);
    postStatus(`Found ${result.value.length}`);
    if (!result.page.next) result.page.next = undefined
    if (!result.page.previous) result.page.previous = undefined
    return result
  }
  return {
    handlers: {
      getCollection: getCollectionAndTransform,
      getLinked: getLinked.bind(undefined, access_token)
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
    postStatus(`Ready`);
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
    const result = await handler(message.data.data.query, message.data.data.body);
    self.postMessage({
      type: message.data.type,
      data: result
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

export {}