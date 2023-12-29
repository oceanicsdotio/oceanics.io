const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("oceanics-io-www-wasm");
import { Memo } from "oceanics-io-www-wasm";

let runtime: ModuleType;
async function start() {
  runtime = await import("oceanics-io-www-wasm");
  runtime.panic_hook();
}

let cache: Memo[];
const getDocuments = async (documents: Memo[]) => {
  cache = documents.map(each => new Memo(each));
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