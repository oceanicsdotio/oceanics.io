import React, {useReducer} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import Form from "./Form";
import {ghost,grey,green,orange} from "../palette";

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
        active={tankInUse}
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
        height: 20px;
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

    &:hover {
        & > progress {
            color: ${orange};
        }

        & > progress::-webkit-progress-bar {
            background-color: ${orange};
        }
        & > progress::-webkit-progress-value {
            background-color: ${orange};
        }
        & > progress::-moz-progress-bar {
            background-color: ${orange};
        }
        
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
