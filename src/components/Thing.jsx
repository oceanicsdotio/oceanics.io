import React, {useState} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import {ghost, grey} from "../palette";
import { v4 as uuid4 } from "uuid";


/*
 * Take basic user provided information about a tank and transform
 * it into the the nomenclature of the Vessel layout.
 */
const tankTemplate = ({
    name,
    capacity=20,
    level,
}) => Object({
    name,
    key: uuid4(),
    capacity,
    level: (level === undefined || level === null) ? capacity : level,
    grid: [
        name.toLowerCase().includes("aft") ? 1 : 0,
        name.toLowerCase().includes("port") ? 0 : 1
    ]
});


/**
 * Tanks are a common feature on marine thing and facilities
 */
const Resource = ({
    name, 
    className,
    value, 
    max
}) => 
    <div className={className}>
        {`${name}: ${value.toFixed(1)}`}
        <progress max={max} value={value}></progress>
    </div>;

   
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
   
    const [info] = useState(
        Object.fromEntries(
            ["home", "capacity", "tanks"].map(key => [
                key, 
                key in (properties || {}) ? properties[key] : null
            ])
        )
    );

    return <div 
        className={className} 
        key={name}
        onMouseOver={() => toggleHidden(false)}
        onDragOver={() => toggleHidden(false)}
        onDragLeave={() => toggleHidden(true)}
        onMouseLeave={() => toggleHidden(true)}
    >
        {name}
        <div>
            {!info.home ? null : `Home: ${info.home}`}
        </div>
        <Roster
            team={team}
            capacity={info.capacity}
        />
            <div className={className}>{
            (info.tanks || [])
                .map(tankTemplate)
                .map(props => <Resource {...props}/>)
        }</div>
    </div>
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

    font-size: large;
    font-family: inherit;

    & > progress {
        /* -webkit-appearance: none;
        appearance: none; */
        width: 100%;
        height: 2rem;
        border: 0.1rem solid;
        background: none;
        color: ${grey};
        box-sizing: border-box;   
    }

`;

export default StyledThing;