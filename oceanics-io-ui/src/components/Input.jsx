import React from "react"
import styled from "styled-components"
import PropTypes from "prop-types"

/**
 * Generic form input component that converts to the
 * appropriate type
 */
export const Input = ({
    id,
    type,
    className,
    name = null,
    options = null,
    ...props
}) => {
    switch (type) {
        case "long":
            return <textarea
                id={id}
                className={className}
                name={name || id}
                {...props}
            />
        case "select":
            return <select
                id={id}
                className={className}
                name={name || id}
                {...props}
            >
                {(options || []).map((x, ii) =>
                    <option key={`${id}-option-${ii}`} value={x}>{x}</option>
                )}
            </select>
        case "button":  // doesn't use name || id
            return <input
                id={id}
                className={className}
                type={type}
                {...props}
            />
        default:
            return <input
                id={id}
                className={className}
                type={type}
                name={name || id}
                {...props}
            />
    }
};

Input.propTypes = {
    id: PropTypes.string.isRequired,
    type,
    className: PropTypes.string,
    name: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
}


/**
 * The InputWrapper component is a styled version of the standard
 * Input
 */
export const InputWrapper = styled(Input)`

 background-color: ${({ destructive }) => {
        if (destructive) return orange;
        return charcoal;
    }};
 
 color: ${({ destructive, type }) => {
        if (destructive) return red;
        if (type === "button") return orange;
        return ghost;
    }};

 border: dashed 1px ${grey};
 border-radius: 5px;
 padding: 0.25rem;
 margin: 0;
 margin-bottom: 0.5rem;

 display: block;
 font-family: inherit;
 font-size: inherit;
 width: 100%;
 
 box-sizing: border-box;

 cursor: ${({ type }) => type === "button" ? "pointer" : null};
 
 -webkit-appearance: none;  /*Removes default chrome and safari style*/
 -moz-appearance: none;  /*Removes default style Firefox*/

 ::after {
     content: ${({ required }) => required ? "'(!)'" : null};
     color: orange;
     font-size: smaller;
 }

 & > * {
     padding: 0;
     margin: 0;
     max-width: 100%;
 } 
`;


export default InputWrapper