import React from "react";
import styled from "styled-components";
import Person from "./Person";
import {ghost} from "../palette";

const DropTarget = styled.div`
    width: auto;
    min-height: ${({hidden}) => hidden ? "0px" : "25px"};
    border: 2px dashed;
    border-radius: 3px;
    margin-bottom: 1%;
    padding: 2px;
    visibility: ${({hidden}) => hidden ? "hidden": null};
`;

const StyledRoster = styled.div`
    color: ${({style: {color}}) => color};
    margin: 0;
    padding: 0;
`;

const CapacityInfo = styled.div`
    visibility: ${({hidden}) => hidden ? "hidden": null};
    min-height: ${({hidden}) => hidden ? "0px" : null};
`;

export default ({
    capacity,
    team=[], 
    hidden=false,
    transferCallback=null,
    style={color: ghost}
}) => {
    /*
    The roster component is an interactive list of the people
    currently assigned to a location, or to a thing, which
    might move between locations. 
    */
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
        if (team.length >= capacity) return;
        if (transferCallback) transferCallback();
    }

    const isFull = Number.isInteger(capacity) ? 
        Math.floor((team || []).length / capacity) : 
        false;

    return (
        <StyledRoster style={style}>
            <CapacityInfo hidden={!Number.isInteger(capacity)}>
                {isFull ? `Full` : `Crew: ${(team || []).length}/${capacity}`}
            </CapacityInfo>
            <DropTarget  
                hidden={hidden}
                onDragOver={moveIndicator}
                onDrop={allocateCrew}
            >
                {(team || []).length ? team.map(name => <Person name={name}/>) : null}
            </DropTarget>
        </StyledRoster>
    )
};