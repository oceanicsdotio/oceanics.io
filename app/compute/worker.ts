const ctx: Worker = self as unknown as Worker;
const Messages = {
  status: "status",
  error: "error"
};
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case Messages.status:
      ctx.postMessage({
        type: Messages.status,
        data: "ready",
      });
      return;
    default:
      ctx.postMessage({
        type: Messages.error,
        message: "unknown message format",
        data
      });
      return;
  }
}
ctx.addEventListener("message", handleMessage)
export { handleMessage }
