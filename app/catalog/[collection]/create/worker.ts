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
  const { panic_hook, createEntity } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  async function createAndPostMessage(query: any, body: string) {
    const result = await createEntity(access_token, query, body);
    postStatus(`Created 1`);
    return result
  }
  return {
    handlers: {
      createEntity: createAndPostMessage,
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