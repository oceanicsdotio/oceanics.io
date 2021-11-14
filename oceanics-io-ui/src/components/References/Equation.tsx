// @ts-ignore
import katex from "katex";
import React from "react";
import type {FC} from "react";

interface IEquation {
    text: string;
}

const Equation: FC<IEquation> = ({text}) => {
    return (
        <span>{katex.render(text)}</span>
    )
}

export default Equation
