/**
 * React and friends.
 */
 import React from "react";

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
     display: inline-block;
     text-decoration: dashed;
     margin: 5px;
     padding: 2px;
     border-radius:50%;
     background-color: ${grey};
     cursor: pointer;
     border: 1px dashed ${ghost};
 `;
/**
 * This is the per item element for layers
 * @param {*} param0 
 * @returns 
 */
 export default ({
    id,
    url,
    type,
    component="default",
    maxzoom=21,
    minzoom=1,
    zoomLevel,
    behind=null,
    attribution="unknown",
    info=null,
    onClick=null,
}) => {
    return <div 
        className={"card"} 
    >
        <div><h2>{id.replace(/-/g, ' ')}</h2>
        {` by ${attribution}`}
        </div>
        <p>{`${type} with <${component}/> popup`}</p>
        <StyledZoomIndicator zoom={[minzoom, maxzoom]} zoomLevel={zoomLevel}/>
        <div>
            <Emoji onClick={onClick||(() => {console.log("No handlers")})}>{"🏝️"}</Emoji>
            <Emoji href={url}>{"💻"}</Emoji>
            {info ? <Emoji href={info}>{"❓"}</Emoji> : null}
        </div>

        
    </div>
}
