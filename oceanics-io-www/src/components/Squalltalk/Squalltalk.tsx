import React, { useEffect } from "react";

import useSqualltalk from "./useSqualltalk";
import useWorker from "../../hooks/useWorker";
import useFragmentQueue, {
  OBJECT_STORAGE_URL,
} from "../../hooks/useFragmentQueue";
import useObjectStorage from "./useObjectStorage";

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

interface View {
  zoom: number
  center?: [number, number]
}
export interface ViewParams extends View {
  accessToken: string
}
export interface ISqualltalk {
  client?: {
    mobile: boolean;
    location: OptionalLocation;
  };
  map: {
    accessToken: string;
    defaults: View;
  };
  height?: string;
}

/**
 * Page component rendered by GatsbyJS.
 */
const Squalltalk = ({ map, height = "500px" }: ISqualltalk) => {
  const { ref, map: mapBox } = useSqualltalk(map);
  const worker = useWorker(createBathysphereWorker);
  const fs = useObjectStorage(OBJECT_STORAGE_URL, worker.ref);

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

Squalltalk.displayName = "Squalltalk";
export default Squalltalk;
