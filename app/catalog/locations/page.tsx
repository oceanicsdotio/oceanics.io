"use client";
import Link from "next/link";
import useCollection from "@catalog/useCollection";
import { components } from "@app/../specification.json";
import type { Locations as LocationsType } from "@oceanics/app";
import layout from "@app/layout.module.css";
import Markdown from "react-markdown";
import React, {
  useRef,
  useEffect,
  useState,
  type MutableRefObject,
} from "react";
import styles from "@catalog/page.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map } from "mapbox-gl";
import { DOMParser } from "@xmldom/xmldom";
type FileObject = {
  key: string;
  updated: string;
  size: number;
};
type FileSystem = {
  objects: FileObject[];
};

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
    cache: "no-cache",
  });
  const text = await response.text();
  const xmlDoc = _parser.parseFromString(text, "text/xml");
  const [{ childNodes }] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  const nodes: FileObject[] = Array.from(childNodes).map((node) => {
    return {
      key: node.childNodes[0]?.textContent ?? "",
      updated: node.childNodes[1]?.textContent ?? "",
      size: parseInt(node.childNodes[3]?.textContent ?? "0"),
    };
  });
  return {
    objects: nodes.filter((node: FileObject) => node.size > 0),
  };
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
const getFragment = async (target: string, key: string) => {
  const url = `${target}/${key}`;
  const blob = await fetch(url).then((response) => response.blob());
  const arrayBuffer: ArrayBuffer | string | null = await new Promise(
    (resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsArrayBuffer(blob);
    }
  );
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw TypeError("Expected ArrayBuffer type");
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

  const MAX_VALUE = 5200;  
  return {
    id: `mesh-${key}`,
    type: "circle",
    source: {
      type: "geojson",
      generateId: true,
      data: {
        type: "FeatureCollection",
        features: features.map((coordinates: any) =>
          Object({
            geometry: { type: "Point", coordinates },
            properties: {
              q: ((100 + coordinates[2]) / MAX_VALUE - 1) ** 2,
              ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5),
            },
          })
        ),
      },
      attribution: "",
    },
    component: "location",
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


const parseLocation = (location: string) => {
  const regExp = /\[(.*?)\]/;
  let match = regExp.exec(location)
  let [lat, lon] = (match as string[])[1].split(",").slice(0,2).map(stringValue => Number(stringValue));
  return {
    type: "Point",
    coordinates: [lon, lat],
  }
}

const { title: left, description } = components.schemas.Locations;
interface ILocations extends Omit<LocationsType, "free"> {
  onDelete: (uuid: string) => void;
}
interface INavigate extends ILocations {
  onNavigate: () => void;
}
/**
 * Item level component
 */
function Location({
  uuid,
  name,
  description,
  encodingType,
  location,
  onDelete,
  onNavigate
}: INavigate) {
  return (
    <>
      <hr />
      <p>
        <a className={layout.link} onClick={onNavigate}>
          {name}
        </a>
      </p>
      <p>description: {description ?? "n/a"}</p>
      <p>type: {location?.type ?? "Point"}</p>
      <p>coordinates: {location?.coordinates[0]}, {location?.coordinates[1]}</p>
      <p>encoding type: {encodingType ?? "n/a"}</p>
      <p>uuid: {uuid}</p>
      <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
    </>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, onDelete } = useCollection({ left });
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
  const [, setZoom] = useState<number>(DEFAULTS.zoom);
  /**
   * Location of cursor in geo coordinates, updated onMouseMove.
   */
  const [, setCursor] = useState<{ lng: number; lat: number }>({
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
    if (!ref.current) return;
    const map = new Map({
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
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
  }, []);
  /**
   * Pan to user location immediately when updated.
   * Use the worker to create the point feature for the user location.
   * Create home animation image.
   */
  useEffect(() => {
    if (!navigator.geolocation || !map || !ready) return;
    let onGetPosition = (location: GeolocationPosition) => {
      map.panTo([location.coords.longitude, location.coords.latitude]);
      map.addLayer({
        id: `home`,
        type: "circle",
        source: {
          type: "geojson",
          generateId: true,
          data: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [location.coords.longitude, location.coords.latitude],
              },
              properties: {},
            }]
          },
          attribution: "Oceanicsdotio LLC",
        },
        paint: {
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-color": "orange",
        },
      })
    };
    navigator.geolocation.getCurrentPosition(
      onGetPosition,
      () => {
        console.error("Error getting client location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [map, ready]);


  useEffect(() => {
    if (!collection || !ready || !map) return;
    console.log(collection)
    const features = collection.map(({location}) => {
      return {
        type: "Feature",
        geometry: parseLocation(location),
        properties: {},
      }
    })
    const layerId = "query-result"
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
      map.removeSource(layerId)
    }
    map.addLayer({
      id: layerId,
      type: "circle",
      source: {
        type: "geojson",
        generateId: true,
        data: {
          type: "FeatureCollection",
          features: features as any
        },
        attribution: "Oceanicsdotio LLC",
      },
      paint: {
        "circle-radius": 5,
        "circle-stroke-width": 1,
        "circle-color": "orange",
      },
    })
  }, [collection, ready, map])

  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href="create/">
          create
        </Link>{" "}
        <code>{left}</code>
      </p>
      <p>{message}</p>
      <div className={styles.locations}>
        <div className={styles.mapbox} ref={ref} />
      </div>
      {collection.map(({location, ...each}: ILocations) => {
        // Workaround for cypher nested encoding issue
        let _location: any = parseLocation(location as any)
        let onNavigate = () => {
          window.scrollTo({top: 0, behavior: "smooth"});
          map?.panTo(_location.coordinates);
        }
        return (
          <Location key={each.uuid} location={_location} onNavigate={onNavigate} {...each} onDelete={onDelete}></Location>
        );
      })}
    </div>
  );
}
