// Message passing enum
import { MESSAGES } from "./useSimulation";

// Force module to know it's a Web Worker
const ctx: Worker = self as unknown as Worker;

// Memoize to send twice
let particles: Uint8Array | null;

// import { VertexArray } from "oceanics-io-www-wasm";
// const ENCODER_RADIX = 36;
// const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
// const MAX_FRAGMENTS = null;  // practical limitation for testing
// const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;


// Custom serializer for JSON that emits a fixed precision for numeric types
const withPrecision = (precision: number) =>
  function(key: number|string, val: number) {
      if (isNaN(+key)) return val;
      return val.toFixed ? Number(val.toFixed(precision)) : val;
  }

// Convert CSV to single-precision Array
const fromCsvString = (csvString: string, rows: [number, number], columns: [number, number]) => {

  const reduceLine = (acc: number[], line: string) => {
      const newItem = line
          .split(",")
          .slice(...columns)
          .map(x => parseFloat(x.trim()))
      return acc.concat(newItem)
  }

  // Lazy load lines
  const numerical = function*() {
      yield* csvString.split("\r\n").slice(...rows).reduce(reduceLine, []);
  }();
  return new Float32Array(numerical);
}

type Variable = {
  offset: number,
  size: number,
  name: string
}

const readVariables = (text: string) => {
  const {variables} = JSON.parse(text);
  const keys = {"lon": 0, "lat": 1, "h": 2};
  return variables.filter(({name}: {name: string}) => name in keys);
}

const fromNetcdfBytes = async (
  // key: string, 
  delta: number, 
  // [start, end]: [number, number], 
  // {offset, size, name}: Variable
) => {
  const width = 4;
  const copy = new ArrayBuffer((delta) * width);
  // const dv = new DataView(copy);

  // const range = `bytes=${offset+start*width}-${offset+end*width*4}`

  // const view = new DataView((await s3.getObject({
  //     Bucket: process.env.BUCKET_NAME,
  //     Key: key,
  //     Range: range
  // }).promise()).Body.buffer);

  // for (let ii = 0; ii < (delta-1); ii++) {
  //     const value = view.getFloat32(ii * width, false);
  //     const index = (ii * 3 + keys[name]) * width;
  //     dv.setFloat32(index, value, true);  // swap endianness
  // }
  return new Float32Array(copy);
}

// Transform to pass into retrieve()
const transformCsv = (text: string) => {
  const result = text.split("\n")
      .slice() // copy to prevent readable body disappearing
      .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
  return JSON.stringify(result)
}
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
    // const response = await fetch(source);
    // const metadata = await response.json();
    return {
      type: "init",
      data: {
        source
        // u_screen: ["i", 2],
        // u_opacity: ["f", opacity],
        // u_wind: ["i", 0],
        // u_particles: ["i", 1],
        // u_color_ramp: ["i", 2],
        // u_particles_res: ["f", res],
        // u_point_size: ["f", pointSize],
        // u_wind_max: ["f", [metadata.u.max, metadata.v.max]],
        // u_wind_min: ["f", [metadata.u.min, metadata.v.min]],
        // speed: ["f", speed],
        // diffusivity: ["f", diffusivity],
        // drop: ["f", drop],
        // seed: ["f", Math.random()],
        // u_wind_res: ["f", [ref.current.width, ref.current.height]],
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