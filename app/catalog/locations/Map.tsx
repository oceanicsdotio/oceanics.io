"use client";
import React, {
  useRef,
  useEffect,
  type MouseEventHandler,
  useState,
  type MutableRefObject,
} from "react";
import styles from "@catalog/page.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map, type AnyLayer, type AnySourceData, type Style } from "mapbox-gl";
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
async function startOnce() {
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



const MESSAGES = {
  status: "status",
  source: "source",
  layer: "layer",
  error: "error",
  home: "home",
};

const DEFAULTS = {
  zoom: 10,
  antialias: false,
  pitchWithRotate: false,
  dragRotate: false,
  touchZoomRotate: false,
  center: [-70, 43.7] as [number, number],
  style: {
    version: 8,
    name: "Dark",
    sources: {
      mapbox: {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8",
      },
    },
    sprite: "mapbox://sprites/mapbox/dark-v8",
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#444",
        },
      },
      {
        id: "water",
        source: "mapbox",
        "source-layer": "water",
        type: "fill",
        paint: {
          "fill-color": "#000",
        },
      },
      {
        id: "cities",
        source: "mapbox",
        "source-layer": "place_label",
        type: "symbol",
        layout: {
          "text-field": "{name_en}",
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 6, 12],
        },
        paint: {
          "text-color": "#ccc",
          "text-halo-width": 2,
          "text-halo-color": "#000",
        },
      },
    ],
  },
};

interface View {
  zoom: number;
  center: [number, number];
  antialias: boolean;
  pitchWithRotate: boolean;
  dragRotate: boolean;
  touchZoomRotate: boolean;
  style: Style;
}


/**
 * A Collection abstracts access to a data source.
 */
function Collection({
  id,
  url,
  maxzoom = 21,
  minzoom = 1,
  zoomLevel,
}: {
  id: string;
  /**
   * Source of the raw data
   */
  url: string;
  /**
   * The type of the data.
   */
  type: string;
  /**
   * How to render the data
   */
  component: string;
  /**
   * Does not appear when zoomed in further
   */
  maxzoom: number;
  /**
   * Not rendered when zoomed further out
   */
  minzoom: number;
  /**
   * Current zoom level passed in for rendering in cards
   * whether or not the channel is currently visible
   */
  zoomLevel: number;
  /**
   * The provider and legal owner of the data
   */
  attribution?: string;
  /**
   * URL that links to the provider
   */
  info: string;
  /**
   * Render and update view on click
   */
  onClick: MouseEventHandler;
}) {
  const inView = zoomLevel >= minzoom && zoomLevel <= maxzoom;
  return (
    <div>
      <h1>{id.replace(/-/g, " ")}</h1>
      <div className={"zoom"}>
        <div className={inView ? "visible" : ""}>
          {`zoom: ${minzoom}-${maxzoom}`}
        </div>
      </div>
      <a href={url}>{"download"}</a>
    </div>
  );
}


/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Catalog({
  accessToken,
}: {
  /**
   * Current zoom level
   */
  zoomLevel: number;
  accessToken: string;
}) {
  /**
   * Ref to Web Worker
   */
  const worker = useRef<Worker>();
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  }, []);
  /**
   * MapBox container reference.
   */
  const ref: MutableRefObject<HTMLDivElement | null> = useRef(null);
  /**
   * MapBoxGL Map instance saved to React state.
   */
  const [map, setMap] = useState<Map | null>(null);
  /**
   * Map is in idle state
   */
  const [ready, setReady] = useState(false);
  /**
   * Current zoom level
   */
  const [zoom, setZoom] = useState<number>(DEFAULTS.zoom);
  /**
   * Location of cursor in geo coordinates, updated onMouseMove.
   */
  const [cursor, setCursor] = useState<{ lng: number; lat: number }>({
    lng: DEFAULTS.center[0],
    lat: DEFAULTS.center[1],
  });
  /**
   * Boolean indicating whether the device is a small mobile,
   * or full size desktop.
   */
  const [, setMobile] = useState(false);
  /**
   * Guess the type of device based on known user agent string.
   * This is disclosed in the website privacy policy.
   */
  useEffect(() => {
    setMobile(
      Boolean(
        navigator.userAgent.match(
          /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
        )
      )
    );
  }, []);
  /**
   * Start listening to worker messages
   */
  useEffect(() => {
    if (!worker.current) return;
    const handle = worker.current;
    if (!ref.current) return;
    const map = new Map({
      accessToken,
      container: ref.current,
      ...(DEFAULTS as any),
    });
    map.on("idle", () => {
      setReady(true);
    });
    map.on("zoom", () => {
      setZoom(map.getZoom());
    });
    map.on("mousemove", ({ lngLat }) => {
      setCursor(lngLat);
    });
    setMap(map);
    let callback = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.status:
          console.log(data.type, data.data);
          return;
        case MESSAGES.source:
          console.log(data.type, data.data);
          map.addSource(...(data.data as [string, AnySourceData]));
          return;
        case MESSAGES.layer:
          console.log(data.type, data.data);
          map.addLayer(data.data as AnyLayer);
          return;
        case MESSAGES.error:
          console.error(data.type, data.data);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
      map.remove();
    };
  }, [worker, accessToken]);
  /**
   * Pan to user location immediately when updated.
   * Use the worker to create the point feature for the user location.
   * Create home animation image.
   */
  useEffect(() => {
    if (!navigator.geolocation || !map || !worker.current || !ready) return;
    let handle = worker.current;
    let callback = (location: GeolocationPosition) => {
      handle.postMessage({
        type: MESSAGES.home,
        data: {
          coordinates: [location.coords.longitude, location.coords.latitude],
          iconImage: "home",
        },
      });
      map.panTo([location.coords.longitude, location.coords.latitude]);
    };
    navigator.geolocation.getCurrentPosition(
      callback,
      () => {
        console.error("Error getting client location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [map, worker, ready]);

  return (
    <div className={styles.catalog}>
      <div ref={ref} />
    </div>
  );
}
