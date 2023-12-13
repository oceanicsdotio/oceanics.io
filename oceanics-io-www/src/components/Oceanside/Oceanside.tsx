import React from "react";
import styled from "styled-components";
import useOceanside from "./useOceanside";
import useWasmRuntime from "../../hooks/useWasmRuntime";
import type { IWorldType } from "./useOceanside";


/**
 * Class names for ref in CSS-in-JSS.
 */
const [WORLD, BOARD] = ["world", "board"];

export interface ApplicationType extends IWorldType {
  /**
   * Styled components hook for container
   */
  className?: string
}

/**
 * Dynamic interactive game board
 */
export const Oceanside = ({ className, ...props }: ApplicationType) => {
  // Main thread web assembly runtime.
  const {runtime} = useWasmRuntime();

  /**
   * Synthetic terrain with digital elevation map and 
   * probability table of feature types for world-building.
   */
  const {world, board} = useOceanside({...props, runtime});

  return (
    <div className={className}>
      <canvas {...world.canvas} className={WORLD}/>
      <canvas {...board.canvas} className={BOARD}/>
    </div>
  );
};

export const StyledViewport = styled(Oceanside)`

  display: block;
  margin: 0;
  padding: 0;
  width: 100%;

  & * {
    margin: 0;
    padding: 0;
  }

  & canvas {
    image-rendering: crisp-edges;
  }
  & .${WORLD} {
    display: none;
    width: 256px;
    height: 256px;
  }
  & .${BOARD} {
    width: 100%;
    aspect-ratio: 1 / 0.8;
  }
`;

Oceanside.displayName = "Oceanside";
export default StyledViewport;
