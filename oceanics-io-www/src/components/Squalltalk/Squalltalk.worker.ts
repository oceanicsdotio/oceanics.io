const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("oceanics-io-www-wasm");

/**
 * Runtime handle to which we will memoize the active runtime. 
 */
let runtime: ModuleType | null = null;
import type { FileSystem } from "../../shared";

/**
 * Global for reuse
 */
let parser: DOMParser | null = null;

/**
 * Retrieve remote file metadata and format it as a
 * serializable message. 
 *  Make HTTP request to S3 service for metadata about available
 * assets.
 * 
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker 
 */
async function getFileSystem(url: string): Promise<FileSystem> {
  if (!parser) parser = new DOMParser();

  const text = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache"
  }).then(response => response.text());

  const xmlDoc = parser.parseFromString(text, "text/xml");
  const [result] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  const nodes = Array.from(result.childNodes);
  const filter = (match: string) => (node: ChildNode) => 
    (node as unknown as {tagName: string}).tagName === match;

  const fileObject = (node: ChildNode) => Object({
    key: node.childNodes[0].textContent,
    updated: node.childNodes[1].textContent,
    size: node.childNodes[3].textContent,
  })
  const fileCollection = (node: ChildNode) => Object({
    key: node.childNodes[0].textContent
  })

  return { 
    objects: nodes.filter(filter("Contents")).map(fileObject), 
    collections: nodes.filter(filter("CommonPrefixes")).map(fileCollection)
  };
}

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
interface PointFeatureSource {
  type: "geojson";
  generateId: true;
  data: {
    type: "FeatureCollection";
    features: PointFeature[];
    properties?: object & {
      popupLocation: [number, number];
    };
  };
  attribution: "";
}
export interface PointFeatureChannel {
  id: string;
  type: "circle" | "symbol";
  source: string;
  paint?: any;
  layout?: {
    ["icon-image"]: string
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

type Vertex = [number, number, number?];
type VertexObject = {
  coordinates: Vertex;
}

/**
 * Average a vertex array down to a single point. Will
 * work with XYZ and or XY, assuming the Z=0.
 */

const vertexReducer = (length: number) =>
  ([x, y, z = 0]: Vertex, { coordinates: [Δx, Δy, Δz = 0] }: VertexObject) =>
    [
      x + Δx / length,
      y + Δy / length,
      z + Δz / length
    ]

const featureReducer = ({ features, lngLat: { lng, lat } }) => {
  
  features.map(({ geometry: { coordinates }, ...props }) => {
    while (Math.abs(lng - coordinates[0]) > 180)
      coordinates[0] += lng > coordinates[0] ? 360 : -360;
    return {
      ...props,
      coordinates,
    };
  })

};

/**
 * Out ready for MapBox as a Layer object description
 */
const pointFeatureCollection = ({
  features,
  properties
}: {
  features: PointFeature[];
  properties?: object;
}): PointFeatureSource => {
  // const popupLocation = features.reduce()

  return {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features,
      properties: {
        popupLocation: [0, 0],
        ...properties
      },
    },
    attribution: ""
  };
}

const userLocationSource = ({
  coordinates
}: UserLocation) => {
  return pointFeatureCollection({
    features: [pointFeature(...coordinates, {})]
  })
}
/**
 * Format the user location
 */
const userLocationChannel = ({
  iconImage
}: UserLocation): PointFeatureChannel => {
  return {
    id: "home",
    type: "symbol",
    source: "home",
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
        type: "source",
        data: ["home", userLocationSource(data.data as UserLocation)],
      });
      ctx.postMessage({
        type: "layer",
        data: userLocationChannel(data.data as UserLocation),
      });
      return;
    // Get object storage file system index
    case "storage":
      ctx.postMessage({
        type: "storage",
        data: await getFileSystem(data.data.url),
      });
      return
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
