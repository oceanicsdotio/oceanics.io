import SwaggerParser from "@apidevtools/swagger-parser";
import { DOMParser } from "@xmldom/xmldom";

import type {Property, Method, Operation, Properties, FieldType, FileObject, FileSystem } from "./useCatalog";
const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("@oceanics/app");

interface Methods {
  [index: string]: Method;
}
interface Paths {
    [index: string]: Methods;
  }
// Human readable name for body props and parameters
const nameToId = (name: string): string => 
    name.split(/([A-Z][a-z]+)/)
        .filter((word: string) => word)
        .map((word: string) => word.toLowerCase())
        .join(" ")

// HTMLInputElement type
type InputTypes = "text" | "number" | "email" | "password";
const convertType = (name: string, {type}: Property): InputTypes | null => {
    if (name === "password") {
        return "password"
    } else if (name === "email") {
        return "email"
    }
    if (type === "string") {
        return "text"
    } else if (type === "integer") {
        return "number"
    } else {
        console.warn(`Skipping unsupported type:`, type);
        return null
    }
};

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 * 
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces. 
 */
const propertyToInput = (
    [name, property]: [string, Property]
): FieldType | null  => {
    const id = nameToId(name);
    const type = convertType(name, property);
    if (type) return { ...property, id, type, }
    console.warn(`Skipping unknown format (${id}):`, property);
    return null
}

// Transform from an OpenApi path into an Operation
const methodToOperation = (
    path: string,
    method: string,
    {
        requestBody,
        parameters=[],
        ...props
    }: Method
): Operation => {
    let body: FieldType[] = [];
    if (typeof requestBody !== "undefined") {
        const {schema} = requestBody.content["application/json"];
        const properties = (typeof schema.oneOf === "undefined") ? schema.properties : schema.oneOf[0];

        const _body: [string, Property][] = Object.entries(properties as Properties).flatMap(([name, property]: [string, Property]) => {
            let value = property;
            while (typeof value.items !== "undefined") value = value.items;
            if (typeof value.properties !== "undefined") {
                return Object.entries(value.properties);
            } else {
                return [[name, value]]
            }
        })
        body = _body.map(propertyToInput).filter(param => param) as FieldType[];
    }
    const _parameters: FieldType[] = parameters.map(
        ({ name, schema }) => propertyToInput([name, schema])
    ).filter(param => param) as FieldType[];

    return {
        path,
        method,
        requestBody: body,
        parameters: _parameters,
        ...props
    }
}

/**
 * Builds the form structure from the paths in the specification.
 * 
 * Need to:
 * - Remove read only properties
 * - Flatten the route and method pairs to be filtered and converted to UI features
 */
const load = async (src: string) => {
    const {info, paths} = await SwaggerParser.dereference(src);
    const operations = Object.entries(paths as Paths).flatMap(([path, methods]) => 
        Object.entries(methods as Methods).map(([method, operation]) => 
            methodToOperation(path, method, operation)));
    return {
        info,
        operations
    }
}


// Possible types of message
const COMMANDS = {
  // Signal fatal error
  error: "error",
  // Parse geolocation re-post as source
  home: "home",
  // Sending a data source to MapBox
  source: "source",
  // Signal from `useWorker()` hook 
  start: "start",
  // Respond with Worker status
  status: "status",
  // Get object storage index
  storage: "storage",
  // Sending a layer style to MapBox
  layer: "layer",
  // Get object storage buffer
  fragment: "fragment",
  load: "load"
}

/**
 * Runtime handle to which we will memoize the active runtime. 
 */
let runtime: ModuleType | null = null;
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
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache"
  })
  const text = await response.text();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const [{childNodes}] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  const nodes: FileObject[] = Array.from(childNodes)
    .map((node) => {
      return {
        key: node.childNodes[0]?.textContent ?? "",
        updated: node.childNodes[1]?.textContent ?? "",
        size: parseInt(node.childNodes[3]?.textContent ?? "0"),
      }
    });
  return {
    objects: nodes.filter((node: FileObject) => node.size > 0)
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
  runtime = await import("@oceanics/app");
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
export const vertexReducer = (length: number) =>
  ([x, y, z = 0]: Vertex, { coordinates: [Δx, Δy, Δz = 0] }: VertexObject) =>
    [
      x + Δx / length,
      y + Δy / length,
      z + Δz / length
    ]

// const featureReducer = ({ features, lngLat: { lng, lat } }) => {
//   features.map(({ geometry: { coordinates }, ...props }) => {
//     while (Math.abs(lng - coordinates[0]) > 180)
//       coordinates[0] += lng > coordinates[0] ? 360 : -360;
//     return {
//       ...props,
//       coordinates,
//     };
//   })
// };

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
 * Max regional ocean depth for bthymetry rendering
 */
const MAX_VALUE = 5200;

/**
 * Get rid of the junk
 */
const cleanAndParse = (text: string): string[] =>
  text.replace("and", ",")
    .replace(";", ",")
    .split(",")
    .map(each => each.trim());

type IEsri = {
  geometry: {
    x: number;
    y: number;
  },
  attributes: object;
}
type INoaa = {
  data: [object];
  metadata: {
    lon: number;
    lat: number;
  } & object;
}
type PointFeatureResult = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: object
}
/**
 * Single point feature with coordinates 
 * and arbitrary properties.
 */
