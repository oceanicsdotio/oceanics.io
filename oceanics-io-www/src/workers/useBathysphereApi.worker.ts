
import { DOMParser } from "xmldom";
import type { FileSystem } from "./shared";
import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";

const ctx: Worker = self as unknown as Worker;
type ModuleType = typeof import("oceanics-io-wasm/pkg");

/**
 * Global for reuse
 */
let parser: DOMParser | null = null;

/**
 * Runtime handle to which we will memoize the active runtime. 
 */
let runtime: ModuleType | null = null;

/**
 * Make HTTP request to S3 service for metadata about available
 * assets.
 * 
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker 
 */
async function getNodes(url: string, parser: DOMParser): Promise<ChildNode[]> {
  const text = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache"
  }).then(response => response.text());

  const xmlDoc = parser.parseFromString(text, "text/xml");
  const [result] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  return Array.from(result.childNodes);
}

/**
 * Retrieve remote file metadata and format it as a
 * serializable message. 
 */
async function getFileSystem(url: string): Promise<FileSystem> {
  if (!parser) parser = new DOMParser();

  const nodes = await getNodes(url, parser);
  const filter = (match: string) => ({ tagName }: any) => tagName === match;
  const fileObject = (node: ChildNode) => Object({
    key: node.childNodes[0].textContent,
    updated: node.childNodes[1].textContent,
    size: node.childNodes[3].textContent,
  })
  const fileCollection = (node: ChildNode) => Object({
    key: node.childNodes[0].textContent
  })

  const objects = nodes.filter(filter("Contents")).map(fileObject)
  const collections = nodes.filter(filter("CommonPrefixes")).map(fileCollection)

  return { objects, collections };
}

/**
 * Get image data from S3, the Blob-y way. 
 */
const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
  const blob = await fetch(url).then(response => response.blob());
  const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
    var reader = new FileReader();
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
  runtime = await import("oceanics-io-wasm/pkg");
  runtime.panic_hook();
}

/**
 * Get public JSON data. 
 * 
 * Return an error JSON object if something goes wrong.
 */
const getPublicJsonData = async (url: string): Promise<object> => {
  return fetch(url)
    .then(r => r.json())
    .catch((err) => Object({
      error: err.message
    }));
};

type IRegister = {
  email: string;
  password: string;
  apiKey: string;
  server: string;
}

/**
 * Create a new account for our API and services.
 */
const register = async ({
  email,
  password,
  apiKey,
  server
}: IRegister): Promise<object> =>
  fetch(`${server}/api/auth`, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: JSON.stringify({
      username: email,
      password
    })
  })
    .then(response => response.json());

type IQuery = {
  accessToken: string;
  server: string;
  route?: string;
}

/**
 * Get the index.
 */
const query = async ({
  accessToken,
  server,
  route = ""
}: IQuery): Promise<object> =>
  fetch(`${server}/api/${route}`, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `:${accessToken}`
    }
  })
    .then(response => response.json())
    .then(({ value }) => value);

type ILogin = {
  email: string;
  password: string;
  server: string;
}

/**
 * Login and get a JWT.
 */
