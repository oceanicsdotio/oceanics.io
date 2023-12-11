import React from "react";
import useFractalNoise from "./useFractalNoise";
import type { IFractalNoise } from "./useFractalNoise";

const FractalNoise = (args: IFractalNoise) => {
    const {ref, message} = useFractalNoise(args);
    return <div>
        <label>{message}</label>
        <canvas ref={ref} />
    </div>
}
FractalNoise.displayName = "FractalNoise";
export default FractalNoise;