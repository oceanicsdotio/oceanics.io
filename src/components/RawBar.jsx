
import React, { useReducer } from "react";
import styled from "styled-components";

import {pink} from "../palette";


const NavHeader = ({prev, next, children, onPrev, onNext, className}) => {
    return <div className={className}>
        <h1>
            <button onClick={onPrev}>{`< ${prev}`}</button>
                {children}
            <button onClick={onNext}>{`${next} >`}</button>
        </h1>
    </div>
}

const RotateSelection = styled(NavHeader)`
    align-content: center;
    width: 100%;
    display: flex; 

    & > h1 {
        margin: auto;
        margin-bottom: 2rem;
        border-bottom: 1px solid;
        border-radius: 2rem;
        font-size: larger;
        font-family: inherit;

        & > button {
            background: none;
            color: ${pink};
            border: none;
            font-size: large;
            cursor: pointer;
            margin: 0.5rem;
            font-family: inherit;
        }
    }
`;

/**
Menu-like interface component for single page application
*/
export const RawBar = ({ 
    menu,
    className
}) => {
    
    const [view, shift] = useReducer((prev, x=1) => {
        const _new = (prev + x) % menu.length;
        return _new;
    }, 0);
    
    return <div className={className}>
        <RotateSelection 
            prev={view[view.length-1]} 
            next={view[1]}
            onPrev={()=>{setView(true)}}
            onNext={()=>{setView()}}
        >
            {view[0]}
        </RotateSelection>
        {menu[view].component}
    </div>  
};

const StyledRawBar = styled(RawBar)`
    padding: 3rem;
`;

export default StyledRawBar
