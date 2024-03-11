import type { MutableRefObject, MouseEventHandler } from "react";
import { Map, Popup } from "mapbox-gl";
import { useRef, useState, useEffect } from "react";
import useWorker from "../../hooks/useWorker";
import type { OptionalLocation } from "../../hooks/useDetectClient";
// import ReactDOM from "react-dom";
import type { AnyLayer, AnySourceData, Style } from "mapbox-gl";
// import PopUpContent from "../PopUp/PopUpContent";
// import Squalltalk from "./Squalltalk";

export type FileObject = {
  key: string;
  updated: string;
  size: number; 
}

export type FileSystem = {
  objects: FileObject[];
};
/**
 * Storage target.
 */
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";
const PREFIX = "MidcoastMaineMesh";
export const OBJECT_STORAGE_URL = `${TARGET}?prefix=${PREFIX}/necofs_gom3_mesh/nodes/`;


/**
 * Dedicated Worker loader
 */
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
  antialias: boolean;
  pitchWithRotate: boolean;
  dragRotate: boolean;
  touchZoomRotate: boolean;
  style: Style;
}
export interface SqualltalkHook {
  client: {
    mobile: boolean;
    location: OptionalLocation;
    source: string;
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
  client: { location, ...client },
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
   * MapBoxGL Map instance saved to React state.
   */
  const [ready, setReady] = useState(false);

  /**
   * Background worker
   */
  const worker = useWorker(createBathysphereWorker);

  /**
   * Memoize the metadata for the assets in object storage
   */
  const [fileSystem, setFileSystem] = useState<FileSystem|null>(null);

  /**
   * Get the asset metadata from object storage service
   */
  useEffect(() => { 
    worker.post({
      type: "storage",
      data: {
        url: client.source
      }
    });
  }, []);

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
    handle.on("idle", () => {
      setReady(true);
    });
    handle.on("zoom", () => {
      setZoom(handle.getZoom());
    });
    handle.on("mousemove", ({ lngLat }) => {
      setCursor(lngLat);
    });
    setMap(handle);
    return () => {
      handle.remove();
    };
  }, [ref]);

  /**
   * Resize on load or UI change.
   */
  useEffect(() => {
    map?.resize();
  }, [map, expand]);

  // Start listening to worker messages
  useEffect(() => {
    if (!ready) return;
    return worker.listen(({ data }) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "source":
          console.log(data.type, data.data);
          map?.addSource(...data.data as [string, AnySourceData]);
          return;
        case "layer":
          console.log(data.type, data.data);
          map?.addLayer(data.data as AnyLayer);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        case "storage":
          console.log(data.type, data.data)
          setFileSystem(data.data as FileSystem);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    });
  }, [ready]);

  /**
   * Use the worker to create the point feature for the user location.
   * Create home animation image.
   */
  useEffect(() => {
    if (!ready || !location) return;
    if (!map?.hasImage("home")) {
      map?.addImage("home", pulsingDot({ size: 32 }));
    }
    worker.post({
      type: "home",
      data: {
        coordinates: [location.coords.longitude, location.coords.latitude],
        iconImage: "home",
      },
    });
  }, [ready, location]);

  /**
   * Pan to user location immediately when updated.
   */
  useEffect(() => {
    if (!location) return;
    map?.panTo([location.coords.longitude, location.coords.latitude]);
  }, [ready, location]);

  /**
   * The queue is an array of remote data assets to fetch and process.
   * Updating the queue triggers `useEffect` hooks depending on whether
   * visualization elements have been passed in or assigned externally.
   */
  const [queue, setQueue] = useState<FileObject[]>([]);

  /**
   * Reorder data sets as they are added.
   */
  const [channelOrder] = useState<[string, string][]>([]);

  /**
   * By default set the queue to the fragments listed in the response
   * from S3 object storage queries.
   */
  useEffect(() => {
    if (fileSystem) setQueue(fileSystem.objects);
  }, [fileSystem]);

  /**
   * Request all fragments sequentially.
   *
   * All of this should be cached by the browser
   */
  useEffect(() => {
    if (!ready || !queue.length) return;
    const key = queue[0].key;
    setQueue(queue.slice(1, queue.length));
    if (map?.getLayer(`mesh-${key}`)) return;
    worker.post({
      type: "fragment",
      data: [TARGET, key],
    });
  }, [ready, worker, queue]);

  /**
   * Memoize an addLayer convenience function
   */
  // const addLayer = (
  //   source: AnySourceData,
  //   layer: AnyLayer,
  //   onClick: MouseEventHandler
  // ): void => {
  //   map?.addLayer({ source, ...layer });
  //   if (onClick) map?.on("click", layer.id, onClick);
  // };

  // const addPopup = (coords: number[]) => {
  //   const placeholder: HTMLElement = document.createElement("div");

  //   ReactDOM.render(
  //     // <PopUpContent features={projected} Component={component} />,
  //     <div />,
  //     placeholder
  //   );

  //   if (!map) return;
  //   new Popup({
  //     className: "map-popup",
  //     closeButton: false,
  //     closeOnClick: true,
  //   })
  //     .setLngLat(coords.slice(0, 2) as [number, number])
  //     .setDOMContent(placeholder)
  //     .addTo(map);
  // };

  /**
   * Task the web worker with loading and transforming data to add
   * to the MapBox instance as a GeoJSON layer.
   */
  useEffect(() => {
    if (!map || !queue || !ready) return;
    // const filterExisting = (x: string): boolean => !map.getLayer(x);

    // queue
    //   .filter(filterExisting)
    //   .forEach(({ id, behind, standard, url, attribution, ...layer }) => {
    //     setChannelOrder([...channelOrder, [id, behind]]);
    //     worker.current
    //       .getData(url, standard)
    //       .then((source: AnySourceData) => {
    //         addLayer(id, { ...source, attribution }, layer, onReduceFeature);
    //       })
    //       .catch(console.error);
    //   });
  }, [map, queue, ready]);

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

  return {
    map,
    ref,
    cursor,
    zoom,
    fileSystem
  };
};

export default useSqualltalk;
