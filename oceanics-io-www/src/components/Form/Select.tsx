import React from "react"
import type { ChangeEventHandler } from "react"
import styled from "styled-components";
import PropTypes from "prop-types";
import { ghost, grey } from "../../palette";

/**
 * Build time type checking
 */
export type SelectType = {
    id: string;
    className?: string;
    name?: string;
    options: string[];
    onChange: ChangeEventHandler<HTMLSelectElement>;
};

/**
 * Generic form input component that converts to the
 * appropriate type
 */
const Select = ({
    id,
    className,
    name,
    options,
    onChange,
}: SelectType) => {
   return (
        <div className={className}>
            <select id={id} name={name??id} onChange={onChange}>
                {options.map((x: string, ii: number) =>
                    <option key={`${id}-option-${ii}`} value={x}>{x}</option>
                )}
            </select>
        </div>
    )
}

/**
 * Runtime type checking
 */
Select.propTypes = {
    id: PropTypes.string.isRequired,
    className: PropTypes.string,
    name: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
};

/**
 * The InputWrapper component is a styled version of the standard
 * Input
 */
export const StyledSelect = styled(Select)`
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
export default StyledSelect;