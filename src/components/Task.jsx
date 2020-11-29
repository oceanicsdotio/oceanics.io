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
const Task = ({task}) => {

    const [complete, toggleComplete] = useReducer(
        (prev)=>{return !prev},false
    );

    const [emphasize, toggleEmphasize] = useReducer(
        (prev)=>{return !prev},false
    );

    const [textContent, setTextContent] = useState(task);

    const onBlurHandler = (event) => {
        setTextContent(event.target.value);
    };
 
    return (
        <div>
            <input 
                onClick={toggleComplete} 
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
    )
};

Task.propTypes = {
    /**
     Display name of the task.
     */
    task: PropTypes.string.isRequired
}

const StyledTask = styled(Task)`

    width: 100%;
    display: flex;

`;

export default StyledTask;

/**
The tasklist is an editable list of tasks currently associated with a date and location. 
*/
export const TaskList = ({
    heading="Tasks",
    tasks=null,
}) => <>
    <h3>
        {tasks ? heading : "New task"}
    </h3>
    {(tasks || []).map(task => <StyledTask {...{task, key: task}}/>)}
</>

TaskList.propTypes = {
    /**
     * Display heading for the container component
     */
    heading: PropTypes.string.isRequired,
    /**
     * Optional array of task-like strings to render as children
     */
    tasks: PropTypes.arrayOf(PropTypes.string)
}
