// Message passing enum
import { MESSAGES } from "./useSimulation";

// Force module to know it's a Web Worker
const ctx: Worker = self as unknown as Worker;

// Memoize to send twice
let particles: Uint8Array | null;

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
 * Create vertex array buffer that will be passed back to
 * create a texture.
 */
const _particles = (res?: number) => {
  if (!particles) {
    if (typeof res === "undefined") throw Error("No resolution given on first")
    particles = new Uint8Array(Array.from(
      { length: res * res * 4 },
      () => Math.floor(Math.random() * 256)
    ))
  }
  return particles
}


const getJsonData = async (source: string) => {
  try {
    const response = await fetch(source);
    const metadata = await response.json();
    return {
      type: "init",
      data: {
        u_screen: ["i", 2],
        u_opacity: ["f", opacity],
        u_wind: ["i", 0],
        u_particles: ["i", 1],
        u_color_ramp: ["i", 2],
        u_particles_res: ["f", res],
        u_point_size: ["f", pointSize],
        u_wind_max: ["f", [metadata.u.max, metadata.v.max]],
        u_wind_min: ["f", [metadata.u.min, metadata.v.min]],
        speed: ["f", speed],
        diffusivity: ["f", diffusivity],
        drop: ["f", drop],
        seed: ["f", Math.random()],
        u_wind_res: ["f", [ref.current.width, ref.current.height]],
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
          data: _particles(data.data.res),
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: MESSAGES.texture,
        data: ["previous", {
          data: _particles(data.data.res),
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        }],
      });
      ctx.postMessage({
        type: MESSAGES.attribute,
        data: ["index", {
          data: new Float32Array(_particles(data.data.res)),
          order: 2,
          name: "a_index"
        }],
      });
      ctx.postMessage({
        type: MESSAGES.attribute,
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