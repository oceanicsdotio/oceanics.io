import React, { useState, useEffect } from "react";
import styled from "styled-components";
import YAML from "yaml";

const Input =  styled.input`
    display: inline;
    margin: 10px;
`;

const Statement = styled.p`
    display: inline;
`;

const Container = styled.div`
    display: inline-block;
`;

const Score = styled.div`
    border: 1px orange solid;
    border-radius: 5px;
    color: orange;
`;

const RubricStatement = ({children, onClick}) => {
    /*
    A single clickable statement or merit with a check box. The text node is passed as
    a child, and the onClick handler uses a state setter from the parent element.
     */
    return (
        <Container>
            <Input type={"checkbox"} onClick={onClick}/>
            <Statement>{children}</Statement>
        </Container>
    )
}

export default ({target="/rubric.yml"}) => {
    /*
    A Rubric is a collection of true/false statements in which an affirmative is consider good (merits). 

    This style is used to try to focus on positive traits that could be present in an evaluated
    thing, rather than on hunting for negatives. 

    The score element keeps track of the total number selected, and the setter is passed to child checkbox inputs
    to update the current score. 
    */

    const BASE_SCORE = 0;
    const [score, setScore] = useState(0);
    const [rubric, setRubric] = useState({});

    useEffect(()=>{
        /*
        Retrieve and parse the YAML file that describes the assessment areas and merits
        */
        fetch(target)
            .then(data => data.text())
            .then(yml => setRubric(YAML.parse(yml)));
    },[]);

    const onClick = (e) => {
        // Increment or decrement based on DOM state
        setScore(score + (e.target.checked ? 1 : -1));
    }

    const reducer = (accumulator, currentValue) => accumulator + currentValue;  // Accumulating the total number of merits

    return (
        <>
            <Score>
                {`You have selected ${score} of ${Object.values(rubric).map(x=>x.merits.length).reduce(reducer, BASE_SCORE)} merits.`}
            </Score>
            {rubric ? Object.entries(rubric).map(([key, value]) => 
                <div key={key}>
                    <h3>{key}</h3>
                    <p>{value.description}</p>
                    {value.merits.map((merit, key2) => <RubricStatement onClick={onClick} key={key2}>{merit}</RubricStatement>)}
                </div>    
        ) : null}
        </>
    )
    
}