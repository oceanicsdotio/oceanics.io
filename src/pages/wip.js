import React from "react";

import useLagrangian from "../hooks/useLagrangianTest";

export default ({}) => {

    const ref = useLagrangian({});

    return <canvas ref={ref}/>
}