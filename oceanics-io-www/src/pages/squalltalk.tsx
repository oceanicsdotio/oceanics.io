/**
 * React and friends.
 */
import React, { useEffect } from "react";
import type {FC} from "react"
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
    const {ref, zoom} = useMapBox(map)

    useEffect(()=>{
        console.log("Zoom", zoom)
    }, [zoom])
    return <>
    <link href='https://api.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css' rel='stylesheet' />
    <div style={{height: "500px"}} ref={ref} />
    </>
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


export const getStaticProps: GetStaticProps = () => Object({
    props: { 
        map: {
            accessToken: process.env.MAPBOX_ACCESS_TOKEN,
            defaults: {
                zoom: 4
            }
        },
        description: "",
        title: "Squalltalk"
    }
});