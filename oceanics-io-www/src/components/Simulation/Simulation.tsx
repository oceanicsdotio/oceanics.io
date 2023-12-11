import React from "react";
import useSimulation from  "./useSimulation";
export interface ISimulation {

}
const Simulation = (args: ISimulation) => {
    const {ref} = useSimulation(args);
    return (<div>
        <canvas ref={ref}/>
    </div>)
}

export default Simulation