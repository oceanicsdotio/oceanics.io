"use client";
import React, {
  useRef,
  useEffect,
  type MouseEventHandler,
  useState,
  type MutableRefObject,
} from "react";
import styles from "./catalog.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
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
