let postStatus = (message: string) => {
  self.postMessage({
    type: "status",
    data: {
      message
    }
  })
}
async function listen(message: MessageEvent) {
  if (message.data.type !== "getLinked") {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${message.data.type}`
    });
    return
  }
  const { data: { user, query } } = message.data;
  if (typeof user === "undefined") {
    throw Error(`worker missing user data: ${JSON.stringify(message)}`)
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    throw Error(`worker missing access token`)
  }
  const { panic_hook, getLinked } = await import("@oceanics/app");
  panic_hook();
  const result = await getLinked(access_token, query);
  postStatus(`Found ${result.value.length}`);
  if (!result.page.next) result.page.next = undefined
  if (!result.page.previous) result.page.previous = undefined
  self.postMessage({
    type: message.data.type,
    data: result
  });
}
self.addEventListener("message", listen);

export {}