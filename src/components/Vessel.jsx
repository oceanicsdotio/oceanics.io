import React, {useState, useReducer} from "react";
import styled from "styled-components";
import {grey,green} from "../palette";

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
    grid-auto-rows: minmax(100px, auto);
`;

const tankInfo = [{
    name: "SA",
    level: 20,
    capacity: 20,
    grid: [0, 0]
},
{
    name: "PA",
    level: 4,
    capacity: 20,
    grid: [1, 0]
},
{
    name: "SF",
    level: 5.5,
    capacity: 20,
    grid: [0, 1]
},
{
    name: "PF",
    level: 8.75,
    capacity: 20,
    grid: [1, 1]
}]


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
        {`${name}: ${level.toFixed(2)}`}
    </TankContainer>)
}

export default () => {  

    return (
        <Wrapper>{
            tankInfo.map((props, ii) => <Tank
                    {...{key: ii, ...props}}
                />)
        }</Wrapper>
    )
}