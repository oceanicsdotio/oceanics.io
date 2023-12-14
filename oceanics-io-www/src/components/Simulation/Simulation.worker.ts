/**
 * Get image data from S3, the Blob-y way. 
 */
export const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
  const blob = await fetch(url).then(response => response.blob());
  const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.readAsArrayBuffer(blob);
  }));
  if (arrayBuffer instanceof ArrayBuffer) {
    return new Float32Array(arrayBuffer);
  } else {
    throw TypeError("Result is not ArrayBuffer type")
  }
}

/**
 * Create vertex array buffer
 */
export async function initParticles(res: number) {
  return new Uint8Array(Array.from(
    { length: res * res * 4 },
    () => Math.floor(Math.random() * 256)
  ))
}

const ctx: Worker = self as unknown as Worker;

/**
 * Known message types
 */
const MESSAGES = {
  status: "status",
  error: "load",
  reduce: "reduce"
}


/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case MESSAGES.status:
      ctx.postMessage({
        type: MESSAGES.status,
        data: "ready",
      });
      return;
    default:
      ctx.postMessage({
        type: MESSAGES.error,
        message: "unknown message format",
        data
      });
      return;
  }
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", handleMessage)

// Trick into being a module and for testing
export { handleMessage }