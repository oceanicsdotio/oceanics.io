import {
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";

import { Map, type AnyLayer, type AnySourceData, type Style } from "mapbox-gl";
// import { VertexArray } from "oceanics-io-www-wasm";
// const ENCODER_RADIX = 36;
// const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
// const MAX_FRAGMENTS = null;  // practical limitation for testing
// const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;

// ESRI feature
export type Feature = {
  attributes: {
      TOWN: string
      COUNTY: string
      GlobalId: string
      "Shape.STArea()": string 
  }
  geometry: unknown
}

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
export const transformCsv = (text: string) => {
  const result = text.split("\n")
      .slice() // copy to prevent readable body disappearing
      .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
  return JSON.stringify(result)
}

export type FileObject = {
  key: string;
  updated: string;
  size: number;
};

export type FileSystem = {
  objects: FileObject[];
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

// Actual handler
const onMessageHandler =
  (setValue: Dispatch<SetStateAction<string[]>>) =>
  ({ data }: { data: string }) => {
    setValue((prev: string[]) => [...prev.slice(0, LIMIT - 1), data]);
  };

export interface FieldType {
  name?: string;
  description?: string;
  id: string;
  type: "password" | "email" | "text" | "number" | "submit";
  disabled?: true;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  placeholder?: string;
  readonly?: boolean;
  required?: true;
  value?: any;
}

// Properties as specified in OpenAPI request bodies
export interface Property {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
  type: string;
  description: string;
  enum?: string[];
}
// Collection of named properties
export interface Properties {
  [index: string]: Property;
}
// Path as specified in OpenAPI specification
export interface Method {
  tags: string[];
  summary: string;
  description: string;
  parameters?: {
    name: string;
    schema: Property;
  }[];
  requestBody?: {
    content: {
      ["application/json"]: {
        schema: {
          properties?: Properties;
          oneOf?: Properties[];
        };
      };
    };
  };
}

// Operation as specified after transformation in worker
export interface Operation {
  path: string;
  method: string;
  tags: string[];
  summary: string;
  description: string;
  parameters?: FieldType[];
  requestBody?: FieldType[];
}
// Specification
interface OpenApi {
  info: {
    title: string;
    version: string;
    description: string;
  };
  operations: Operation[];
}

const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";
const PREFIX = "MidcoastMaineMesh";
const OBJECT_STORAGE_URL = `${TARGET}?prefix=${PREFIX}/necofs_gom3_mesh/nodes/`;
// In-memory log truncation
const LIMIT = 10;

export default function useCatalog({
  src,
  worker,
  map: { accessToken, defaults },
}: {
  src: string;
  worker: MutableRefObject<Worker | undefined>;
  map: {
    accessToken: string;
    defaults: View;
  };
}) {
  /**
   * MapBox container reference.
   */
  const ref: MutableRefObject<HTMLDivElement | null> = useRef(null);

  /**
   * MapBoxGL Map instance saved to React state.
   */
  const [map, setMap] = useState<Map | null>(null);

  /**
   * MapBoxGL Map instance saved to React state.
   */
  const [ready, setReady] = useState(false);

  /**
   * Current zoom level
   */
  const [zoom, setZoom] = useState<number>(defaults.zoom);

  /**
   * Location of cursor in geo coordinates, updated onMouseMove.
   */
  const [cursor, setCursor] = useState<{ lng: number; lat: number }>({
    lng: defaults.center[0],
    lat: defaults.center[1],
  });
  /**
   * Boolean indicating whether the device is a small mobile,
   * or full size desktop.
   */
  const [, setMobile] = useState(false);

  /**
   * The queue is an array of remote data assets to fetch and process.
   * Updating the queue triggers `useEffect` hooks depending on whether
   * visualization elements have been passed in or assigned externally.
   */
  const [queue, setQueue] = useState<FileObject[]>([]);

  /**
   * Reorder data sets as they are added.
   */
  const [channelOrder] = useState<[string, string][]>([]);

  /**
   * "Guess" the type of device based on known user agent string.
   *
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
   * User location to be obtained from Geolocation API.
   */
  const [location, setLocation] = useState<GeolocationPosition | null>(null);

  /**
   * Get the user location
   */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      setLocation,
      () => {
        console.error("Error getting client location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  const [, setMessages] = useState<string[]>([]);

  // Start if we get a worker on load.
  useEffect(() => {
    if (typeof worker.current === "undefined") return;
    let handle = worker.current;
    const listener = onMessageHandler(setMessages);
    handle.addEventListener("message", listener, { passive: true });
    handle.postMessage({ type: "status" });
    return () => {
      handle.removeEventListener("message", listener);
      handle.terminate();
    };
  }, [worker]);

  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const [api, setApi] = useState<OpenApi>({
    info: {
      title: `Loading ${src}...`,
      description: `Loading methods...`,
      version: "",
    },
    operations: [],
  });

  // Start listening to worker messages
  useEffect(() => {
    if (typeof worker.current === "undefined") return;
    let handle = worker.current;
    let callback = ({ data }: any) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "load":
          setApi(data.data as OpenApi);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        default:
          return;
      }
    };
    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
    };
  }, [worker]);

  /**
   * Hook loads and parses an OpenAPI spec from a URL using a
   * background worker.
   *
   * It runs once when the component loads. This allows
   * the specification to be available before derived data
   * is calculated for UI.
   */
  useEffect(() => {
    worker.current?.postMessage({
      type: "load",
      data: { src },
    });
  }, [worker, src]);

  /**
   * Get the asset metadata from object storage service
   */
  useEffect(() => {
    worker.current?.postMessage({
      type: "storage",
      data: {
        url: OBJECT_STORAGE_URL,
      },
    });
  }, [worker]);

  /**
   * Create the MapBoxGL instance.
   *
   * Don't do any work if `ref` has not been assigned to an element,
   * and be sure to remove when component unmounts to clean up workers.
   */
  useEffect(() => {
    if (!ref.current) return;
    const handle: Map = new Map({
      accessToken,
      container: ref.current,
      ...defaults,
    });
    handle.on("idle", () => {
      setReady(true);
    });
    handle.on("zoom", () => {
      setZoom(handle.getZoom());
    });
    handle.on("mousemove", ({ lngLat }) => {
      setCursor(lngLat);
    });
    setMap(handle);
    return () => {
      handle.remove();
    };
  }, [ref, accessToken, defaults]);

  // Start listening to worker messages
  useEffect(() => {
    if (!map || !worker.current) return;
    const handle = worker.current;
    let callback = ({ data }: any) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "source":
          console.log(data.type, data.data);
          map?.addSource(...(data.data as [string, AnySourceData]));
          return;
        case "layer":
          console.log(data.type, data.data);
          map?.addLayer(data.data as AnyLayer);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        case "storage":
          console.log(data.type, data.data);
          setQueue(data.data.objects);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
    };
  }, [map, worker]);

  /**
   * Pan to user location immediately when updated.
   * Use the worker to create the point feature for the user location.
   * Create home animation image.
   */
  useEffect(() => {
    if (!location || !map || !worker.current) return;
    map.panTo([location.coords.longitude, location.coords.latitude]);
    worker.current.postMessage({
      type: "home",
      data: {
        coordinates: [location.coords.longitude, location.coords.latitude],
        iconImage: "home",
      },
    });
  }, [ready, location, map, worker]);

  /**
   * Request all fragments sequentially.
   *
   * All of this should be cached by the browser
   */
  useEffect(() => {
    if (!ready || !queue.length) return;
    const key = queue[0].key;
    setQueue(queue.slice(1, queue.length));
    if (map?.getLayer(`mesh-${key}`)) return;
    worker.current?.postMessage({
      type: "fragment",
      data: [TARGET, key],
    });
  }, [ready, worker, queue, map]);

  /**
   * Memoize an addLayer convenience function
   */
  // const addLayer = (
  //   source: AnySourceData,
  //   layer: AnyLayer,
  //   onClick: MouseEventHandler
  // ): void => {
  //   map?.addLayer({ source, ...layer });
  //   if (onClick) map?.on("click", layer.id, onClick);
  // };

  // const addPopup = (coords: number[]) => {
  //   const placeholder: HTMLElement = document.createElement("div");

  //   ReactDOM.render(
  //     // <PopUpContent features={projected} Component={component} />,
  //     <div />,
  //     placeholder
  //   );

  //   if (!map) return;
  //   new Popup({
  //     className: "map-popup",
  //     closeButton: false,
  //     closeOnClick: true,
  //   })
  //     .setLngLat(coords.slice(0, 2) as [number, number])
  //     .setDOMContent(placeholder)
  //     .addTo(map);
  // };

  /**
   * Task the web worker with loading and transforming data to add
   * to the MapBox instance as a GeoJSON layer.
   */
  useEffect(() => {
    if (!map || !queue || !ready) return;
    // const filterExisting = (x: string): boolean => !map.getLayer(x);

    // queue
    //   .filter(filterExisting)
    //   .forEach(({ id, behind, standard, url, attribution, ...layer }) => {
    //     setChannelOrder([...channelOrder, [id, behind]]);
    //     worker.current
    //       .getData(url, standard)
    //       .then((source: AnySourceData) => {
    //         addLayer(id, { ...source, attribution }, layer, onReduceFeature);
    //       })
    //       .catch(console.error);
    //   });
  }, [map, queue, ready]);

  /// Swap layers to be in the correct order as they are created. Will
  /// only trigger once both layers exist.
  /// Nice because you can resolve them asynchronously without worrying
  /// about creation order.
  useEffect(() => {
    if (!map) return;
    channelOrder.forEach(([back, front]) => {
      if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front);
    });
  }, [channelOrder, map]);

  return {
    api,
    worker,
    map,
    ref,
    cursor,
    zoom,
  };
}