const login = async ({
  email,
  password,
  server
}: ILogin): Promise<string> =>
  fetch(`${server}/api/auth`, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${email}:${password}`
    }
  })
    .then(response => response.json())
    .then(({ token = "" }) => token);


/**
 * Convenience method to make the name usable as a page anchor
 */
const transformName = (name: string): string => name.toLowerCase().split(" ").join("-");


/**
 * Page anchor hash
 */
const locationHash = async (name: string): Promise<string> =>
  `#${transformName(name)}`;

type Icon = {
  relativePath: string;
  publicURL: string;
}

type Tile = {
  name: string;
  becomes?: string[];
  data: string;
  queryString: string;
}


type ISorted = {
  icons: Icon[];
  tiles: Tile[];
}

/** 
 * Generate derived fields, and match metadata to asset files.
 */
const sorted = async ({ tiles, icons }: ISorted) => {

  const lookup = Object.fromEntries(
    icons.map(({ relativePath, publicURL }) => [relativePath, publicURL])
  );

  return tiles.map(({ name, becomes = [], data, queryString, ...tile }) => Object({
    canonical: transformName(name),
    grayscale: typeof queryString === "undefined" || queryString === null,
    queryString,
    anchorHash: name.toLowerCase().split(" ").join("-"),
    group: becomes.map((x: string) => {
      const [{ name }] = tiles.filter(({ name }) => transformName(name) === transformName(x));
      return {
        link: `#${transformName(name)}`,
        text: name
      };
    }),
    name,
    publicURL: lookup[data],
    ...tile
  }));
}


type Edge = {
  node: {
    frontmatter: {
      tags: string[];
      description: string;
    }
    fields: {
      slug: string;
    }
  }
}

type Dictionary = { [index: string]: { count: number; links: string[]; } }

type ICodex = {
  edges: Edge[];
  accessToken?: string;
  server?: string;
}

/**
 * Find similar symbolic patterns, for word matching usually.
 */
const codex = async ({ edges }: ICodex): Promise<Dictionary> => {

  let mapping: Dictionary = {};

  edges.forEach(({ node }) => {
    const { frontmatter: { tags, description }, fields: { slug } } = node;

    (description.split(" ") || []).concat(tags).forEach((word: string) => {

      let parsed = word.trim().toLowerCase();
      const lastChar = word[word.length - 1]
      if (lastChar === "." || lastChar === "," || lastChar === "?") {
        parsed = word.slice(0, word.length - 1);
      }
      if (parsed.length < 3) return;  // "continue"

      if (parsed in mapping) {
        mapping[parsed].links.push(slug);
        mapping[parsed].count++;
      } else {
        mapping[parsed] = {
          count: 1,
          links: [slug]
        };
      }
    });
  });

  return mapping;

};

type HistogramResult = { total: number; max: number; };
/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 */
const histogramReducer = (histogram: [number, number][]): HistogramResult => histogram.reduce(
  ({ total, max }, [bin, count]) => {
    if (count < 0) throw Error(`Negative count value, ${count} @ ${bin}`);

    return {
      total: total + count,
      max: Math.max(max, count)
    }
  },
  { total: 0, max: 0 }
);

/**
 * Create vertex array buffer
 */
async function initParticles(res: number) {
  return new Uint8Array(Array.from(
    { length: res * res * 4 },
    () => Math.floor(Math.random() * 256)
  ))
};

type Template = {
  name: string;
  spriteSheet: string;
  probability?: number;
  value?: number;
  limit?: number;
}

/**
 * Generate the dataUrls for icon assets in the background.
 * 
 * Not a heavy performance hit, but some of the sprite sheet logic can be moved in here
 * eventually as well.
 */
const parseIconSet = async (
  nodes: {slug: string}[], 
  templates: Template[], 
  worldSize: number
) => {

  const lookup = Object.fromEntries(
    nodes.map(({ slug }) => [slug, slug])
  );

  return templates.map(({
    name,
    spriteSheet,
    probability = 0.0,
    value = 0.0,
    limit = worldSize * worldSize
  }) => ({
    key: name.toLowerCase().split(" ").join("-"),
    dataUrl: lookup[spriteSheet],
    limit,
    probability,
    value
  }));
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
  features: any[];
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
  let filterFcn = (x: any): boolean => x;
  let parserFcn = (x: any): PointFeatureResult => x;
  if (standard === "noaa") {
    filterFcn = (x: object): boolean => "data" in x && "metadata" in x;
    parserFcn = ({
      data: [head],
      metadata: { lon, lat, ...metadata }
    }: INoaa) => PointFeature(lon, lat, { ...head, ...metadata })
  } else if (standard === "esri") {
    parserFcn = ({
      geometry: { x, y },
      attributes
    }: IEsri) => PointFeature(x, y, attributes)
  }
  return {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: parserFcn(filterFcn(features)),
      properties,
    },
    attribution: ""
  };
}

/**
 * Format the user location
 */
const userLocation = async (
  coordinates: [number, number],
  iconImage: string
) =>
  Object({
    id: "home",
    type: "symbol",
    source: GeoJsonSource({
      features: [PointFeature(...coordinates, {})]
    }),
    layout: {
      "icon-image": iconImage
    }
  });


/**
 * Retrieve arbitrary GeoJson source
 */
const getData = async (url: string, standard: string) => {
  return await fetch(url)
    .then(response => response.json())
    .then(({ features }) => GeoJsonSource({ features, standard }));
};

type FeatureReducer = {
  count: number;
  features: number[][]
}

/**
 * Log normal density function for color mapping
 */
const logNormal = (x: number, m: number = 0, s: number = 1.0): number =>
  (1 / s / x / Math.sqrt(2 * Math.PI) * Math.exp(-1 * (Math.log(x) - m) ** 2 / (2 * s ** 2)));

/**
 * Retrieve a piece of a vertex array buffer from object storage.
 */
const getFragment = async (target: string, key: string, attribution: string) => {

  const url = `${target}/${key}`;
  const blob = await fetch(url).then(response => response.blob());

  const arrayBuffer: ArrayBuffer | string | null = await (new Promise((resolve) => {
    var reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result) };
    reader.readAsArrayBuffer(blob);
  }));
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw TypeError("Expected ArrayBuffer type")
  }

  const dataView = new Float32Array(arrayBuffer);
  const { features } = dataView.reduce(({ count, features }: FeatureReducer, cur: number) => {
    let insert;
    if (!count) {
      insert = [cur];
    } else {
      const [coords] = features.slice(-1);
      insert = [...coords, cur];
    }

    return {
      features: [...features, insert],
      count: (count + 1) % 3
    };
  },
    { count: 0, features: [] }
  );

  const source = GeoJsonSource({
    features: features.map(
      coordinates => Object({
        geometry: { type: "Point", coordinates },
        properties: {
          q: (((100 + coordinates[2]) / MAX_VALUE) - 1) ** 2,
          ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
        }
      })
    )
  });
  source.attribution = attribution;

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

