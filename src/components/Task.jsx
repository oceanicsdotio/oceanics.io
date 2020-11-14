import React, {useState, useReducer} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";


// Allows the task name to be re-written
const Input = styled.input`
    background: none;
    border: none;
    display: inline;
    vertical-align: middle;
    text-decoration: ${({complete}) => complete ? "line-through" : null};
    color: ${({emphasize}) => emphasize ? "orange" : "inherit"};
`;


// UI element to complete, or reset, the task
const CheckBox = styled.input`
    display: inline;
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
            <CheckBox 
                onClick={toggleComplete} 
                type={"checkbox"}
                emphasize={emphasize}
            />
            <Input 
                type={"text"} 
                defaultValue={textContent}
                complete={complete}
                emphasize={emphasize}
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

export default Task;

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
    {(tasks || []).map(task => <Task {...{task, key: task}}/>)}
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
