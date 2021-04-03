import React, { useState, useEffect, useReducer } from "react";
import styled from "styled-components";


const agent = {
    capacity: [0.0, 0.0], // min max on any day
    life: 0.0, // lifetime in days
    cost: 0.0, // cost of acquisition
    subscription: 0.0, // flat rate per month
};

const vector = {
    flux: 0.0, // units per day
    take: 0.0, // cut of pie
    cost: 0.0, // unit cost of service
    price: 0.0, // unit price
    life: 0.0, // days of viability
};

const predict = ({
    consumers,
    producers,
    revenue,
    expenses,
    reserve

}) => {

    const income = revenue - expenses;
    
    return {
        revenue,
        expenses,
        income,
        reserve: reserve + income
    }
};


export default () => {

    const [producers, dispatchProducers] = useReducer();
    const [consumers, dispatchConsumers] = useReducer();
    // const []

    return <>
        <h1>{"Producers"}</h1>
        <p>{``}</p>

        <h1>{"Consumers"}</h1>
        <p>{``}</p>

        <button
            onClick={e=>{
                console.log("click");
            }}
        >{"Next"}</button>
    </>
}