type Vertex = {
  coordinates: [number, number, number?];
}
/**
 * Average a vertex array down to a single point. Will
 * work with XYZ and or XY, assuming the Z=0.
 */
const reduceVertexArray = async (vertexArray: Vertex[]) => {
  return vertexArray.reduce(
    ([x, y, z = 0], { coordinates: [Δx, Δy, Δz = 0] }) =>
      [
        x + Δx / vertexArray.length,
        y + Δy / vertexArray.length,
        z + Δz / vertexArray.length
      ],
    [0, 0, 0]
  )
};

/** 
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
const parseYamlText = (text: string) =>
  YAML.parse(text)
    .split("\n")
    .filter((paragraph: string) => paragraph)


/**
 * Load and validate the OpenAPI specification. 
 */
const load = async (specUrl: string) => {
  try {
    let api = await SwaggerParser.validate(specUrl);
    api.info.description = parseYamlText(api.info.description ?? "");
    return api;
  }
  catch (err) {
    return err;
  }
}

type Schema = {
  name: string;
  schema: {
    enum?: string[];
    type: string;
    description: string;
  }
}
type Input = {
  id: string;
  type: string;
  options: string[];
}

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 * 
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces. 
 */
const schemaToInput = ({
  name,
  schema,
  ...props
}: Schema): Input => {
  let type;
  let options = null;
  if (typeof schema !== "undefined") {
    type = schema.type;
    if (schema.enum ?? false) {
      type = "select";
      options = schema.enum;
    } else if (type === "string") {
      type = "text";
    } else if (type === "integer") {
      type = "number";
    }
  }

  return Object({
    id: name
      .split(/([A-Z][a-z]+)/)
      .filter((word: string) => word)
      .map((word: string) => word.toLowerCase())
      .join(" "),
    type,
    options,
    ...props
  });
};

type Property = {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
}
type PropertiesEntry = [string, Property];
type Properties = { [index: string]: Property }
type Content = {
  ["application/json"]: {
    schema: {
      properties: Properties;
    }
  }
}


type IBuildView = {
  parameters: any;
  requestBody: {
    content: Content;
  }
}

/**
 * Builds the form structure for the hook
 * from the paths in the specification.
 */
const buildView = ({ parameters, requestBody }: IBuildView) => {

  const filterReadOnly = ({ readOnly = null }) => !readOnly;
  const formatPaths = ([k, v]: PropertiesEntry) => {
    let value = v;
    while (typeof value.items !== "undefined") value = value.items;
    if (typeof value.properties !== "undefined") {
      return Object.entries(value.properties).map(([k, v]) => Object({ name: k, ...v }));
    } else {
      return { name: k, ...value }
    }
  }

  let body = null;
  if (requestBody) {
    const props = requestBody.content["application/json"].schema.properties;
    body = Object.entries(props).flatMap(formatPaths).filter(filterReadOnly);
  }

  return {
    query: (parameters || []).map(schemaToInput),
    body
  }
}

type ApiOperation = {
  path: string;
  method: string;
  schema: Schema;
  view: {
    query: Input[];
    body: any;
  }
}

type SpecNode = { [index: string]: Schema }
type UnpackedPair = [string, Schema]

/**
 * Flatten the route and method pairs to be filtered
 * and converted to UI features
 */
const flattenSpecOperations = async (paths: SpecNode): Promise<ApiOperation[]> =>
    Object.entries(paths).flatMap(([path, schema]: UnpackedPair) => 
        Object.entries(schema).map(([method, schema]: any) => 
            Object({
                path, 
                method, 
                schema: {
                    ...schema,
                    description: parseYamlText(schema.description)
                }, 
                view: buildView(schema)
            })));


/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "start":
      await start();
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "index":
      ctx.postMessage({
        type: "data",
        data: await getFileSystem(data.url),
      });
      return;
    case "json":
      ctx.postMessage({
        type: "data",
        data: await getPublicJsonData(data.url),
      });
      return;
    case "blob":
      ctx.postMessage({
        type: "data",
        data: await fetchImageBuffer(data.url),
      });
      return;
    case "getFragment":
      ctx.postMessage({
        type: "data",
        data: await getFragment(data.target, data.key, data.attribution),
      });
      return;
    case "parseIconSet":
      ctx.postMessage({
        type: "parseIconSet",
        //@ts-ignore
        data: await parseIconSet(...data.data),
      });
      return;
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;

  }
})