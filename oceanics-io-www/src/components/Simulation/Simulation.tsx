import React from "react";
import useSimulation from  "./useSimulation";
import type { ISimulation } from "./useSimulation";

const Simulation = (args: ISimulation) => {
    const {ref, preview, message} = useSimulation(args);
    return (<div>
        <p>{message}</p>
        <canvas ref={ref}/>
        <canvas ref={preview.ref}/>
    </div>)
}

export default Simulation