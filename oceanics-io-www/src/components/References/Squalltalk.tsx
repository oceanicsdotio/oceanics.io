import React, { useEffect } from "react";

import useMapBox from "../../hooks/useMapBox";
import useWorker from "../../hooks/useWorker";
import useFragmentQueue, {
  OBJECT_STORAGE_URL,
} from "../../hooks/useFragmentQueue";
import useObjectStorage from "../../hooks/useObjectStorage";

import type {OptionalLocation} from "../../hooks/useDetectClient";

export const DEFAULT_MAP_PROPS = {
  zoom: 10,
  antialias: false,
  pitchWithRotate: false,
  dragRotate: false,
  touchZoomRotate: false,
  center: [-70, 43.7],
  style: {
    version: 8,
    name: "Dark",
    sources: {
      mapbox: {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8",
      },
    },
    sprite: "mapbox://sprites/mapbox/dark-v10",
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

const createBathysphereWorker = () => {
  return new Worker(
    new URL("../../workers/useBathysphereApi.worker.ts", import.meta.url)
  );
};

interface ISqualltalk {
  client?: {
    mobile: boolean;
    location: OptionalLocation;
  };
  map: {
    accessToken: string;
    defaults: {
      zoom: number;
      center?: [number, number];
    };
  };
  height?: string;
}

/**
 * Page component rendered by GatsbyJS.
 */
const Squalltalk = ({ map, client, height = "500px" }: ISqualltalk) => {
  const { ref, map: mapBox } = useMapBox(map);
  const worker = useWorker("bathysphere", createBathysphereWorker);
  const fs = useObjectStorage(OBJECT_STORAGE_URL, worker.ref);

  /**
   * Map interface may be used in a location-aware way, or as a static presentation
   * of data at a chosen point. 
   */
  useEffect(() => {
    if (typeof client === "undefined") return;
    if (!client.location) return;
    console.log({client})
  }, [ client ])

  /**
   * Load vertex array buffers from cloud storage. 
   */
  useFragmentQueue({ worker: worker.ref, map: mapBox, fs });

  return (
    <>
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css"
        rel="stylesheet"
      />
      <div style={{ height }} ref={ref} />
    </>
  );
};

export const Standalone = ({center, zoom}: {center: [number, number], zoom: number}) => {
  return (
    <Squalltalk
      height={"250px"}
      map={{
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN??"",
        defaults: {
            ...DEFAULT_MAP_PROPS,
            center,
            zoom
        },
      }}
    />
  );
};

Squalltalk.displayName = "Squalltalk";
export default Squalltalk;
