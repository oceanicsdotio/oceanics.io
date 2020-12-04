import React, { Fragment, useReducer } from "react";
import styled from "styled-components";
import YAML from "yaml";
import rubric from "../data/rubric.yml";

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

const parseYamlText = (text, prefix) => 
    YAML.parse(text)
        .split("\n")
        .filter(paragraph => paragraph)
        .map(
            (text, ii) => 
            <p key={`${prefix}-text-${ii}`}>{text}</p>
        );

// Accumulating total merits across all categories
const possible = Object.values(rubric)
    .map(({merits})=>merits.length)
    .reduce((accumulator, currentValue) => accumulator + currentValue, 0);

export default ({scoreMultiplier=1}) => {
    /*
    A Rubric is a collection of true/false statements in which an affirmative is consider good (merits). 

    This style is used to try to focus on positive traits that could be present in an evaluated
    thing, rather than on hunting for negatives. 

    The score element keeps track of the total number selected, and the setter is passed to child checkbox inputs
    to update the current score. 
    */
    const [score, dispatchScore] = useReducer(
        (score, checked) => score + (checked ? 1*scoreMultiplier : -1*scoreMultiplier), 0
    );
   
    return <>
        <Score>
            {`You selected ${score} of ${possible} possible merits (${Math.ceil(100*score/possible)}%).`}
        </Score>
        {Object.entries(rubric).map(([key, {merits, description=null}]) => 
            <Fragment key={key}>
                <h3>{key}</h3>
                
                {description ? 
                    parseYamlText(description, "rubric") :
                    null
                }
                {merits.map(merit => 
                    <Container key={merit}>
                        <Input type={"checkbox"} onClick={(e) => dispatchScore(e.target.checked)}/>
                        <Statement>{merit}</Statement>
                    </Container>  
                )}
            </Fragment>    
        )}
    </>

}