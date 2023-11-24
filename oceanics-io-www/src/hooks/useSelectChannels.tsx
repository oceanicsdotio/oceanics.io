// @ts-nocheck
import {
  useState,
  useEffect,
  RefObject,
  useCallback,
  MouseEventHandler,
} from "react";

import ReactDOM from "react-dom";
import { Popup, AnyLayer, AnySourceData } from "mapbox-gl";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "../components/Catalog/PopUpContent";
import useMapBox from "./useMapBox";


/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 * 
 * This will also trigger a greater initial zoom level.
 */
 export const pulsingDot = ({
  size
}: {
  size: number;
}) => {
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
      onAdd: () => { },

      // called once before every frame where the icon will be used
      render: function () {
          const duration = 1000;
          const time = (performance.now() % duration) / duration;

          const radius = size / 2;
          const ctx: CanvasRenderingContext2D|null = this.context;
          if (!ctx) return false;

          ctx.clearRect(0, 0, size, size);
          ctx.beginPath();
          ctx.arc(
              radius,
              radius,
              radius * (0.7 * time + 0.3),
              0,
              Math.PI * 2
          );

          ctx.strokeStyle = "orange";
          ctx.lineWidth = 2;
          ctx.stroke();

          // update this image"s data with data from the canvas
          this.data = new Uint8Array(ctx.getImageData(
              0,
              0,
              size,
              size
          ).data);

          return true;
      }
  }
};


type ApplicationType = {
  location: {
    coords: {
      latitude: string;
      longitude: string;
    };
  };
  mobile: boolean;
  worker: {
    worker: RefObject<Worker>;
    status: {
      ready: boolean;
    };
  };
  channels: {
    geojson: AnyLayer[];
  };
  expand: boolean;
};

/**
 * Page component rendered by GatsbyJS.
 */
export const useSelectChannels = ({
  location,
  worker: {
    worker,
    status: { ready },
  },
  expand,
}: ApplicationType) => {
  /**
   * MapBoxGL Map instance is saved to React state.
   */
  const { map} = useMapBox({ expand });

  /**
   * Hoist the resize function on map to the parent
   * interface.
   */
  useEffect(() => {
    if (map) map.resize();
  }, [expand]);

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
  const addLayer = useCallback(
    (
      source: AnySourceData,
      layer: AnyLayer,
      onClick: MouseEventHandler
    ): void => {
      if (!map) return;
      map.addLayer({ source, ...layer });
      if (onClick) map.on("click", layer.id, onClick);
    },
    [map]
  );

  const addPopup = useCallback(
    (coords: number[]) => {
      const placeholder: HTMLElement = document.createElement("div");

      ReactDOM.render(
        <PopUpContent features={projected} Component={component} />,
        placeholder
      );

      new Popup({
        className: "map-popup",
        closeButton: false,
        closeOnClick: true,
      })
        .setLngLat(coords.slice(0, 2))
        .setDOMContent(placeholder)
        .addTo(map);
    },
    [map]
  );

  const onReduceFeature = useCallback(
    ({ features, lngLat: { lng, lat } }) => {
      const reduce = layer.type === "circle" || layer.type === "symbol";

      const projected = reduce
        ? features.map(({ geometry: { coordinates }, ...props }) => {
            while (Math.abs(lng - coordinates[0]) > 180)
              coordinates[0] += lng > coordinates[0] ? 360 : -360;
            return {
              ...props,
              coordinates,
            };
          })
        : features;

      worker.current
        .reduceVertexArray(reduce ? projected : [{ coordinates: [lng, lat] }])
        .then(addPopup);
    },
    [worker, addPopup, features]
  );

  /**
   * Task the web worker with loading and transforming data to add
   * to the MapBox instance as a GeoJSON layer.
   */
  useEffect(() => {
    if (!map || !queue || !ready) return;

    const filterExisting = (x: string): boolean => !map.getLayer(x);

    queue
      .filter(filterExisting)
      .forEach(
        ({ id, behind, standard, url, attribution, ...layer }) => {
          setChannelOrder([...channelOrder, [id, behind]]);
          worker.current
            .getData(url, standard)
            .then((source: AnySourceData) => {
              addLayer(id, { ...source, attribution }, layer, onReduceFeature);
            })
            .catch(console.error);
        }
      );
  }, [map, queue, ready]);

  /**
   * Swap layers to be in the correct order as they are created. Will
   * only trigger once both layers exist.
   *
   * Nice because you can resolve them asynchronously without worrying
   * about creation order.
   */
  useEffect(() => {
    if (typeof map === "undefined") return;
    channelOrder.forEach(([back, front]) => {
      if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front);
    });
  }, [channelOrder]);

  /**
   * Use the worker to create the point feature for the user location.
   */
  useEffect(() => {
    if (!map || !worker.current || !location) return;
    worker.current
      .userLocation([location.coords.longitude, location.coords.latitude])
      .then(map.addLayer);
  }, [worker, location, map]);

  /**
   * Pan to user location immediately.
   */
  useEffect(() => {
    if (!map || !location) return;
    map.panTo([location.coords.longitude, location.coords.latitude]);
  }, [location, map]);

  /**
   * Create home animation image
   */
  useEffect(() => {
    if (!map || map.hasImage("home")) return;
    map.addImage("home", pulsingDot({ size: 32 }));
  }, [map]);

  return {};
}

export default useSelectChannels