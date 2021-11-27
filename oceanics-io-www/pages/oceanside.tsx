/**
 * React and friends.
 */
import React from "react";
import type { FC } from "react";
import { GetStaticProps } from "next";

/**
 * Component-level styling.
 */
import styled from "styled-components";

import useOceansideWorld from "../src/hooks/useOceansideWorld";
import type {IWorld} from "../src/hooks/useOceansideWorld";
const MAPBOX_STYLESHEET = "https://api.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css"

interface ApplicationType extends IWorld {
  className?: string;
};

/**
 * Page component rendered by GatsbyJS.
 */
const AppPage: FC<ApplicationType> = ({ className, ...props }) => {
  /**
   * Digital elevation map of the synthetic terrain. 
   */
  const world = useOceansideWorld(props)
  
  return (
    <div className={className}>
      <link href={MAPBOX_STYLESHEET} rel={"stylesheet"}/>
      <canvas ref={world.ref} width={world.size} height={world.size}/>
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
    width: 1024px;
    height: 1024px;
    image-rendering: crisp-edges;
  }
`;

AppPage.displayName = "Oceanside";
export default StyledIndex;

export const getStaticProps: GetStaticProps = () =>
  Object({
    props: {
      description: "",
      title: "Oceanside",
      size: 64,
      grid: {
        size: 8
      },
      datum: 0.7
    }
  });
