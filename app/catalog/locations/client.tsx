"use client";
import specification from "@app/../specification.json";
import type { LocationData, Locations as LocationsType } from "@oceanics/app";
import React, {
  useRef,
  useEffect,
  useState,
  type MutableRefObject,
} from "react";
import styles from "@catalog/page.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map } from "mapbox-gl";
import { NamedNode, useCollection } from "@catalog/client";

import style from "@catalog/page.module.css";
import {TextInput, NumberInput, TextSelectInput} from "@catalog/client";
import {v7 as uuid7} from "uuid";

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
const { parameters } = specification.components;

interface ILocations extends Omit<LocationsType, "free"> {
  onDelete: (uuid: string) => void;
}
interface INavigate extends ILocations {
  map: Map | null;
}

/**
 * Number of decimal places in geospatial coordinates when automatically
 * determining location. A value of 4 gives good results to within tens
 * of meters. A value of 5 is approximately meter precision.
 */
const GEOLOCATION_PRECISION = 5;
/**
 * OpenAPI schema information used in the interface.
 */
const { properties, title, description } = specification.components.schemas.Locations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const _description = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLSelectElement | null>(null);
  const locationType = useRef<HTMLSelectElement | null>(null);
  const locationLatitude = useRef<HTMLInputElement | null>(null);
  const locationLongitude = useRef<HTMLInputElement | null>(null);
  /**
   * Geolocation data
   */
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmitCreate, disabled, formRef: create, message } = useCollection({
    left: title,
    limit: 100,
    offset: 0
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      encodingType: encodingType.current?.value,
      location: {
        type: locationType.current?.value,
        coordinates: [
          locationLatitude.current?.valueAsNumber,
          locationLongitude.current?.valueAsNumber
        ]
      }
    };
  };
  /**
   * On geolocation fix, save to client information.
   */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      setPosition,
      () => {
        console.warn("Unable to obtain client location fix, enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);
  /**
   * Update the interface with current location, either on load or manually when the 
   * UI button is pressed. This allows the user to change back if a mistake is made
   * without having to reload the page.
   */
  const usePosition = () => {
    if (position && locationLatitude.current && locationLongitude.current) {
      locationLatitude.current.value = position.coords.latitude.toFixed(GEOLOCATION_PRECISION);
      locationLongitude.current.value = position.coords.longitude.toFixed(GEOLOCATION_PRECISION);
    }
  }
  /**
   * Once we have saved client info, update the interface automatically. We prevent
   * the coordinates from populating the interface if there is already a valid user
   * input. This allows us to refresh device position without necessarily overriding
   * actions.
   */
  useEffect(() => {
    if (
      position && 
      locationLatitude.current && 
      locationLongitude.current && 
      !locationLongitude.current.value && 
      !locationLatitude.current.value
    ) {
      usePosition()
    }
  },[position])
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmitCreate(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={uuid7()}
          readOnly={true}
        ></TextInput>
        <TextInput
          name={"name"}
          inputRef={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          inputRef={_description}
          required
          description={properties.description.description}
        ></TextInput>
        <TextSelectInput
          name={"encodingType"}
          inputRef={encodingType}
          defaultValue={properties.encodingType.default}
          description={properties.encodingType.description}
          options={properties.encodingType.enum}
        />
        <TextSelectInput
          name={"type"}
          inputRef={locationType}
          defaultValue={properties.location.properties.type.default}
          description={properties.location.properties.type.description}
          options={["Point"]}  // properties.location.properties.type.enum
        />
        <NumberInput
          name={"latitude"}
          inputRef={locationLatitude}
          description={"Latitude is in decimal degrees. Click below to populate this based on device location."}
          required
          min={-90.0}
          max={90.0}
          step={0.00001}
        ></NumberInput>
        <NumberInput
          name={"longitude"}
          inputRef={locationLongitude}
          description={"Longitude is in decimal degrees. Click below to populate this based on device location."}
          required
          min={-180.0}
          max={180.0}
          step={0.00001}
        ></NumberInput>
        <button className={style.submit} type="button" disabled={!position} onClick={usePosition}>
          Use Device Coordinates
        </button>
        <button className={style.submit} disabled={disabled}>
          Create Location
        </button>
      </form>

    </>
  );
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
        name={name}
        uuid={uuid}
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
    left: title,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
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
