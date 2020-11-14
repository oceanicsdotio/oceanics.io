import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Person from "./Person";
import {ghost} from "../palette";


/**
 Area that accepts draggable elements representing, for example, people
 */ 
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
    color: ${({color=ghost}) => color};
    margin: 0;
    padding: 0;
`;


// How many agents the roster will hold
const CapacityInfo = styled.div`
    visibility: ${({hidden}) => hidden ? "hidden": null};
    min-height: ${({hidden}) => hidden ? "0px" : null};
`;


/** 
The roster component is an interactive list of the people
currently assigned to a location, or to a thing, which
might move between locations. 
*/
export const Roster = ({
    capacity,
    team=[], 
    hidden=false,
    transferCallback=null,
    color=ghost
}) => {
 
    /**
    Makes the mouse icon change to drag version
    while dragging.
    */
    const moveIndicator = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    /**
    Get the drag event data, and use the element handle
    to move/copy the content to the drop target.
    */
    const allocateCrew = (event) => {
        event.preventDefault();
        if (team.length >= capacity) return;
        if (transferCallback) transferCallback();
    }

    const isFull = Number.isInteger(capacity) ? 
        Math.floor((team || []).length / capacity) : 
        false;

    return <StyledRoster color={color}>
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
};

Roster.propTypes = {
    /**
     * The number of agents that can be assigned to
     * the Roster, initially or by dragging.
     */
    capacity: PropTypes.number,
    /**
     * An array of string identifiers, assumed to be multi
     * word names. 
     */
    team: PropTypes.arrayOf(PropTypes.string), 
    /**
     * Hide the DropTarget area for adding people.
     * This allows some control of the amount of data displayed
     * from the client application.
     */
    hidden: PropTypes.bool.isRequired,
    /**
     * Callback function that is called whenever a resource
     * is transferred into the roster
     */
    transferCallback: PropTypes.func,
    /**
     * Text styling information. Just accepts `color`.
     */
    style: PropTypes.string.isRequired
}

export default Roster;