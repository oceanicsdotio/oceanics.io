import type { MutableRefObject, RefObject, MouseEventHandler } from "react";
import { Map } from "mapbox-gl";

import { useRef, useState, useEffect, useCallback } from "react";
import useWorker from "../../hooks/useWorker";
import type { OptionalLocation } from "../../hooks/useDetectClient";
import ReactDOM from "react-dom";
import { Popup, AnyLayer, AnySourceData } from "mapbox-gl";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "../PopUp/PopUpContent";
import Squalltalk from "./Squalltalk";

const createBathysphereWorker = () => {
  return new Worker(new URL("./Squalltalk.worker.ts", import.meta.url));
};

/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 *
 * This will also trigger a greater initial zoom level.
 */
export const pulsingDot = ({ size }: { size: number }) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    context: canvas.getContext("2d"),

    // get rendering context for the map canvas when layer is added to the map
    /* eslint-disable @typescript-eslint/no-empty-function */
    onAdd: () => {},

    // called once before every frame where the icon will be used
    render: function () {
      const duration = 1000;
      const time = (performance.now() % duration) / duration;

      const radius = size / 2;
      const ctx: CanvasRenderingContext2D | null = this.context;
      if (!ctx) return false;

      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(radius, radius, radius * (0.7 * time + 0.3), 0, Math.PI * 2);

      ctx.strokeStyle = "orange";
      ctx.lineWidth = 2;
      ctx.stroke();

      // update this image"s data with data from the canvas
      this.data = new Uint8Array(ctx.getImageData(0, 0, size, size).data);

      return true;
    },
  };
};

interface View {
  zoom: number;
  center: [number, number];
}
export interface SqualltalkHook {
  client: {
    mobile: boolean;
    location: OptionalLocation;
  };
  map: {
    accessToken: string;
    defaults: View;
    expand: boolean;
  };
}

/**
 * If the map element has not been created yet, create it with a custom style, and user
 * provided layer definitions.
 *
 * Generally these will be pre-fetched from static assets, but it can
 * also be sourced from an API or database.
 *
 * Only one map context please, need center to have been set.
 */
const useSqualltalk = ({
  map: { accessToken, defaults, expand },
  client: { location },
}: SqualltalkHook) => {
  /**
   * MapBox container reference.
   */
  const ref: MutableRefObject<HTMLDivElement | null> = useRef(null);
  /**
   * MapBoxGL Map instance saved to React state.
   */
  const [map, setMap] = useState<Map | null>(null);
  /**
   * Background worker
   */
  const worker = useWorker(createBathysphereWorker);

  // Start listening to worker messages
  useEffect(() => {
    return worker.listen(({ data }) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "render":
          console.log(data.type, data.data);
        //   map?.addLayer(data.data as AnyLayer);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    });
  }, []);

  /**
   * Resize on load.
   */
  useEffect(() => {
    map?.resize();
  }, [expand]);

  /**
   * Create the MapBoxGL instance.
   *
   * Don't do any work if `ref` has not been assigned to an element,
   * and be sure to remove when component unmounts to clean up workers.
   */
  useEffect(() => {
    if (!ref.current) return;
    const handle: Map = new Map({
      accessToken,
      container: ref.current,
      ...defaults,
    });
    setMap(handle);
    return () => {
      handle.remove();
    };
  }, [ref]);

  /**
   * Current zoom level
   */
  const [zoom, setZoom] = useState<number>(defaults.zoom);

  /**
   * Location of cursor in geo coordinates, updated onMouseMove.
   */
  const [cursor, setCursor] = useState<{ lng: number; lat: number }>({
    lng: defaults.center[0],
    lat: defaults.center[1],
  });

  /**
   * Add a zoom handler that updates state
   */
  useEffect(() => {
    map?.on("zoom", () => {
      setZoom(map.getZoom());
    });
  }, [map]);

  /**
   * Add a mouse move handler to the map
   */
  useEffect(() => {
    map?.on("mousemove", ({ lngLat }) => {
      setCursor(lngLat);
    });
  }, [map]);

  /**
   * Data sets to queue and build layers from.
   */
  const [queue] = useState<unknown[]>([]);

  /**
   * Reorder data sets as they are added.
   */
  const [channelOrder, setChannelOrder] = useState<[string, string][]>([]);

  /**
   * Memoize an addLayer convenience function
   */
  //   const addLayer = (
  //     source: AnySourceData,
  //     layer: AnyLayer,
  //     onClick: MouseEventHandler
  //   ): void => {
  //     map?.addLayer({ source, ...layer });
  //     if (onClick) map?.on("click", layer.id, onClick);
  //   };

  //   const addPopup = (coords: number[]) => {
  //     const placeholder: HTMLElement = document.createElement("div");

  //     ReactDOM.render(
  //       <PopUpContent features={projected} Component={component} />,
  //       placeholder
  //     );

  //     new Popup({
  //       className: "map-popup",
  //       closeButton: false,
  //       closeOnClick: true,
  //     })
  //       .setLngLat(coords.slice(0, 2))
  //       .setDOMContent(placeholder)
  //       .addTo(map);
  //   };

  //   const onReduceFeature = ({ features, lngLat: { lng, lat } }) => {
  //     const reduce = layer.type === "circle" || layer.type === "symbol";

  //     const projected = reduce
  //       ? features.map(({ geometry: { coordinates }, ...props }) => {
  //           while (Math.abs(lng - coordinates[0]) > 180)
  //             coordinates[0] += lng > coordinates[0] ? 360 : -360;
  //           return {
  //             ...props,
  //             coordinates,
  //           };
  //         })
  //       : features;

  //     worker.current
  //       .reduceVertexArray(reduce ? projected : [{ coordinates: [lng, lat] }])
  //       .then(addPopup);
  //   };

  /**
   * Task the web worker with loading and transforming data to add
   * to the MapBox instance as a GeoJSON layer.
   */
  //   useEffect(() => {
  //     if (!map || !queue || !ready) return;
  //     const filterExisting = (x: string): boolean => !map.getLayer(x);

  //     queue
  //       .filter(filterExisting)
  //       .forEach(({ id, behind, standard, url, attribution, ...layer }) => {
  //         setChannelOrder([...channelOrder, [id, behind]]);
  //         worker.current
  //           .getData(url, standard)
  //           .then((source: AnySourceData) => {
  //             addLayer(id, { ...source, attribution }, layer, onReduceFeature);
  //           })
  //           .catch(console.error);
  //       });
  //   }, [map, queue, ready]);

  /**
   * Swap layers to be in the correct order as they are created. Will
   * only trigger once both layers exist.
   *
   * Nice because you can resolve them asynchronously without worrying
   * about creation order.
   */
  useEffect(() => {
    if (!map) return;
    channelOrder.forEach(([back, front]) => {
      if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front);
    });
  }, [channelOrder]);

  /**
   * Use the worker to create the point feature for the user location.
   */
  useEffect(() => {
    if (!map || !location) return;
    worker.post({
      type: "home",
      data: {
        coordinates: location.coords,
        iconImage: "home",
      },
    });
  }, [map]);

  /**
   * Pan to user location immediately when updated.
   */
  useEffect(() => {
    if (!location) return;
    map?.panTo([location.coords.longitude, location.coords.latitude]);
  }, [location, map]);

  /**
   * Create home animation image
   */
    useEffect(() => {
      if (map?.hasImage("home")) return;
      map?.addImage("home", pulsingDot({ size: 32 }));
    }, [map]);

  return {
    map,
    ref,
    cursor,
    zoom,
  };
};

export default useSqualltalk;
