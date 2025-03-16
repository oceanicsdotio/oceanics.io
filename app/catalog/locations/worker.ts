import { DOMParser } from "@xmldom/xmldom";
import {status, postError} from "@catalog/worker"

function postSource(id: string, features: object[], attribution: string) {
  self.postMessage({
    type: "source",
    data: {
      id,
      source: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features,
        },
        attribution,
      }
    }
  })
}
function postLayer(id: string, type: string, paint: object) {
  self.postMessage({
    type: "layer",
    data: {
      id,
      type,
      source: id,
      paint,
    }
  })
}
/**
 * Retrieve remote file metadata and format it as a
 * serializable message.
 * 
 * Make HTTP request to S3 service for metadata about available
 * assets.
 *
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker
 */
async function getFileSystem(query: { url: string }) {
  const url = query.url;
  const _parser = new DOMParser();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
  });
  const text = await response.text();
  const xmlDoc = _parser.parseFromString(text, "text/xml");
  const [{ childNodes }] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  const nodes = Array.from(childNodes).map((node) => {
    const key = node.childNodes[0]?.textContent ?? ""
    return {
      key,
      updated: node.childNodes[1]?.textContent ?? "",
      size: parseInt(node.childNodes[3]?.textContent ?? "0")
    };
  });
  return nodes.filter((node) => (node.size > 0));
}
/**
 * Log normal density function for color mapping
 */
const logNormal = (x: number, m = 0, s = 1.0): number =>
  (1 / s / x / Math.sqrt(2 * Math.PI)) *
  Math.exp((-1 * (Math.log(x) - m) ** 2) / (2 * s ** 2));

/**
 * Retrieve a piece of a vertex array buffer from object storage.
 */
const MAX_VALUE = 5200;
async function getFragment(url: string, attribution: string) {
  const arrayBuffer = await fetch(url)
    .then((response) => response.blob())
    .then((blob) => blob.arrayBuffer());
  const dataView = new Float32Array(arrayBuffer); // view
  const count = dataView.length / 3;
  const feature_collection = []; // copy
  let point = 0;
  while (point < count) {
    const start = point * 3;
    const coordinates = dataView.slice(start, start + 3);
    feature_collection.push({
      geometry: { type: "Point", coordinates },
      properties: {
        q: ((100 + coordinates[2]) / MAX_VALUE - 1) ** 2,
        ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5),
      },
    })
    point = point + 1;
  }
  postSource(url, feature_collection, attribution);
  postLayer(url, "circle", {
    "circle-radius": {
      stops: [
        [0, 0.2],
        [22, 4],
      ],
    },
    "circle-stroke-width": 0,
    "circle-color": [
      "rgba",
      ["*", 127, ["get", "q"]],
      ["*", 127, ["get", "ln"]],
      ["*", 127, ["-", 1, ["get", "q"]]],
      0.75,
    ],
  });
};
async function searchFragments(query: any) {
  status(`Getting filesystem...`);
  const collection = "assets/necofs_gom3_mesh/nodes";
  const attribution = "UMass Dartmouth";
  const result = await getFileSystem(query);
  const tasks = result.filter((node) => node.key.includes(collection)).map((target) => {
    const url = `${query.url}/${target.key}`;
    return getFragment(url, attribution);
  });
  Promise.all(tasks)
}
function transform({ location, ...rest }: { location?: any }) {
  return {
    type: "Feature",
    geometry: JSON.parse(location as any),
    properties: {
      ...rest
    },
  };
}
interface Location {
  geometry: {
    type: string;
  };
}
function hasLocation({ location }: { location?: object }) {
  return typeof location !== "undefined"
}
function isMultiPolygon(location: Location) {
  return location.geometry.type === "MultiPolygon"
}

function collectionToMultiPolygonLayer(result: Location[], limit: number, offset: number) {
  const multiPolygons = result.filter(isMultiPolygon)
  if (!multiPolygons.length) return;
  const id = `locations-multi-polygons-${offset}-${limit}`
  postSource(id, multiPolygons, "ME OIT");
  postLayer(id, "line", {
    "line-color": "rgba(255,255,255,0.5)"
  })
}
function collectionToPointLayer(result: Location[], limit: number, offset: number) {
  const points = result.filter((location) => location.geometry.type === "Point");
  if (!points.length) return;
  const id = `locations-points-${offset}-${limit}`
  postSource(id, points, "Oceanics.io");
  postLayer(id, "circle", {
    "circle-radius": 5,
    "circle-stroke-width": 1,
    "circle-stroke-color": "orange",
  });
}
interface Collection {
  value: object[];
  page: {
    current: number;
    next: string;
  };
}
function processPageResult(result: Collection, limit: number, offset: number) {
  status(`Processing page ${result.page.current}`);
  const parsed = result.value.filter(hasLocation).map(transform);
  collectionToPointLayer(parsed, limit, offset);
  collectionToMultiPolygonLayer(parsed, limit, offset);
  return { total: parsed.length, next: result.page.next };
}
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  const { data: { user }, type } = message.data;
  if (typeof user === "undefined") {
    postError(`worker missing user data: ${JSON.stringify(message)}`)
  }
  const { token: { access_token = null } } = JSON.parse(user);
  if (!access_token) {
    postError(`worker missing access token`)
  }
  if (!["getLocations", "getFileSystem"].includes(type)) {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${type}`
    });
    return
  }
  if (type === "getFileSystem") {
    await searchFragments(message.data.data.query);
    return
  }
  const { panic_hook, getCollection } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  let total = 0;
  const limit = message.data.data.query.limit
  const left = message.data.data.query.left
  let offset = message.data.data.query.offset
  let next;
  let first = true;
  while (first || (next && typeof next !== "undefined")) {
    if (first) {
      first = false;
    } else {
      const decoded = new URLSearchParams(next)
      offset = parseInt(decoded.get("offset") ?? "0")
    }
    const result = await getCollection(access_token, {
      left, limit, offset
    });
    const stats = processPageResult(result, limit, offset);
    total += stats.total;
    next = stats.next;
  }
  status(`Found ${total}`)
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
export default {}