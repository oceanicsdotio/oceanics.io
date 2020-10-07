import React, { useState, useEffect, useReducer } from "react";
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

export default ({target="/rubric.yml", baseScore=0, scoreMultiplier=1}) => {
    /*
    A Rubric is a collection of true/false statements in which an affirmative is consider good (merits). 

    This style is used to try to focus on positive traits that could be present in an evaluated
    thing, rather than on hunting for negatives. 

    The score element keeps track of the total number selected, and the setter is passed to child checkbox inputs
    to update the current score. 
    */
    const [score, dispatchScore] = useReducer(
        (count, checked) => count + (checked ? 1*scoreMultiplier : -1*scoreMultiplier), baseScore
    );
    const [rubric, setRubric] = useState({});

    useEffect(()=>{
        /*
        Retrieve and parse the YAML file that describes the assessment areas and merits. Do this exactly once.
        */
        fetch(target)
            .then(data => data.text())
            .then(yml => setRubric(YAML.parse(yml)));
    },[]);

    // Accumulating total merits across all categories
    const possible = Object.values(rubric)
        .map(x=>x.merits.length)
        .reduce((accumulator, currentValue) => accumulator + currentValue, baseScore);

    return (
        <>
            <Score>
                {`You selected ${score} of ${possible} possible merits (${Math.ceil(100*score/possible)}%).`}
            </Score>
            {rubric ? Object.entries(rubric).map(([key, value]) => 
                <div key={key}>
                    <h3>{key}</h3>
                    <p>{value.description}</p>
                    {value.merits.map(merit => 
                        <Container key={merit}>
                            <Input type={"checkbox"} onClick={(e) => dispatchScore(e.target.checked)}/>
                            <Statement>{merit}</Statement>
                        </Container>  
                    )}
                </div>    
        ) : null}
        </>
    )

}