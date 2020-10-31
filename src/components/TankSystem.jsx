import React, {useReducer} from "react";
import styled from "styled-components";
import {grey,green} from "../palette";
import {v4 as uuid4} from "uuid";

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

const tankTemplate = ({
    name,
    capacity=20,
    level,
}) => Object({
    name,
    capacity,
    level: (level === undefined || level === null) ? capacity : level,
    grid: [
        name.toLowerCase().includes("f") ? 0 : 1,
        name.toLowerCase().includes("p") ? 0 : 1
    ]
});




const Tank = ({name, active=false, level, grid: [row, column]}) => {

    const [tankInUse, setTankInUse] = useReducer((previous)=>{
        console.log(`Drawing from ${name}`);
        return !previous;
    }, active);

    return (<TankContainer
        row={row}
        column={column}
        onClick={setTankInUse}
        active={tankInUse}
    >
        {`${name}: ${level.toFixed(1)}`}
    </TankContainer>)
}

export default ({tanks=null}) => 
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
