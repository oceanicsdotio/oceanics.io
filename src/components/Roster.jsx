import React, {useState} from "react";
import styled from "styled-components";
import Person from "./Person";
import {ghost} from "../palette";

const DropTarget = styled.div`
    width: auto;
    min-height: ${({hidden}) => hidden ? "0px" : "25px"};
    border: 2px dashed ${ghost};
    border-radius: 3px;
    margin: 0;
    padding: 2px;
    visibility: ${({hidden}) => hidden ? "hidden": null};
`;

export default ({team, hidden=false}) => {
    /*
    The roster component is an interactive list of the people
    currently assigned to a location, or to a thing, which
    might move between locations. 
    */

    const [crew, setCrew] = useState(team);

    const moveIndicator = (event) => {
        /*
        Makes the mouse icon change to drag version
        while dragging.
        */
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const allocateCrew = (event) => {
        /*
        Get the drag event data, and use the element handle
        to move/copy the content to the drop target.
        */
        event.preventDefault();
        const data = event.dataTransfer.getData("text/plain");
        const elem = document.getElementById(data);
        event.target.appendChild(elem);
        setCrew([...crew]);
    }

    return (<DropTarget
        hidden={hidden}
        onDragOver={moveIndicator}
        onDrop={allocateCrew}
    >
        {   
            crew.length ? 
            crew.map((name, jj) => 
                <Person name={name} key={`${name}-${jj}`}/>) : 
            null
        }
    </DropTarget>)
};