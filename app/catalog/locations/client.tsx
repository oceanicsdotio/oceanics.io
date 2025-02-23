"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map } from "mapbox-gl";
import { useSearchParams } from "next/navigation";
// local
import { type Initial, ACTIONS, MessageQueue, messageQueueReducer } from "@catalog/client";
import { Edit as EditGeneric } from "@catalog/[collection]/edit/client";
import { Create } from "@catalog/[collection]/create/client";
import { Linked as LinkedGeneric } from "@app/catalog/[collection]/[related]/client";
import {
  Collection,
  TextInput,
  NumberInput,
  FormArgs,
} from "@catalog/[collection]/client";
import style from "@catalog/page.module.css";
import specification from "@app/../specification.yaml";
import { type Locations as LocationsType } from "@oceanics/app";
/**
 * Number of decimal places in geo-spatial coordinates when automatically
 * determining location. A value of 4 gives good results to within tens
 * of meters. A value of 5 is approximately meter precision.
 */
const GEOLOCATION_PRECISION = 5;
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Locations;
const parameters = specification.components.parameters;
export function Data() {
  return (
    <Collection<LocationsType>
      title={schema.title}
      nav={true}
      AdditionalProperties={AdditionalProperties as any}
    />
  );
}
export function New({}) {
  return (
    <Create<LocationsType> Form={CreateForm} title={schema.title}></Create>
  );
}
export function Edit({}) {
  return (
    <EditGeneric<LocationsType>
      Form={UpdateForm}
      title={schema.title}
    ></EditGeneric>
  );
}
export function Linked({collection}: any) {
  return <LinkedGeneric<LocationsType> collection={collection} related={schema} />;
}
function useRefs() {
  const uuid = useRef<HTMLInputElement>(null);
  const name = useRef<HTMLInputElement >(null);
  const description = useRef<HTMLInputElement>(null);
  const encodingType = useRef<HTMLInputElement>(null);
  const locationType = useRef<HTMLInputElement>(null);
  const locationLatitude = useRef<HTMLInputElement>(null);
  const locationLongitude = useRef<HTMLInputElement>(null);
  const refs = {
    uuid,
    name,
    description,
    encodingType,
    location: {
      type: locationType,
      longitude: locationLongitude,
      latitude: locationLatitude,
    },
  };
  return {
    refs,
  };
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function CreateForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<LocationsType>) {
  /**
   * Form data is synced with user input
   */
  const { refs } = useRefs();
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: refs.uuid.current?.value,
      name: refs.name.current?.value || undefined,
      description: refs.description.current?.value || undefined,
      encodingType: refs.encodingType.current?.value,
      location: {
        type: refs.location.type.current?.value,
        coordinates: [
          refs.location.latitude.current?.valueAsNumber,
          refs.location.longitude.current?.valueAsNumber,
        ],
      },
    };
  };
  /**
   * Update the interface with current location, either on load or manually when the
   * UI button is pressed. This allows the user to change back if a mistake is made
   * without having to reload the page.
   */
  const askForPosition = useCallback(() => {
    const usePosition = (position: GeolocationPosition) => {
      let location = refs.location;
      if (position && location.latitude.current && location.longitude.current) {
        location.latitude.current.value = position.coords.latitude.toFixed(
          GEOLOCATION_PRECISION
        );
        location.longitude.current.value = position.coords.longitude.toFixed(
          GEOLOCATION_PRECISION
        );
      }
    };
    navigator.geolocation.getCurrentPosition(
      usePosition,
      () => {
        console.warn(
          "Unable to obtain client location fix, enter coordinates manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [])
  /**
   * Client Component
   */
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        inputRef={refs.uuid}
        required
        description={schema.properties.uuid.description}
        defaultValue={initial.uuid}
        readOnly
      ></TextInput>
      <TextInput
        name={"name"}
        inputRef={refs.name}
        required
        description={schema.properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={refs.description}
        required
        description={schema.properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"encodingType"}
        inputRef={refs.encodingType}
        defaultValue={schema.properties.encodingType.default}
        description={schema.properties.encodingType.description}
        readOnly
      />
      <TextInput
        name={"type"}
        inputRef={refs.location.type}
        defaultValue={schema.properties.location.properties.type.default}
        description={schema.properties.location.properties.type.description}
        readOnly
      />
      <NumberInput
        name={"latitude"}
        inputRef={refs.location.latitude}
        description={
          "Latitude is in decimal degrees. Click below to populate this based on device location."
        }
        required
        min={-90.0}
        max={90.0}
        step={0.00001}
      ></NumberInput>
      <NumberInput
        name={"longitude"}
        inputRef={refs.location.longitude}
        description={
          "Longitude is in decimal degrees. Click below to populate this based on device location."
        }
        required
        min={-180.0}
        max={180.0}
        step={0.00001}
      ></NumberInput>
      <button
        className={style.submit}
        type="button"
        onClick={askForPosition}
      >
        Use Your Location
      </button>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset">
        Reset
      </button>
    </form>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function UpdateForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<LocationsType>) {
  const location = useMemo(()=>{
    if (typeof initial.location === "undefined") return undefined
    const parsed = JSON.parse(initial.location as any);
    if (parsed.type === "Point") {
      return parsed
    } 
    return {
      type: parsed.type,
      coordinates: ["Multiple", "Multiple"]
    }
  }, [initial]);
  const { refs } = useRefs();
  const onSubmitCallback = useCallback(() => {
    return {
      uuid: refs.uuid.current?.value,
      name: refs.name.current?.value || undefined,
      description: refs.description.current?.value || undefined,
    };
  }, []);
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        inputRef={refs.uuid}
        description={schema.properties.uuid.description}
        defaultValue={initial.uuid}
        readOnly
      ></TextInput>
      <TextInput
        name={"name"}
        inputRef={refs.name}
        description={schema.properties.name.description}
        defaultValue={initial.name}
        readOnly={disabled}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={refs.description}
        description={schema.properties.description.description}
        defaultValue={initial.description}
        readOnly={disabled}
      ></TextInput>
      <TextInput
        name={"encodingType"}
        defaultValue={initial.encodingType}
        description={schema.properties.encodingType.description}
        readOnly
      />
      <TextInput
        name={"type"}
        defaultValue={location?.type}
        description={schema.properties.location.properties.type.description}
        readOnly
      />
      <TextInput
        name={"latitude"}
        defaultValue={location?.coordinates[1]}
        description={
          "Latitude in decimal degrees."
        }
        readOnly
      ></TextInput>
      <TextInput
        name={"longitude"}
        defaultValue={location?.coordinates[0]}
        description={
          "Longitude in decimal degrees."
        }
        readOnly
      ></TextInput>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset" disabled={disabled}>
        Reset
      </button>
    </form>
  );
}
export function AdditionalProperties(each: Initial<LocationsType>) {
  return (
    <>
      <li>description: {each.description ?? "n/a"}</li>
      <li>encoding type: {each.encodingType ?? "n/a"}</li>
    </>
  );
}
const DEFAULTS = {
  zoom: 7,
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
/**
 * Locations View is a MapBox instance that shows
 */
export function View({}) {
  const query = useSearchParams();
  /**
   * MapBox container reference.
   */
  const ref = useRef<HTMLDivElement>(null);
  /**
   * MapBoxGL Map instance saved to React state.
   */
  const [map, setMap] = useState<Map | null>(null);
  /**
   * Status message to understand what is going on in the background.
   */
  const [messages, appendToQueue] = useReducer(messageQueueReducer, []);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.status:
          appendToQueue(data.message);
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case "layer":
          let exists = !!map && !!map.getLayer(data.id);
          if (exists) {
            map?.removeLayer(data.id);
          }
          map?.addLayer(data, "cities");
          return;
        case "source":
          let source_exists = !!map && !!map.getSource(data.id);
          if (source_exists) {
            map?.removeSource(data.id);
          }
          map?.addSource(data.id, data.source);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    [map]
  );
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>(null);
  /**
   * Map is in idle state
   */
  const [ready, setReady] = useState(false);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (worker.current || !ready) return;
    worker.current = new Worker(
      new URL("@catalog/locations/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    let second = new Worker(
      new URL("@catalog/locations/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    second.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
    const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
    const user = localStorage.getItem("gotrue.user");
    worker.current.postMessage({
      type: "getLocations",
      data: {
        user,
        query: {
          left: schema.title,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
    second.postMessage({
      type: "getFileSystem",
      data: {
        user,
        query: {
          url: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com",
        },
      },
    });
    // chnage the worker
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler, ready]);
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
      // map.panTo([location.coords.longitude, location.coords.latitude]);
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
  return (
    <div>
      <MessageQueue messages={messages}/>
      <div className={style.locations}>
        <div className={style.mapbox} ref={ref} />
      </div>
    </div>
  );
}
