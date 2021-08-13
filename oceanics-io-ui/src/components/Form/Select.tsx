/**
 * React and friends
 */
import React, { FC, ChangeEventHandler } from "react"

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types";

/**
 * Color palette
 */
import { ghost, grey } from "../../palette";

/**
 * Build time type checking
 */
export type SelectType = {
    id: string;
    type?: string;
    className?: string;
    name?: string;
    options: string[];
    onChange: ChangeEventHandler<HTMLInputElement>;
};

/**
 * Generic form input component that converts to the
 * appropriate type
 */
export const Input: FC<SelectType> = ({
    id,
    className,
    name,
    options,
}) =>
    <div className={className}>
        <select id={id} name={name ?? id}>
            {options.map((x: string, ii: number) =>
                <option key={`${id}-option-${ii}`} value={x}>{x}</option>
            )}
        </select>
    </div>

/**
 * Runtime type checking
 */
Input.propTypes = {
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    className: PropTypes.string,
    name: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
};

/**
 * The InputWrapper component is a styled version of the standard
 * Input
 */
export const InputWrapper = styled(Input)`
    color: ${ghost};
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
    cursor: pointer;
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/
    & > * {
        padding: 0;
        margin: 0;
        max-width: 100%;
    } 
`;

/**
 * Default export is styled version
 */
export default InputWrapper;