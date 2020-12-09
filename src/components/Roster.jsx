import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Person from "./Person";

/** 
The roster component is an interactive list of the people
currently assigned to a location, or to a thing, which
might move between locations. 
*/
export const Roster = ({
    capacity,
    className,
    team=[], 
    hidden=false,
    transferCallback=null
}) => {
 
    /**
    Makes the mouse icon change to drag version while dragging.
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
        Math.floor(team.length / capacity) : 
        false;

    return <div className={className}>
        {
            Number.isInteger(capacity) ? 
            isFull ? 
            `Full` : 
            `Crew: ${team.length}/${capacity}` : 
            null
        }
        <div  
            hidden={hidden}
            onDragOver={moveIndicator}
            onDrop={allocateCrew}
        >
            {team.map(({
                node: {
                    spec: {name}
                }
            }) => 
                <Person name={name} key={name}/>
            )}
        </div>
    </div>
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
    hidden: PropTypes.bool,
    /**
     * Callback function that is called whenever a resource
     * is transferred into the roster
     */
    transferCallback: PropTypes.func,
    /**
     * Text styling information. Just accepts `color`.
     */
    color: PropTypes.string
}

const StyledRoster = styled(Roster)`

    & > div {
        visibility: ${({hidden}) => hidden ? "hidden": null};
        min-height: ${({hidden}) => hidden ? "0" : "2.5rem"};
        margin-bottom: 1%;
        width: 100%;
    }
`;

export default StyledRoster;