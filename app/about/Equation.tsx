import katex from "katex";
import React from "react";

export interface IEquation {
    text: string
    output?: "mathml"
}

/**
 * For more complete implementation see: 
 * https://github.com/zzish/react-latex/blob/master/src/latex.js
 */
export const Equation = ({text, output="mathml"}: IEquation) => {
    const html = katex.renderToString(text, {output});
    return (
        <span dangerouslySetInnerHTML={{__html: html}} />
    )
}

export default Equation
