import { DOMParser } from "@xmldom/xmldom";
type ModuleType = typeof import("@oceanics/app");
type FileObject = {
  key: string;
  updated: string;
  size: number;
};
type FileSystem = {
  objects: FileObject[];
};
const ctx: Worker = self as unknown as Worker;

// Possible types of message
const COMMANDS = {
  // Signal fatal error
  error: "error",
  // Parse geolocation re-post as source
  home: "home",
  // Sending a data source to MapBox
  source: "source",
  // Respond with Worker status
  status: "status",
  // Get object storage index
  storage: "storage",
  // Sending a layer style to MapBox
  layer: "layer",
  // Get object storage buffer
  fragment: "fragment",
  // Get index of API collections
  index: "index",
  // Get entities in a collection
  collection: "collection",
  count: "count",
  entity: "entity",
  create: "create",
  deleteEntity: "deleteEntity"
}
/**
 * Global WASM handle for reuse. 
 */
let _runtime: ModuleType | null = null;
/**
 * Import Rust-WASM runtime, and add a panic hook to give 
 * more informative error messages on failure. 
 */
async function startRuntimeOnce() {
  if (!_runtime) {
    _runtime = await import("@oceanics/app");
    _runtime.panic_hook();
  }
  return _runtime
}
/**
 * Detect whether on mobile, for example: to throttle requests,
 * or add paging parameters.
 */
const _mobile = Boolean(
  navigator.userAgent.match(
    /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
  )
);
/**
 * Global handle for reuse.
 */
let _access_token: string = "";
/**
 * Parse and set the global access token for authenticating
 * API requests with Netlify Identity.
 */
const getToken = (user?: string): string => {
  if (_access_token.length > 0) {
    return _access_token
  }
  if (typeof user !== "undefined") {
    const { token }: any = JSON.parse(user);
    _access_token = token.access_token;
  }
  if (!_access_token) {
    throw Error("Missing Netlify Access Token");
  }
  return _access_token
}
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
  let _parser = new DOMParser();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache"
  })
  const text = await response.text();
  const xmlDoc = _parser.parseFromString(text, "text/xml");
  const [{ childNodes }] = Object.values(xmlDoc.childNodes).filter(
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
interface PointFeatureChannel {
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




async function getIndex(user: string) {
  const access_token = getToken(user);
  const {getIndex} = await startRuntimeOnce();
  const result = await getIndex(access_token);
  const index = result.map(({ name }: any) => {
    const key = name
      .split(/\.?(?=[A-Z])/)
      .join("_")
      .toLowerCase();
    const href = `/catalog/${key}`;
    const content = name.split(/\.?(?=[A-Z])/).join(" ");
    return {
      left: name,
      href,
      content
    }
  })
  return {
    type: COMMANDS.index, data: {
      index,
      mobile: _mobile
    }
  }
}

async function getCount({left, user}: {left: string, user: string}) {
  const access_token = getToken(user);
  const {getCollection} = await startRuntimeOnce();
  const result = await getCollection(left, access_token);
  return {
    type: COMMANDS.count,
    data: {
      count: result["@iot.count"],
      left
    }
  }
}

async function getCollection({left, user}: {left: string, user: string}) {
  const access_token = getToken(user);
  const {getCollection} = await startRuntimeOnce();
  const result = await getCollection(left, access_token);
  return {
    type: COMMANDS.collection,
    data: {
      value: result.value
    }
  }
}

async function getEntity({left, left_uuid, user}: {left: string, left_uuid: string, user: string}) {
  const access_token = getToken(user);
  const {getEntity} = await startRuntimeOnce();
  const result = await getEntity(left, left_uuid, access_token);
  return {
    type: COMMANDS.entity,
    data: {
      value: result.value
    }
  }
}

async function createEntity({left, user, body}: {left: string, user?: string, body: string}) {
  const access_token = getToken(user);
  const response = await fetch(`/.netlify/functions/collection?left=${left}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body
  });
  if (response.ok) {
    return {
      type: COMMANDS.create,
      data: {
        ok: response.ok
      }
    }
  } 
  let result = await response.json();
  return {
    type: COMMANDS.error,
    data: {
      result
    }
  }
}

async function deleteEntity({left, left_uuid, user}: {left: string, left_uuid: string, user?: string}) {
  let runtime = await import("@oceanics/app");
  const access_token = getToken(user);
  const response = await fetch(`/.netlify/functions/entity?left=${left}&left_uuid=${left_uuid}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  });
  if (response.ok) {
    return {
      type: COMMANDS.deleteEntity,
      data: {
        ok: response.ok
      }
    }
  } 
  let result = await response.json();
  return {
    type: COMMANDS.error,
    data: {
      result
    }
  }
}


/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
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
    case COMMANDS.index:
      await getIndex(data.data).then(ctx.postMessage);
      return;
    case COMMANDS.count:
      await getCount(data.data).then(ctx.postMessage);
      return;
    case COMMANDS.collection:
      await getCollection(data.data).then(ctx.postMessage);
      return;
    case COMMANDS.entity:
      await getEntity(data.data).then(ctx.postMessage);
      return
    case COMMANDS.create:
      await createEntity(data.data).then(ctx.postMessage);
      return
    case COMMANDS.deleteEntity:
      await deleteEntity(data.data).then(ctx.postMessage);
    // Error on unspecified message type
    default:
      ctx.postMessage({
        type: COMMANDS.error,
        message: "unknown message format",
        data
      });
      return;
  }
})
