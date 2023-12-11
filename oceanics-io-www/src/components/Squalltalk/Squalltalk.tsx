import React from "react";
import useSqualltalk from "./useSqualltalk";
import type {SqualltalkHook} from "./useSqualltalk"


export const DEFAULT_MAP_PROPS = {
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

export interface ISqualltalk extends SqualltalkHook {
  height: string;
}

/**
 * Mapping and data visualization interface
 */
const Squalltalk = ({ height, ...props }: ISqualltalk) => {
  const { ref } = useSqualltalk(props);
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
