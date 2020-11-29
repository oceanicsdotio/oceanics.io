import React, { useReducer } from "react";
import styled from "styled-components";
import {pink, ghost} from "../palette";

/**
 * The AppContext component is a basic stateless function that displays
 * the current Mini Application, as well as controls for swtiching 
 * between Apps. 
 * 
 * It is a stand-alone component to allow flex box styling.
 */
const AppContext = ({
    view: {
        prev,
        next,
        app: {
            name
        }
    },  
    callback, 
    className
}) =>
    <nav className={className}>
        <h1>
            <button onClick={() => {callback(-1)}}>{`< ${prev}`}</button>
            {name}
            <button onClick={() => {callback(1)}}>{`${next} >`}</button>
        </h1>
    </nav>

/**
 * The AppContext Component is styled so that it is aligned in the center
 * of the containing element, and spacing around buttons is equal.
 */
const RotateSelection = styled(AppContext)`

    align-content: center;
    width: 100%;
    display: flex;

    & > h1 {

        margin: auto;
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
* Menu-like interface component for single page application
* 
* Reducer rotates the currently visible options.
* Previous and next are just stored as names for display.
* The current app is an object with both the name
* and the component to render. 
*    
*/
export const RawBar = ({ 
    menu,
    className
}) => {
    
    const [view, setView] = useReducer(
        ({x}, dx=1) => {
            x = (x + dx) % menu.length;
            x = x + (x < 0 ? menu.length : 0);
        
            return {
                x,
                app: menu[x],
                prev: menu[x ? x - 1 : menu.length -1].name,
                next: menu[(x + 1) % menu.length].name
            }
        }, {
            x: 0,
            app: menu[0],
            prev: menu[menu.length - 1].name,
            next: menu[1].name
        }
    );
    
    return <div className={className}>
        <RotateSelection 
            view={view} 
            callback={setView}
        />
        <main>
            {view.app.component}
        </main>
    </div>  
};

/**
 * The styled version of the RawBar component adds padding to the
 * container so that Apps don't feel too crowded. 
 * 
 * It is the default export
 */
const StyledRawBar = styled(RawBar)`
    padding: 2rem;

    & > main {
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: 0.1rem solid ${ghost};
        border-bottom: 0.1rem solid ${ghost};
        border-radius: 1rem;
    }
`;

export default StyledRawBar;