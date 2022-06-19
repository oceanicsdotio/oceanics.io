/**
 * React and friends.
 */
import React, { useEffect } from "react";
import type { FC } from "react";
import styled from "styled-components";

/**
 * Hooks for data handling.
 */
import useOceansideWorld from "../hooks/useOceansideWorld";
import useOceansideBoard from "../hooks/useOceansideBoard";
import useWasmRuntime from "../hooks/useWasmRuntime";
import useSharedWorkerState from "../hooks/useSharedWorkerState";
import type {IWorld} from "../hooks/useOceansideWorld";

/**
 * Page-specific typings.
 */
export interface ApplicationType extends IWorld {
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
      new URL("../workers/useBathysphereApi.worker.ts", import.meta.url)
  );
}

/**
 * Page component rendered by NextJS.
 */
const Oceanside: FC<ApplicationType> = ({ className, ...props }) => {
  /**
   * Single runtime for Oceanside context
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
const StyledViewport = styled(Oceanside)`
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
    width: 100%;
    height: 512px;
  }
`;

Oceanside.displayName = "Oceanside";
export default StyledViewport;
