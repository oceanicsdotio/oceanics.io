/**
 * React and friends.
 */
import React, { FC } from "react";
import { GetStaticProps } from "next";

/**
 * Component-level styling.
 */
import styled from "styled-components";
import useMapBox from "oceanics-io-ui/build/hooks/useMapBox"


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
const AppPage: FC<ApplicationType> = ({
    map
}) => {
    const {ref} = useMapBox(map)
    return <>
    <link href='https://api.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css' rel='stylesheet' />
    <div ref={ref} />
    </>
};

/**
 * Styled version of page exported by default.
 */
const StyledIndex = styled(AppPage)`
    display: block;
    margin: 0;
    padding: 0;
    height: 75vh;
    width: 100%;
`;

AppPage.displayName = "Squalltalk";
export default StyledIndex;


export const getStaticProps: GetStaticProps = () => Object({
    props: { 
        map: {
            accessToken: process.env.MAPBOX_ACCESS_TOKEN,
            defaults: {
                zoom: 10
            }
        },
        description: "",
        title: "Squalltalk"
    }
});