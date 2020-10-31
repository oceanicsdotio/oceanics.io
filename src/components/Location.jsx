import React, {useReducer} from "react";
import styled from "styled-components";

import Roster from "./Roster";
import {Things} from "./Thing";
import Note from "./Note";
import {grey} from "../palette";
import {TaskList} from "./Task";
import {v4 as uuid4} from "uuid";

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
    children,
    icon=null,
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
            
            {children}
        </StyledLocation>
    )
};

export default Location;

export const Locations = ({
    locations,
    home,
    team=null,
}) => {
    /*
    The `Locations` component displays an array of locations as 
    containers for the Things and People currently there, or 
    with tasks that take them there on the given day.
    */
    return (
        <>
        {locations.map(
            ({tasks, things=null, capacity, ...props}) => 
                <Location 
                    key={uuid4()}
                    {...props}
                >
                    <Roster team={props.home && team ? 
                        [...(props.team || []), ...team]: 
                        []} capacity={capacity}/>
                    {things ? <Things things={things} home={home}/> : null}
                    <TaskList tasks={tasks} />
                    <Note />
                </Location>
            )}
        </>
    )
}