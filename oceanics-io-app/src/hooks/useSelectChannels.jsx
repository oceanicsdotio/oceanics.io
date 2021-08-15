/**
 * React and friends.
 */
 import { useState, useEffect, RefObject, useCallback, MouseEventHandler } from "react";

 /**
  * Component-level styling.
  */
 import styled from "styled-components";
 
 
 import ReactDOM from "react-dom";
 import { Popup, AnyLayer, AnySourceData } from "mapbox-gl";
 
 /**
  * Container for MapboxGL feature content. Rendered client-side.
  */
 import PopUpContent from "oceanics-io-ui/build/components/Catalog/PopUpContent";
 import Catalog from "oceanics-io-ui/build/components/Catalog/Catalog";
 import Pane from "./Pane";
 import {pulsingDot, columnSize} from "../utils";
 
 /**
  * Dedicated Worker loader.
  */
 // import useWasmWorkers from "../hooks/useWasmWorkers";
 // import useFragmentQueue from "../hooks/useFragmentQueue";
 // @ts-ignore
 import useMapBox from "../hooks/useMapBox";
 import ControlPane from "../components/ControlPane";
 
 
 type ApplicationType = {
     className?: string;
     location: {
         coords: {
             latitude: string;
             longitude: string;
         };
     };
     mobile: boolean;
     worker: {
         worker: RefObject<any>;
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
 const AppPage: FC<ApplicationType> = ({
     className,
     mobile,
     location,
     worker: {
         worker,
         status: {
             ready
         }
     },
     channels: {
         geojson
     },
     expand
 }) => {
     /**
      * MapBoxGL Map instance is saved to React state. 
      */
     const { map, ref, zoom } = useMapBox({ expand });
 
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
     const [queue, setQueue] = useState<unknown[]>([]);
 
     /**
      * Reorder data sets as they are added.
      */
     const [channelOrder, setChannelOrder] = useState<[string,string][]>([]);
 
     /**
      * Memoize an addLayer convenience function
      */
     const addLayer = useCallback((
         source: AnySourceData, 
         layer: AnyLayer, 
         onClick: MouseEventHandler
     ): void => {
         if (!map) return;
         map.addLayer({ source, ...layer });
         if (onClick) map.on('click', layer.id, onClick);
     }, [map]);
 
     const addPopup = useCallback((coords: number[]) => {
 
         const placeholder: HTMLElement = document.createElement('div');
 
         ReactDOM.render(
             <PopUpContent features={projected} Component={component} />,
             placeholder
         );
 
         (new Popup({
             className: "map-popup",
             closeButton: false,
             closeOnClick: true
         })
             .setLngLat(coords.slice(0, 2))
             .setDOMContent(placeholder)
         ).addTo(map);
     }, [map]);
 
 
     const onReduceFeature = useCallback( ({ features, lngLat: { lng, lat } }) => {
 
         const reduce = (layer.type === "circle" || layer.type === "symbol");
 
         const projected = reduce ? features.map(({ geometry: { coordinates }, ...props }) => {
             while (Math.abs(lng - coordinates[0]) > 180)
                 coordinates[0] += lng > coordinates[0] ? 360 : -360;
             return {
                 ...props,
                 coordinates
             }
         }) : features;
 
         worker.current.reduceVertexArray(
             reduce ? projected : [{ coordinates: [lng, lat] }]
         ).then(addPopup);
     }, [worker, addPopup, features]);
 
     /**
      * Task the web worker with loading and transforming data to add
      * to the MapBox instance as a GeoJSON layer. 
      */
     useEffect(() => {
         if (!map || !queue || !ready) return;
 
         const filterExisting = (x: string): boolean => !map.getLayer(x);
 
         queue.filter(filterExisting).forEach(({
             id,
             behind,
             standard,
             url,
             component,
             attribution,
             ...layer
         }) => {
 
             setChannelOrder([...channelOrder, [id, behind]]);
             worker.current.getData(url, standard).then((source: AnySourceData) => {
                 addLayer(id, {...source, attribution}, layer, onReduceFeature);
             }).catch(console.error);
         });
 
     }, [map, queue, ready]);
 
     /**
      * Swap layers to be in the correct order as they are created. Will
      * only trigger once both layers exist.
      * 
      * Nice because you can resolve them asynchronously without worrying 
      * about creation order.
      */
     useEffect(() => {
         channelOrder.forEach(([back, front]) => {
             if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front)
         });
     }, [channelOrder]);
 
 
     /**
      * Use the worker to create the point feature for the user location.
      */
     useEffect(() => {
         if (!map || !worker.current || !location) return;
         // @ts-ignore
         worker.current.userLocation([
             location.coords.longitude,
             location.coords.latitude
         ]).then(map.addLayer);
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
 
     return {
         
     }
 };
 