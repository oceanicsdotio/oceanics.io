/**
 * React and friends.
 */
 import React, { useMemo } from "react";

 /**
  * Component-level styling.
  */
 import styled from "styled-components";
 
 /**
  * Predefined colors.
  */
 import { ghost, orange, grey } from "../palette";
 
 
 /**
  * Span like div for indicating the zoom level at which the layer appears.
  * 
  * @param {*} param0 
  * @returns 
  */
 const ZoomIndicator = ({className, zoom}) => {
     return <div className={className} zoom={zoom}>
         {`zoom: ${zoom[0]}-${zoom[1]}`}
     </div>
 };
 
 /**
  * Adjust margins and width to indicate the zoom level of the
  */
 const StyledZoomIndicator = styled(ZoomIndicator)`
    
     height: auto;
     border: 1px solid;
     margin-bottom: 15px;
     margin-left: ${({zoom})=>(zoom[0]-1)/22*100}%;
     margin-right: ${({zoom})=>(22-zoom[1])/22*100}%;
     color: ${({ zoom, zoomLevel}) => (zoomLevel === null || (zoomLevel >= zoom[0]) && (zoomLevel <= zoom[1])) ? orange : grey};
 `;
 
 /**
  * Emoji button, cuz it unicode baby. 
  */
 const Emoji = styled.a`
    margin: 5px;
    padding: 2px;
    border-radius:50%;
    background-color: ${grey};
    cursor: pointer;
    border: 1px dashed ${ghost};
    text-decoration: none !important;
 `;

 
/**
 * This is the per item element for layers
 * @param {*} param0 
 * @returns 
 */
export const LayerCard = ({
    id,
    url,
    type,
    className,
    component="default",
    maxzoom=21,
    minzoom=1,
    zoomLevel,
    attribution="Oceanics.io",
    info=null,
    onClick=null,
}) => {

    const tools = useMemo(()=>[
        ["onClick", onClick, "🏝️"],
        ["href", url, "💻"]
    ].filter(
        x => !!x[1]
    ).map(([key, value, children]) => Object({
        [key]: value,
        key: `${id}-${children}`,
        children
    })).map(x => <Emoji {...x}/>));

    return <div 
        className={className} 
    >
        <div>
            <h2>{id.replace(/-/g, ' ')}</h2>
            <a href={info||""} children={attribution}/>
        </div>
        <p>{`${type} with <${component}/> popup`}</p>
        <StyledZoomIndicator zoom={[minzoom, maxzoom]} zoomLevel={zoomLevel}/>
        <div>{tools}</div>  
    </div>
}



const StyledLayerCard = styled(LayerCard)`

    margin-top: 10px;
    border-top: 1px dashed ${ghost};

    & p {
        color: ${grey};
        margin: 0;
        font-size: larger;
    }

    & a {
        color: ${orange};
        cursor: pointer;
        font-family: inherit;
        display: inline-block;
        text-decoration: none;  
        text-decoration: underline dashed; 
    }

    & h2 {
        text-transform: capitalize;
        display: inline;
        font-size: larger;
        font-family: inherit;
        width: fit-content;
        padding: 0;
        margin-right: 10px;
    }
`;


export default StyledLayerCard;
