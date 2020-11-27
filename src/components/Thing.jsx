import React, {useReducer} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import {ghost,grey,green} from "../palette";

import { v4 as uuid4 } from "uuid";


const TankContainer = styled.div`
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    border: 2px solid;
    border-radius: 5px;
    border-color: ${({active})=>active ? green: grey};
    background-color: black;
    font-size: x-large;
`;

const Wrapper = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(auto, auto);
`;


/*
Take basic user provided information about a tank and transform
it into the the nomenclature of the Vessel layout.
*/
const tankTemplate = ({
    name,
    capacity=20,
    level,
}) => {
    
    return {
        name,
        capacity,
        level: (level === undefined || level === null) ? capacity : level,
        grid: [
            name.toLowerCase().includes("aft") ? 1 : 0,
            name.toLowerCase().includes("port") ? 0 : 1
        ]
    };
}


const Tank = ({
    name, 
    active=false, 
    level, 
    grid: [row, column]
}) => {

    const [tankInUse, setTankInUse] = useReducer((previous)=>{
        console.log(`Drawing from ${name}`);
        return !previous;
    }, active);

    const acronym = name.split(" ").map(word => word[0].toUpperCase()).join("");

    return (<TankContainer
        row={row}
        column={column}
        onClick={setTankInUse}
        active={tankInUse}
    >
        {`${acronym}: ${level.toFixed(1)}`}
    </TankContainer>)
}

export const TankSystem = ({tanks=null}) => 
    <Wrapper>{
        (tanks || [])
            .map(tankTemplate)
            .map(props => 
                <Tank
                    key={uuid4()}
                    {...props}
                />
            )
    }</Wrapper>


const Thing = ({
    name,
    home,
    tanks=null,
    className="Thing", 
    team=null,
    capacity
}) => {
    /*
    A thing is a physical entity in the SensorThings ontology. In 
    this case, thing primarily means a mobile vehicle that may 
    carry people, like a boat or truck. 
    */

    // set element expansion state
    const [hidden, toggleHidden] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, true);

    return (
        <div 
            className={className} 
            key={name}
            onMouseOver={() => toggleHidden(false)}
            onDragOver={() => toggleHidden(false)}
            onDragLeave={() => toggleHidden(true)}
            onMouseLeave={() => toggleHidden(true)}
        >
            {name}
            <div>{hidden ? null : `Home: ${home}`}</div>
            <Roster
                team={team}
                hidden={hidden}
                capacity={capacity}
            />
            {(hidden && tanks) ? null : <TankSystem tanks={tanks}/>}
            <div>{hidden ? null : `Actions: rebase | route`}</div>
        </div>
    )
}

export default Thing;

export const StyledThing = styled(Thing)`
    display: block;
    border-radius: 5px;
    border: 1px solid;
    padding: 3px;
    margin: 0;
    margin-bottom: 1%;
    color: ${ghost};
    border-color: ${ghost};
`;


export const Things = ({things, home}) => {
    
    return Object.entries(things).map(([name, props]) => {
        const key = uuid4();
        return <StyledThing {...{
            name, 
            home,
            key,
            id: key,
            ...props
        }}></StyledThing>
    })
};