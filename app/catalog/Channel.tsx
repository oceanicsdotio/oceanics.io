import React, { MouseEventHandler } from "react";
import styled from "styled-components";
import { ghost, orange, grey, charcoal } from "../../src/palette";


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
    className?: string,
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
    attribution?: string,
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

`;

Channel.displayName = "Channel";
export default StyledChannel;
