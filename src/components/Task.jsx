import React, {useState, useReducer} from "react";
import styled from "styled-components";

const StyledInput = styled.input`
    background: none;
    border: none;
    display: inline;
    vertical-align: middle;
    text-decoration: ${({complete}) => complete ? "line-through" : null};
    color: ${({emphasize}) => emphasize ? "orange" : "inherit"};
`;

const CheckBox = styled.input`
    display: inline;
`;

const Task = ({task}) => {
    /*
    Right now tasks are simply editable text fields. They
    do not have logical concepts for due date, assignment,
    or relations with other data. 

    Status is used to (de-)emphasize component in CSS. 
    */

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
            <StyledInput 
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

export default Task;

export const TaskList = ({
    heading="Tasks",
    tasks=null,
}) => {
    /*
    The tasklist component is an editable list of tasks currently
    associated with a date and location. 
    */

    return (
        <>
        <h3>
            {tasks ? heading : "New task"}
        </h3>
        {(tasks || []).map(task => <Task {...{task, key: task}}/>)}
        </>)
};