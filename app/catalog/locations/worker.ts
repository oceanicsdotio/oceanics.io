import { DOMParser } from "@xmldom/xmldom";
import { postError } from "@catalog/worker";
let postStatus = (message: string) => {
  self.postMessage({
    type: "status",
    data: {
      message
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
  let url = query.url;
  let _parser = new DOMParser();
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
    let key = node.childNodes[0]?.textContent ?? ""
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
async function getFragment(url: string, attribution: string) {
  const blob = await fetch(url).then((response) => response.blob());
  const arrayBuffer = await blob.arrayBuffer();
  const MAX_VALUE = 5200;
  const dataView = new Float32Array(arrayBuffer);
  const count = dataView.length / 3;
  let feature_collection = [];
  let point = 0;

  while (point < count) {
    const start = point * 3;
    const end = start + 3;
    const coordinates = dataView.slice(start, end);
    feature_collection.push({
      geometry: { type: "Point", coordinates },
      properties: {
        q: ((100 + coordinates[2]) / MAX_VALUE - 1) ** 2,
        ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5),
      },
    })
    point = point + 1;
  }
  return {
    id: url,
    type: "circle",
    source: {
      type: "geojson",
      generateId: true,
      data: {
        type: "FeatureCollection",
        features: feature_collection,
      },
      attribution,
    },
    paint: {
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
    },
  };
};
async function searchFragments(query: any) {
  postStatus(`Getting filesystem...`);
  const collection = "assets/necofs_gom3_mesh/nodes";
  const result = await getFileSystem(query);
  const attribution = "UMass Dartmouth";
  const matches = result.filter((node) => node.key.includes(collection));
  matches.forEach(async (target) => {
    const data = await getFragment(`${query.url}/${target.key}`, attribution);
    self.postMessage({
      data,
      type: "layer"
    })
  });
  return true
}
async function getBoundaries(query: { url: string }) {
  postStatus(`Getting boundaries...`);
  const attribution = "Maine OIT";
  const raw = await fetch(query.url).then((response) => response.json());
  raw.features.forEach((feature: any, ind: number)=>{
    const data = {
      id: `${query.url}-${ind}`,
      type: "line",
      source: {
        type: "geojson",
        generateId: true,
        data: {
          type: "FeatureCollection",
          features: [feature]
        },
        attribution,
      },
      paint: {
        "line-color": "rgba(255,255,255,0.5)"
      },
    };
    self.postMessage({
      data,
      type: "layer"
    })
  })
  return true
}
function transform({ location, ...rest }: {location?: any}) {
  return {
    type: "Feature",
    geometry: JSON.parse(location as any),
    properties: {
      ...rest
    },
  };
}
function collectionToMultiPolygonLayer(result: any) {
  const multiPolygons = result.filter((location: any) => location.geometry.type === "MultiPolygon")
  console.log({multiPolygons})
  multiPolygons.forEach((feature: any, ind: number)=>{
    self.postMessage({
      data: {
        id: `query-result-multi-polygon-${ind}`,
        type: "line",
        source: {
          type: "geojson",
          generateId: true,
          data: feature,
          attribution: "ME OIT",
        },
        paint: {
          "line-color": "rgba(255,255,255,0.5)"
        },
      },
      type: "layer"
    })
  })
} 
function collectionToPointLayer(result: any) {
  const points = result.filter((location: any) => location.geometry.type === "Point")
  console.log({points})
  const data = {
    id: "query-result-points",
    type: "circle",
    source: {
      type: "geojson",
      generateId: true,
      data: {
        type: "FeatureCollection",
        features: points,
      },
      attribution: "Oceanics.io",
    },
    paint: {
      "circle-radius": 5,
      "circle-stroke-width": 1,
      "circle-stroke-color": "orange",
    },
  };
  self.postMessage({
    data,
    type: "layer"
  })
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
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    postError(`worker missing access token`)
  }
  if (!["getLocations"].includes(type)) {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${type}`
    });
    return
  }
  const { panic_hook, getCollection } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  try {
    const result = await getCollection(access_token, message.data.data.query);
    const parsed = result.value.map(transform);
    // collectionToPointLayer(parsed);
    collectionToMultiPolygonLayer(parsed);
  } catch (error: any) {
    postError(error.message);
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);
