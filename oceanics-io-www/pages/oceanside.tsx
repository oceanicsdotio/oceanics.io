/**
 * React and friends.
 */
import React, { useEffect } from "react";
import type { FC } from "react";
import { GetStaticProps } from "next";
import { readIcons, parseIconMetadata } from "../src/next-util";
import styled from "styled-components";

/**
 * Hooks for data handling.
 */
import useOceansideWorld from "../src/hooks/useOceansideWorld";
import useOceansideBoard from "../src/hooks/useOceansideBoard";
import useWasmRuntime from "../src/hooks/useWasmRuntime";
import useSharedWorkerState from "../src/hooks/useSharedWorkerState";
import type {IWorld} from "../src/hooks/useOceansideWorld";

/**
 * Page-specific typings.
 */
interface ApplicationType extends IWorld {
  className?: string;
  icons: {
    sources: any;
    templates: any;
  }
};

/**
 * Webpack needs a static path at build time to make loadable chunks
 * from the worker script. There is probably a more clever way to do
 * this. 
 */
const createBathysphereWorker = () => {
  return new Worker(
      new URL("../src/workers/useBathysphereApi.worker.ts", import.meta.url)
  );
}

/**
 * Page component rendered by NextJS.
 */
const AppPage: FC<ApplicationType> = ({ className, ...props }) => {
  /**
   * Single runtime for AppPage context
   */
  const {runtime} = useWasmRuntime();

  /**
   * Dedicated worker for performing numerical computation and text
   * analysis in the background. 
   */
  const worker = useSharedWorkerState("bathysphere");

  /**
   * Digital elevation map of the synthetic terrain, with a 
   * probability table of feature types for world-building
   */
  const world = useOceansideWorld({...props, runtime, worker: worker.ref});
  const board = useOceansideBoard({worker: worker.ref, runtime, world})

  /**
   * Required to start the background WASM runtime. 
   */
  useEffect(() => {
    worker.start(createBathysphereWorker());
  }, []);

  return (
    <div className={className}>
      <canvas {...world.canvas} className={"world"}/>
      <canvas {...board.canvas} className={"board"}/>
    </div>
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

  & canvas {
    image-rendering: crisp-edges;
  }
  & .world {
    display: none;
    width: 256px;
    height: 256px;
  }
  & .board {
    width: 512px;
    height: 512px;
  }
`;

AppPage.displayName = "Oceanside";
export default StyledIndex;

export const getStaticProps: GetStaticProps = () => {
  return {
    props: {
      description: "",
      title: "Oceanside",
      size: 64,
      grid: {
        size: 8
      },
      datum: 0.7,
      runtime: null,
      icons: {
        sources: readIcons(),
        templates: parseIconMetadata()
      }
    }
  };
}