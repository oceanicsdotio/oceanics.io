/**
 * React and friends.
 */
import React, {useEffect} from "react";
import type { FC } from "react";
import { GetStaticProps } from "next";

/**
 * Component-level styling.
 */
import styled from "styled-components";
import useMapBox from "oceanics-io-ui/build/hooks/useMapBox";

import useWasmRuntime from "../src/hooks/useWasmRuntime";
import useSharedWorkerState from "../src/hooks/useSharedWorkerState";


const createBathysphereWorker = () => {
  return new Worker(
      new URL("../src/workers/useBathysphereApi.worker.ts", import.meta.url)
  );
}

const createObjectStorageWorker = () => {
  return new Worker(
      new URL("../src/workers/useObjectStorage.worker.ts", import.meta.url)
  );
}

const createOpenApiLoaderWorker = () => {
  return new Worker(
      new URL("../src/workers/useOpenApiLoader.worker.ts", import.meta.url)
  );
}

type ApplicationType = {
  className?: string;
  map: {
    accessToken: string;
    defaults: {
      zoom: number;
    };
  };
};

/**
 * Page component rendered by GatsbyJS.
 */
const AppPage: FC<ApplicationType> = ({ map }) => {
    
  const { ref } = useMapBox(map);

  const bathysphereWorker = useSharedWorkerState("bathysphereApi");
  const objectStorageWorker = useSharedWorkerState("S3");
  const openApiWorker = useSharedWorkerState("openApiLoader");
  const {runtime} = useWasmRuntime();

  useEffect(() => {
      if (runtime) console.log("Runtime ready")
  }, [runtime])

  useEffect(() => {
      bathysphereWorker.start(createBathysphereWorker());
  }, []);

  useEffect(() => {
      objectStorageWorker.start(createObjectStorageWorker());
  }, []);

  useEffect(() => {
      openApiWorker.start(createOpenApiLoaderWorker());
  }, []);

  return (
    <>
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css"
        rel="stylesheet"
      />
      <div style={{ height: "500px" }} ref={ref} />
    </>
  );
};

/**
 * Styled version of page exported by default.
 */
const StyledIndex = styled(AppPage)`
  display: block;
  margin: 0;
  padding: 0;
  width: 100%;
`;

AppPage.displayName = "Squalltalk";
export default StyledIndex;

export const getStaticProps: GetStaticProps = () =>
  Object({
    props: {
      description: "",
      title: "Squalltalk",
      map: {
        accessToken: process.env.MAPBOX_ACCESS_TOKEN,
        defaults: {
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
                  "text-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    4,
                    9,
                    6,
                    12,
                  ],
                },
                paint: {
                  "text-color": "#ccc",
                  "text-halo-width": 2,
                  "text-halo-color": "#000",
                },
              },
            ],
          },
        },
      },
    },
  });
