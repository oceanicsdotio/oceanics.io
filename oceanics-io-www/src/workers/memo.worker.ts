import runtime from "oceanics-io-www-wasm";
const ctx: Worker = self as unknown as Worker;


/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
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