const PointFeature = (x: number, y: number, properties: object): PointFeatureResult => Object({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [x, y]
  },
  properties
});

type IGeoJsonSource = {
  features: (PointFeatureResult | IEsri | INoaa)[];
  standard?: string;
  properties?: object;
};

/**
 * Out ready for MapBox as a Layer object description
 */
const GeoJsonSource = ({
  features,
  standard,
  properties
}: IGeoJsonSource) => {
  let parsed: PointFeatureResult[];

  if (standard === "noaa") {
    parsed = (features as INoaa[])
      .filter(x => "data" in x && "metadata" in x)
      .map(({
        data: [head],
        metadata: { lon, lat, ...metadata }
      }) => PointFeature(lon, lat, { ...head, ...metadata }))
  } else if (standard === "esri") {
    parsed = (features as IEsri[])
      .filter(x => !!x)
      .map(({
        geometry: { x, y },
        attributes
      }) => PointFeature(x, y, attributes))
  } else {
    parsed = (features as PointFeatureResult[])
      .filter(x => !!x)
  }
  return {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: parsed,
      properties,
    },
    attribution: ""
  };
}

/**
 * Log normal density function for color mapping
 */
const logNormal = (x: number, m = 0, s = 1.0): number =>
  (1 / s / x / Math.sqrt(2 * Math.PI) * Math.exp(-1 * (Math.log(x) - m) ** 2 / (2 * s ** 2)));

/**
 * Retrieve a piece of a vertex array buffer from object storage.
 */
const getFragment = async (target: string, key: string) => {
  const url = `${target}/${key}`;
  const blob = await fetch(url).then(response => response.blob());
  const arrayBuffer: ArrayBuffer | string | null = await (new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result) };
    reader.readAsArrayBuffer(blob);
  }));
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw TypeError("Expected ArrayBuffer type")
  }
  const features: any[] = [];
  // const dataView = new Float32Array(arrayBuffer);
  // const [features] = dataView.reduce(([features, count]: [number[][], number], cur: number) => {
  //   return [
  //     features.concat(count ? [...features.slice(-1)[0], cur] : [cur]),
  //     (count + 1) % 3
  //   ];
  // },
  //   [[], 0]
  // );

  const source = GeoJsonSource({
    features: features.map(
      (coordinates: any) => Object({
        geometry: { type: "Point", coordinates },
        properties: {
          q: (((100 + coordinates[2]) / MAX_VALUE) - 1) ** 2,
          ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
        }
      })
    )
  });

  return {
    id: `mesh-${key}`,
    type: "circle",
    source,
    component: "location",
    paint: {
      "circle-radius": { stops: [[0, 0.2], [22, 4]] },
      "circle-stroke-width": 0,
      "circle-color": [
        "rgba",
        ["*", 127, ["get", "q"]],
        ["*", 127, ["get", "ln"]],
        ["*", 127, ["-", 1, ["get", "q"]]],
        0.75
      ]
    }
  }

};


/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
    // Start the worker
    case COMMANDS.start:
      await start();
      ctx.postMessage({
        type: COMMANDS.status,
        data: "ready",
      });
      return;
    // Respond with status
    case COMMANDS.status:
      ctx.postMessage({
        type: COMMANDS.status,
        data: "ready",
      });
      return;
    // Push a home layer
    case COMMANDS.home:
      ctx.postMessage({
        type: COMMANDS.source,
        data: ["home", userLocationSource(data.data as UserLocation)],
      });
      ctx.postMessage({
        type: COMMANDS.layer,
        data: userLocationChannel(data.data as UserLocation),
      });
      return;
    // Get object storage file system index
    case COMMANDS.storage:
      ctx.postMessage({
        type: COMMANDS.storage,
        data: await getFileSystem(data.data.url),
      });
      return;
    // Get an object fragment from storage
    case COMMANDS.fragment:
      ctx.postMessage({
        type: COMMANDS.source,
        data: await getFragment(...(data.data as [string, string])),
      });
      return;
    // Error on unspecified message type
    case COMMANDS.load:
        ctx.postMessage({
            type: COMMANDS.load,
            data: await load(data.data.src),
        });
        return;
    default:
      ctx.postMessage({
        type: COMMANDS.error,
        message: "unknown message format",
        data
      });
      return;
  }
})
