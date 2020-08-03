import React, {useState} from "react";


const Task = (props) => {

    const [complete, setComplete] = useState(true);

    return (
        <div>Task</div>
    );
};

const TaskingCapability = (props) => {

    const [complete, setComplete] = useState(true);

    return (
        <div>TaskingCapability</div>
    );
};

const DataStream = (props) => {

    const {name} = props;

    return (
        <div>DataStream</div>
    );
};

const Observations = (props) => {

    const [progress, setProgress] =  useState(0.0);

    return (
    <div>Observations: {progress} %</div>
    );
};

export default (props) => {
    return (
        <div>

            TaskingCapability:
            <TaskingCapability />

        
            Input:
            <DataStream name={"A"}/>
            <Observations />
            <DataStream name={"B"}/>
            <Observations />

            Output:
            <DataStream name={"B"}/>
            <Observations />

        </div>
    );
};
