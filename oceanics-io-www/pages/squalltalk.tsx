/**
 * React and friends.
 */
import React, { useEffect } from "react";
import type { FC } from "react";
import { GetStaticProps } from "next";
import Squalltalk, {DEFAULT_MAP_PROPS} from "../src/components/Squalltalk";
import useDetectClient from "oceanics-io-ui/build/hooks/useDetectClient";

/**
 * Component-level styling.
 */
import styled from "styled-components";


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

  const client = useDetectClient()

  return <Squalltalk map={map} client={client}/>
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
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
        defaults: DEFAULT_MAP_PROPS,
      },
    },
  });
