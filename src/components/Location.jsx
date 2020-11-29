import React, {useReducer} from "react";
import styled from "styled-components";
import {grey, ghost} from "../palette";


/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    name, 
    children,
    className,
    icon=null,
}) => {

    // Simple reducer to toggle hover effects
    const [active, toggleActive] = useReducer(
        (prev, state)=>{return state ? state : !prev}, false
    );

    return <div 
        className={className}
        active={active}
        onMouseOver={()=>toggleActive(true)}
        onMouseLeave={()=>toggleActive(false)}
    >
        <h3>
            {`${name} `}
            <img src={icon.data}/>
        </h3>
        
        {children}
    </div>
    
};


/**
 * The StyledLocation component is just a styled version of Location
 * that includes hover effects. 
 */
const StyledLocation = styled.div`
    display: block;
    margin: 0;
    height: auto;
    position: relative;
    background: none;
    box-sizing: border-box;

    border-bottom: 0.05rem solid ${ghost};
    padding: 0.5rem;
    color: ${ghost};

    &:hover {
        background: ${grey};
    }

    & > h3 {
        & > img {
            image-rendering: crisp-edges;
            display: inline-block;
            height: 24px;
        }
    }
`;

export default StyledLocation;