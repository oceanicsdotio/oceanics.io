"use client";
import Markdown from "react-markdown";
import React, { useRef, useEffect } from "react";
import useCatalog from "./useCatalog";
import styles from "./catalog.module.css";
import useSqualltalk from "./useSqualltalk";
import 'mapbox-gl/dist/mapbox-gl.css';


export interface IOpenApi {
  /**
   * Source on the server to fetch the JSON
   * specification from.
   */
  src: string;
}

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

/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Catalog({ src }: IOpenApi) {
  const worker = useRef<Worker>();
  useEffect(() => {
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  }, []);

  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const { api } = useCatalog({ src, worker });
  const { ref } = useSqualltalk({
    client: {
      mobile: false
    }
  });

  return (
    <div className={styles.api}>
      <div ref={ref} />
      <h1>{api.info.title}</h1>
      <Markdown>{api.info.description}</Markdown>
      {api.operations.map((operation) => {
        const requestBodyId = `${operation.path}-${operation.method}-request-body`;
        const requestQueryId = `${operation.path}-${operation.method}-query`;
        return (
          <div key={operation.summary}>
            <h2>{operation.summary}</h2>
            <h3>path</h3>
            <Markdown>{`\`${operation.path}\``}</Markdown>
            <h3>method</h3>
            <Markdown>{operation.method.toUpperCase()}</Markdown>
            <h3>description</h3>
            <Markdown>{operation.description}</Markdown>
            <form id={requestBodyId} className={styles.form}>
              <h1>{"request body"}</h1>
              {(operation.requestBody ?? []).map(
                ({ description, ...props }) => (
                  <div key={`${requestBodyId}-${props.id}`}>
                    <label htmlFor={props.id}>{props.name}</label>
                    <input {...props} />
                    <div>{description}</div>
                  </div>
                )
              )}
            </form>
            <form id={requestQueryId} className={styles.form}>
              <h1>{"query parameters"}</h1>
              {(operation.parameters ?? []).map(({ description, ...props }) => (
                <div key={`${requestQueryId}-${props.id}`}>
                  <label htmlFor={props.id}>{props.name}</label>
                  <input {...props} />
                  <div>{description}</div>
                </div>
              ))}
            </form>
          </div>
        );
      })}
    </div>
  );
}
