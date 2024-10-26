"use client";
import Link from "next/link";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type { LocationData, Locations as LocationsType } from "@oceanics/app";
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
import { NamedNode } from "../Node";

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
          "fill-color": "#102",
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
          "text-color": "#add8e6",
          "text-halo-width": 2,
          "text-halo-color": "#102",
        },
      },
    ],
  },
};
const components = specification.components;
const { title: left, description, properties } = components.schemas.Locations;
const linkedTypes = Object.keys(properties)
  .filter((each: string) => {
    return each.includes("@iot.navigation");
  })
  .map((key) => {
    return key.split("@")[0];
  });
interface ILocations extends Omit<LocationsType, "free"> {
  onDelete: (uuid: string) => void;
}
interface INavigate extends ILocations {
  map: Map | null;
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
  map,
}: INavigate) {
  const _location: LocationData = JSON.parse(location as any);
  let onNavigate = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof location !== "undefined") {
      map?.panTo([_location.coordinates[0], _location.coordinates[1]]);
    }
  };
  return (
    <>
      <NamedNode
        onDelete={onDelete}
        name={name}
        left_uuid={uuid}
        controls={<button onClick={onNavigate}>View On Map</button>}
      >
        <div>
          <p>description: {description ?? "n/a"}</p>
          <p>type: {_location.type}</p>
          <p>
            coordinates: {_location.coordinates[0]}, {_location.coordinates[1]}
          </p>
          <p>encoding type: {encodingType ?? "n/a"}</p>
          <p>uuid: {uuid}</p>
        </div>
      </NamedNode>
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
  const { collection, message, onDelete } = useCollection({
    left,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
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
   * Location of cursor in geo coordinates.
   */
  const [, setCursor] = useState<{ lng: number; lat: number }>({
    lng: DEFAULTS.center[0],
    lat: DEFAULTS.center[1],
  });
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
      map.addLayer({
        id: `home`,
        type: "circle",
        source: {
          type: "geojson",
          generateId: true,
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [
                    location.coords.longitude,
                    location.coords.latitude,
                  ],
                },
                properties: {},
              },
            ],
          },
          attribution: "Oceanics.io",
        },
        paint: {
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-color": "orange",
        },
      });
      map.panTo([location.coords.longitude, location.coords.latitude]);
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
    console.log(collection);
    const features = collection.map(({ location }) => {
      return {
        type: "Feature",
        geometry: JSON.parse(location),
        properties: {},
      };
    });
    const layerId = "query-result";
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      map.removeSource(layerId);
    }
    map.addLayer({
      id: layerId,
      type: "circle",
      source: {
        type: "geojson",
        generateId: true,
        data: {
          type: "FeatureCollection",
          features: features as any,
        },
        attribution: "Oceanics.io",
      },
      paint: {
        "circle-radius": 5,
        "circle-stroke-width": 1,
        "circle-stroke-color": "orange",
      },
    });
  }, [collection, ready, map]);
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

      {collection.map(({ location, ...each }: ILocations) => (
        <Location
          key={each.uuid}
          map={map}
          {...each}
          location={location}
          onDelete={onDelete}
        ></Location>
      ))}
    </div>
  );
}
