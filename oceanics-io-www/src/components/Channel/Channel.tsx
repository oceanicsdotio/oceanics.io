import React, { MouseEventHandler } from "react";
import styled from "styled-components";
import { ghost, orange, grey, charcoal } from "../../palette";


export type ChannelType = {
    id: string,
    /**
     * Source of the raw data
     */
    url: string,
    /**
     * The type of the data. 
     */
    type: string,
    /**
     * Hook for Styled Components to apply CSS
     */
    className: string,
    /**
     * How to render the data
     */
    component: string,
    /**
     * Does not appear when zoomed in further
     */
    maxzoom: number,
    /**
     * Not rendered when zoomed further out
     */
    minzoom: number,
    /**
     * Current zoom level passed in for rendering in cards
     * whether or not the channel is currently visible
     */
    zoomLevel: number,
    /**
     * The provider and legal owner of the data
     */
    attribution: string,
    /**
     * URL that links to the provider
     */
    info: string,
    /**
     * Render and update view on click
     */
    onClick: MouseEventHandler
}

/**
 * A channel abstracts access to a data source. 
 */
export const Channel = ({
    id,
    url,
    type,
    className,
    component="default",
    maxzoom=21,
    minzoom=1,
    zoomLevel,
    info="",
    onClick,
}: ChannelType) => {
    const inView = (zoomLevel >= minzoom) && (zoomLevel <= maxzoom)
    return (
        <div className={className}>
            <h1>{id.replace(/-/g, ' ')}</h1>
            <div className={"zoom"}>
                <div className={inView?"visible":""}>
                    {`zoom: ${minzoom}-${maxzoom}`}
                </div>
            </div>
            <a onClick={onClick}>{`< render as ${type} with <${component}/> popup`}</a>
            <a href={url}>{"> download"}</a>
            <a href={info}>{"> attribution"}</a>
        </div>
    )
}

export const StyledChannel = styled(Channel)`

    display: block;
    max-width: 65ch;
    padding: 1rem;
    margin: 0;
    border-radius: 5px;
    background-color: ${charcoal};
    color: ${ghost};

    & * {
        font-size: inherit;
        font-family: inherit;
    }

    & h1 {
        text-transform: capitalize;
        font-size: larger;
    }

    & label {
        font-style: italic;
    }

    & a {
        color: ${orange};
        display: block;
        cursor: pointer;
        margin: 0.5rem 0;
        text-decoration: underline;
    }

    & .zoom {
        color: ${orange};
        border-radius: 5px;
        background-color: black;
        padding: 0;
        border: 1px solid ${grey};

        & div {
            height: auto;
            border: 1px solid;
            border-radius: 5px;
            text-align: center;
            background-color: ${charcoal};
            padding: 3px;
            margin-left: ${({minzoom})=>(minzoom-1)/22*100}%;
            margin-right: ${({maxzoom})=>(22-maxzoom)/22*100}%;
            color: ${({ minzoom, maxzoom, zoomLevel}) => 
                (zoomLevel === null || (zoomLevel >= minzoom) && (zoomLevel <= maxzoom)) ? ghost : grey
            };
        }

        & .visible {
            color: ${ghost}
        }
    }
`;

Channel.displayName = "Channel";
export default StyledChannel;
