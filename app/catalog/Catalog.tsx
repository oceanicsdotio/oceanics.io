"use client";
import SwaggerParser from "@apidevtools/swagger-parser";
import Markdown from "react-markdown";
import React, {
  useRef,
  useEffect,
  type MouseEventHandler,
  useState,
  type MutableRefObject,
} from "react";

import styles from "./catalog.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import specification from "../../specification.json";
// const api = await SwaggerParser.dereference(JSON.stringify(specification));
import { Map, type AnyLayer, type AnySourceData, type Style } from "mapbox-gl";

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

interface FieldType {
  name?: string;
  description?: string;
  id: string;
  key?: string;
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
interface Property {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
  type: string;
  description: string;
  enum?: string[];
}
// Collection of named properties
interface Properties {
  [index: string]: Property;
}
// Path as specified in OpenAPI specification
interface Method {
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

// HTMLInputElement type
type InputTypes = "text" | "number" | "email" | "password";
const convertType = (name: string, { type }: Property): InputTypes | null => {
  if (name === "password") {
    return "password";
  } else if (name === "email") {
    return "email";
  }
  if (type === "string") {
    return "text";
  } else if (type === "integer") {
    return "number";
  } else {
    console.warn(`Skipping unsupported type:`, type);
    return null;
  }
};

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 *
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces.
 */
const propertyToInput = ([name, property]: [
  string,
  Property
]): FieldType | null => {
  const id = name
    .split(/([A-Z][a-z]+)/)
    .filter((word: string) => word)
    .map((word: string) => word.toLowerCase())
    .join(" ");
  const type = convertType(name, property);
  if (type) return { ...property, id, type };
  console.warn(`Skipping unknown format (${id}):`, property);
  return null;
};

function ApiOperation({
  path,
  method,
  operation: { requestBody, parameters, ...operation },
}: {
  path: string;
  method: string;
  operation: Method;
}) {
  let requestParams: FieldType[] = [];
  if (typeof requestBody !== "undefined") {
    const { schema } = requestBody.content["application/json"];
    let properties =
      typeof schema.oneOf === "undefined" ? schema.properties : schema.oneOf[0];
    const _body: [string, Property][] = Object.entries(
      properties as Properties
    ).flatMap(([name, property]: [string, Property]) => {
      let value = property;
      while (typeof value.items !== "undefined") value = value.items;
      if (typeof value.properties !== "undefined") {
        return Object.entries(value.properties);
      } else {
        return [[name, value]];
      }
    });
    requestParams = _body
      .map(propertyToInput)
      .filter((param) => param) as FieldType[];
    requestParams = requestParams.map((props) => {
      return { key: `request-body-${props.id}`, ...props };
    });
  }
  let queryParams: FieldType[] = (parameters ?? [])
    .map(({ name, schema }) => propertyToInput([name, schema]))
    .filter((param) => param) as FieldType[];
  queryParams = queryParams.map((props) => {
    return { key: `query-${props.id}`, ...props };
  });
  let formUniqueId = `${path}-${method}`;
  return (
    <form key={formUniqueId} id={formUniqueId} className={styles.form}>
      <h2>{operation.summary}</h2>
      <h3>path</h3>
      <code>{path}</code>
      <h3>method</h3>
      <code>{method.toUpperCase()}</code>
      <h3>description</h3>
      <Markdown>{operation.description}</Markdown>
      {[...requestParams, ...queryParams].map(
        ({ description, key, ...props }) => (
          <div key={key}>
            <label htmlFor={props.id}>{props.name}</label>
            <input {...props} />
            <div>{description}</div>
          </div>
        )
      )}
    </form>
  );
}

type ChannelType = {
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
};

/**
 * A channel abstracts access to a data source.
 */
function Channel({
  id,
  url,
  maxzoom = 21,
  minzoom = 1,
  zoomLevel,
}: ChannelType) {
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
      {/* <div ref={ref} /> */}
      <h2>{specification.info.title}</h2>
      <Markdown>{specification.info.description}</Markdown>
      {/* <Suspense>{operations}</Suspense> */}
    </div>
  );
}
