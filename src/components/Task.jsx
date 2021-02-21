import React, {useState, useReducer} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {orange} from "../palette";


// Allows the task name to be re-written
const Input = styled.input`
    background: none;
    border: none;
    margin: auto;
    text-decoration: ${({complete}) => complete ? "line-through" : null};
    color: ${({emphasize}) => emphasize ? orange : "inherit"};
`;


/**
Right now tasks are simply editable text fields. 
They do not have logical concepts for due date, assignment, or relations with other data. 

Status is used to (de-)emphasize component in CSS. 
*/
const Task = ({
    name,
    manual=true
}) => {

    const [complete, toggleComplete] = useReducer(
        (prev)=>{return !prev},false
    );

    const [emphasize, toggleEmphasize] = useReducer(
        (prev)=>{return !prev},false
    );

    const [textContent, setTextContent] = useState(name);

    const onBlurHandler = (event) => {
        setTextContent(event.target.value);
    };
 
    return <div>
        <input 
            onClick={manual?toggleComplete:null} 
            type={"checkbox"}
            emphasize={emphasize ? "emphasize" : undefined}
        />
        <Input 
            type={"text"} 
            defaultValue={textContent}
            complete={complete}
            emphasize={emphasize ? "emphasize" : undefined}
            onBlur={onBlurHandler}
            onClick={toggleEmphasize}
        />
    </div>
    
};

Task.propTypes = {
    /**
     Display name of the task.
     */
    name: PropTypes.string.isRequired
}

const StyledTask = styled(Task)`

    width: 100%;
    display: flex;

`;

export default StyledTask;