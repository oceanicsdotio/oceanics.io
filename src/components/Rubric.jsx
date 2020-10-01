import React, { useState, useEffect } from "react";
import styled from "styled-components";
import YAML from "yaml";

const Input =  styled.input`
    display: inline;
    margin: 10px;
`;

const Checkbox = ({checked}) => <Input type={"checkbox"} defaultValue={checked}/>;

const Statement = styled.p`
    display: inline;
`;

const Container = styled.div`
    display: inline-block;
`;

export const Score = styled.div`
    border: 1px orange solid;
    border-radius: 5px;
    color: orange;
    position: fixed;
    top: 50%;
    left: 20%;
`;

export const RubricBlock = ({target}) => {

    const [rubric, setRubric] = useState({})

    useEffect(()=>{
        fetch(target)
            .then(data => data.text())
            .then(yml => setRubric(YAML.parse(yml)));
    },[]);

    return (rubric ? Object.entries(rubric).map(([key, value]) => 
            <>
                <h3>{key}</h3>
                <p>{value.description}</p>
                {value.criteria.map((statement, key) => <Rubric key={key}>{statement}</Rubric>)}
            </>    
    ) : null)
}


export const Rubric = ({key, children, weight=1, scoreKeeper=null}) => {

    const [checked, setChecked] = useState(false);

    const onClick = () => {
        if (scoreKeeper) {
            scoreKeeper(checked ? -weight : weight);
        }
        setChecked(!checked);
    }

    return (
        <Container key={key}>
            <Checkbox onClick={onClick}/>
            <Statement>{children}</Statement>
        </Container>
    )
}