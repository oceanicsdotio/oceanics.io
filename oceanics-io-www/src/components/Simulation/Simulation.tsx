import React from "react";
import useSimulation from  "./useSimulation";
import type { ISimulation } from "./useSimulation";

const Simulation = (args: ISimulation) => {
    const {ref} = useSimulation(args);
    return (<div>
        <canvas ref={ref}/>
    </div>)
}

export default Simulation