const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("@oceanics/app");

let runtime: ModuleType;
async function start() {
  runtime = await import("@oceanics/app");
  runtime.panic_hook();
}

let cache: any[];
const getDocuments = async (documents: any[]) => {
  cache = documents;
  return cache;
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "start":
      await start();
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "post":
      ctx.postMessage({
        type: "documents",
        data: await getDocuments(data.source),
      });
      return;
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;
  }
})

export {}