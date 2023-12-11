const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("oceanics-io-www-wasm");

/**
 * Runtime handle to which we will memoize the active runtime. 
 */
let runtime: ModuleType | null = null;

/**
 * Import Rust-WASM runtime, and add a panic hook to give 
 * more informative error messages on failure. 
 * 
 * Using dynamic import this way with Webpack requires the path to be 
 * hard-coded, and not supplied as a variable:
 * https://stackoverflow.com/questions/42908116/webpack-critical-dependency-the-request-of-a-dependency-is-an-expression
 * https://github.com/wasm-tool/wasm-pack-plugin
 * 
 * We pass back the status and error message to the main
 * thread for troubleshooting.
 */
async function start() {
  runtime = await import("oceanics-io-www-wasm");
  runtime.panic_hook();
}

/**
 * Single Point Feature
 */
interface PointFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: object;
}
interface PointFeatureCollection {
  type: "geojson";
  generateId: true;
  data: {
    type: "FeatureCollection";
    features: PointFeature[];
    properties?: object;
  };
  attribution: "";
}
export interface PointFeatureChannel {
  id: string;
  type: "symbol";
  source: PointFeatureCollection;
  layout: {
    "icon-image": string;
  }
}
interface UserLocation {
  coordinates: [number, number];
  iconImage: string;
}


/**
 * Single point feature with coordinates 
 * and arbitrary properties.
 */
const pointFeature = (x: number, y: number, properties: object): PointFeature => Object({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [x, y]
  },
  properties
});


/**
 * Out ready for MapBox as a Layer object description
 */
const pointFeatureCollection = ({
  features,
  properties
}: {
  features: PointFeature[];
  properties?: object;
}): PointFeatureCollection => {
  return {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features,
      properties,
    },
    attribution: ""
  };
}

/**
 * Format the user location
 */
const userLocationChannel = ({
  coordinates,
  iconImage
}: UserLocation): PointFeatureChannel => {
  return {
    id: "home",
    type: "symbol",
    source: pointFeatureCollection({
      features: [pointFeature(...coordinates, {})]
    }),
    layout: {
      "icon-image": iconImage
    }
  };

}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
    // Start the worker
    case "start":
      await start();
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    // Respond with status
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    // Push a home layer
    case "home":
      ctx.postMessage({
        type: "render",
        data: userLocationChannel(data.data as UserLocation),
      });
      return;
    // Error on unspecified message type
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;

  }
})