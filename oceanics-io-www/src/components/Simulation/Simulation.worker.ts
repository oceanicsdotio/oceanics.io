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

let particles: Uint8Array | null;
const ctx: Worker = self as unknown as Worker;

/**
 * Create vertex array buffer
 */
const initParticles = (res: number) => {
  if (!particles) {
    particles = new Uint8Array(Array.from(
      { length: res * res * 4 },
      () => Math.floor(Math.random() * 256)
    ))
  }
  return particles
}
/**
 * Known message types
 */
const MESSAGES = {
  status: "status",
  error: "error",
  texture: "texture"
}

const getJsonData = async (source: string) => {
  try {
    const response = await fetch(source);
    const metadata = await response.json();
    return {
      type: "init",
      data: {
        metadata
      }
    }
  } catch {
    return {
      type: MESSAGES.error,
      message: "metadata not available",
    }
  }
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
    case "init":
      ctx.postMessage(await getJsonData(data.data.metadata.source));
      return;
    case MESSAGES.texture:
      ctx.postMessage({
        type: MESSAGES.texture,
        data: ["screen", {
          data: new Uint8Array(data.data.width * data.data.height * 4),
          shape: [data.data.width, data.data.height],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: MESSAGES.texture,
        data: ["back", {
          data: new Uint8Array(data.data.width * data.data.height * 4),
          shape: [data.data.width, data.data.height],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: MESSAGES.texture,
        data: ["state", {
          data: initParticles(data.data.res),
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: MESSAGES.texture,
        data: ["previous", {
          data: initParticles(data.data.res),
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: "buffer",
        data: ["index", {
          data: new Float32Array(initParticles(data.data.res)),
          order: 2,
          name: "a_index"
        }],
      });
      ctx.postMessage({
        type: "buffer",
        data: ["quad", {
          name: "a_pos",
          data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
          order: 1
        }],
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