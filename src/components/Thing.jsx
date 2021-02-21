import React, {useReducer, useState} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import Form from "./Form";
import {ghost, grey} from "../palette";
import { v4 as uuid4 } from "uuid";


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

/**
 * Tanks are a common feature on marine thing and facilities
 */
export const Tank = ({
    name, 
    className,
    active=false, 
    level, 
    capacity=20,
    grid: [row, column]
}) => {

    const [tankInUse, setTankInUse] = useReducer((previous)=>{
        console.log(`Drawing from ${name}`);
        return !previous;
    }, active);

    const acronym = name.split(" ").map(word => word[0].toUpperCase()).join("");

    return <div
        className={className}
        row={row}
        column={column}
        onClick={setTankInUse}
        active={tankInUse.toString()}
    >
        {`${acronym}: ${level.toFixed(1)}`}
        <progress max={capacity} value={level}></progress>
    </div>
}

/**
 * The tank container component styles the Tank and status progress bar.
 */
export const TankContainer = styled(Tank)`

    grid-row: ${({grid: [row]})=>row+1};
    grid-column: ${({grid: [_, column]})=>column+1};
    font-size: large;
    font-family: inherit;
    color: ${ghost};
    padding: 0.3rem;
    margin: 0;

    & > progress {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 2rem;
        border: 0.1rem solid;
        background: none;
        color: ${grey};
        box-sizing: border-box;   
    }

    & > progress::-webkit-progress-bar {
        background-color: ${grey};
    }
    & > progress::-webkit-progress-value {
        background-color: ${grey};
    }
    & > progress::-moz-progress-bar {
        background-color: ${grey};
    }
`;

export const TankSystem = ({
    tanks=null,
    className
}) => 
    <div className={className}>{
        (tanks || [])
            .map(tankTemplate)
            .map(props => 
                <TankContainer
                    key={uuid4()}
                    {...props}
                />
            )
    }</div>


export const Wrapper = styled(TankSystem)`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(auto, auto);
`;

export default Wrapper;




/**
A thing is a physical entity in the SensorThings ontology. In 
this case, thing primarily means a mobile vehicle that may 
carry people, like a boat or truck. 

Hovering sets the expansion state.
*/
const Thing = ({
    spec: {
        name,
        properties = null
    },
    className, 
    team=[],
}) => {
   
    const [hidden, toggleHidden] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, true);

    const [info] = useState(
        Object.fromEntries(
            ["home", "capacity", "tanks"].map(key => [
                key, 
                key in (properties || {}) ? properties[key] : null
            ])
        )
    );

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
            <div>
                {hidden || !info.home ? 
                    null : 
                    `Home: ${info.home}`}
            </div>
            <Roster
                team={team}
                hidden={hidden}
                capacity={info.capacity}
            />
            {(hidden || !info.tanks) ? 
                null : 
                <Tanks tanks={info.tanks}/>
            }
            <div>{hidden ? null : 
                <Form actions={[
                    {value: "Delegate"}
                ]}/>
            }</div>
        </div>
    )
}


/**
 * Styled version of the Thing Component
 */
export const StyledThing = styled(Thing)`
    display: block;
    border-bottom: 0.07rem solid ${ghost};
    padding: 0.5rem;
    margin: 0;
    color: ${ghost};
    box-sizing: border-box;

`;

export default StyledThing;