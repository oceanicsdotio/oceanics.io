import React, { useState, useEffect, useRef } from "react";
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
    position: fixed;
    top: 50%;
    left: 20%;
`;

const RubricStatement = ({children, onClick}) => {

    return (
        <Container>
            <Input type={"checkbox"} onClick={onClick}/>
            <Statement>{children}</Statement>
        </Container>
    )
}

export default ({target="/rubric.yml"}) => {

    const [score, setScore] = useState(0);
    const [rubric, setRubric] = useState({});

    useEffect(()=>{
        fetch(target)
            .then(data => data.text())
            .then(yml => setRubric(YAML.parse(yml)));
    },[]);

    const onClick = (e) => {
        // Increment or decrement based on DOM state
        setScore(score + (e.target.checked ? 1 : -1));
    }

    return (
        <>
            <Score>{score}</Score>
            {rubric ? Object.entries(rubric).map(([key, value]) => 
                <div key={key}>
                    <h3>{key}</h3>
                    <p>{value.description}</p>
                    {value.criteria.map((statement, key2) => <RubricStatement onClick={onClick} key={key2}>{statement}</RubricStatement>)}
                </div>    
        ) : null}
        </>
    )
    
}