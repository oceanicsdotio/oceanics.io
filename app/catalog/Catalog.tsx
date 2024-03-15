"use client";
import Markdown from "react-markdown";
import React, { useRef, useEffect, type MouseEventHandler, Suspense, useMemo } from "react";
import useCatalog, {type Operation} from "./useCatalog";
import styles from "./Catalog.module.css";
import "mapbox-gl/dist/mapbox-gl.css";

const DEFAULT_MAP_PROPS = {
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
   * Hook for Styled Components to apply CSS
   */
  className?: string;
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
  type,
  className,
  component = "default",
  maxzoom = 21,
  minzoom = 1,
  zoomLevel,
  info = "",
  onClick,
}: ChannelType) {
  const inView = zoomLevel >= minzoom && zoomLevel <= maxzoom;
  return (
    <div className={className}>
      <h1>{id.replace(/-/g, " ")}</h1>
      <div className={"zoom"}>
        <div className={inView ? "visible" : ""}>
          {`zoom: ${minzoom}-${maxzoom}`}
        </div>
      </div>
      <a
        onClick={onClick}
      >{`< render as ${type} with <${component}/> popup`}</a>
      <a href={url}>{"> download"}</a>
      <a href={info}>{"> attribution"}</a>
    </div>
  );
}


function ApiOperation(operation: Operation) {
  const requestParams = (operation.requestBody ?? []).map((props) => {
    return { key: `request-body-${props.id}`, ...props };
  });
  const queryParams = (operation.parameters ?? []).map((props) => {
    return { key: `query-${props.id}`, ...props };
  });
  let formUniqueId = `${operation.path}-${operation.method}`;
  return (
    <form key={formUniqueId} id={formUniqueId} className={styles.form}>
      <h2>{operation.summary}</h2>
      <h3>path</h3>
      <code>{operation.path}</code>
      <h3>method</h3>
      <code>{operation.method.toUpperCase()}</code>
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

/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Catalog({
  src,
  zoomLevel,
}: {
  /**
   * Source on the server to fetch the JSON
   * specification from.
   */
  src: string;
  /**
   * Current zoom level
   */
  zoomLevel: number;
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
   * List of collections to build selection from.
   *
   * If there is no `behind`, can be inserted in front, otherwise need to find the index
   * of the behind value, and insert after.
   */
  // const validLayerOrder = (channels: ChannelType[]) => {

  //     // Memoize just ID and BEHIND
  //     const triggers = {};

  //     // Queue to build
  //     const layerQueue: number[] = [];

  //     channels.forEach(({behind=null, id}) => {

  //         // no behind value
  //         if (behind === null) {
  //             queue.push(id);
  //             return;
  //         }

  //         // find behind value
  //         const ind = layerQueue.findIndex(behind);

  //         if (ind === -1) {
  //             if (behind in triggers) {
  //                 triggers[behind].push(id)
  //             } else {
  //                 triggers[behind] = [id]
  //             }
  //             return;
  //         }

  //         layerQueue.splice(ind+1, 0, id);

  //     });
  // }

  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const { api, ref } = useCatalog({
    src,
    worker,
    map: {
      accessToken: "",
      defaults: DEFAULT_MAP_PROPS as any,
    },
  });

  const operations = useMemo(() => api.operations.map(ApiOperation), [api])

  return (
    <div className={styles.catalog}>
      <div ref={ref} />
      <div className={styles.catalog}>
        <Channel
          zoomLevel={zoomLevel}
          id="home"
          url="www.oceanics.io"
          maxzoom={21}
          minzoom={1}
          type="point"
          component="Location"
          info="www.oceanics.io"
          onClick={() => {
            console.log("click");
          }}
        />
      </div>
      <h1>{api.info.title}</h1>
      <Markdown>{api.info.description}</Markdown>
      <Suspense>{operations}</Suspense>
    </div>
  );
}
