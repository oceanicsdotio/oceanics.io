import React, {useReducer} from "react";
import styled from "styled-components";

import Roster from "./Roster";
import {Things} from "./Thing";
import Note from "./Note";
import {grey} from "../palette";
import {TaskList} from "./Task";

const StyledLocation = styled.div`
    display: block;
    margin: 0;
    height: auto;
    border-radius: 3px;
    position: relative;
    background: ${({active}) => active ? grey : "black"};
`;

const Icon = styled.img`
    image-rendering: crisp-edges;
    display: inline-block;
    height: 24px;
`;

export const Location = ({
    name, 
    capacity=0,
    things=null, 
    icon=null, 
    team=null, 
    home=false
}) => {

    const [active, toggleActive] = useReducer(
        (prev, state)=>{return state ? state : !prev}, false
    );

    return (
        <StyledLocation 
            active={active}
            onMouseOver={()=>toggleActive(true)}
            onMouseLeave={()=>toggleActive(false)}
        >
            <h3>
                {`${name} `}
                <Icon src={icon.data}/>
            </h3>
            <Roster team={team} capacity={capacity}/>
            <Things things={things} home={home ? name : null}/>
            <TaskList tasks={["do a thing", "fix me", "harvest"]} />
            <Note />
        </StyledLocation>
    )
};


export default Location;

export const Locations = ({
    team=null,
    thingLocations=null
}) => {
    /*
    The `Locations` component displays an array of locations as 
    containers for the Things and People currently there, or 
    with tasks that take them there on the given day.
    */
    return (
        <>
        {Object.entries(thingLocations || {})
            .map(([name, props]) => 
                <Location 
                    name={name}
                    key={name}
                    {...props}
                    team={
                        props.home && team ? 
                        [...(props.team || []), ...team]: 
                        []
                    }
                />
            )}
        </>
    )
}