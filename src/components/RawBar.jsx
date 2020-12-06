import React from "react";
import styled from "styled-components";
import { ghost } from "../palette";
import { rhythm } from "../typography";
import {NavBar, Title} from "./Layout";
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
}) => 
    <div className={className}>
        <NavBar>
            <Title to={"/"} color={ghost}>{menu[0].name}</Title>
            {menu.slice(1, 3).map(({name, onClick})=>
                <button 
                    key={`button-${name}`}
                    onClick={onClick}
                >
                    {name}
                </button>)
            }
        </NavBar>
        <main>
            {menu[0].component}
        </main>
    </div>;


/**
 * The styled version of the RawBar component adds padding to the
 * container so that Apps don't feel too crowded. 
 * 
 * It is the default export
 */
export const StyledRawBar = styled(RawBar)`
    
    margin-left: auto;
    margin-right: auto;
    max-width: 100%;
    padding: ${rhythm(1.5)} ${rhythm(0.75)};

    & > main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: 0.1rem solid ${ghost};
        border-radius: 1rem;
    }
`;
