/**
 * React and friends
 */
import React, { FC, ChangeEventHandler } from "react"

/**
 * Component level styling
 */
import styled from "styled-components"

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types"

/**
 * Color palette
 */
import {red, orange, ghost, grey, charcoal} from "../../palette"

/**
 * Build time type checking
 */
export type LongTextType = {
    id: string;
    type?: string;
    className?: string;
    name: string | null;
    required?: boolean;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
}

/**
 * Generic form input component that converts to the
 * appropriate type
 */
export const LongText: FC<LongTextType> = ({
    id,
    type,
    className,
    name = null,
    ...props
}) => 
    <textarea
        id={id}
        name={name || id}
        {...props}
    />
/**
 * Runtime type checking
 */
LongText.propTypes = {
    id: PropTypes.string.isRequired,
    className: PropTypes.string,
    name: PropTypes.string,
    required: PropTypes.bool
};

/**
 * The LongTextWrapper component is a styled version of the standard
 * LongText
 */
export const LongTextWrapper = styled(LongText)`

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
     color: ${orange};
     font-size: smaller;
 }

 & > * {
     padding: 0;
     margin: 0;
     max-width: 100%;
 } 
`;

/**
 * Default export is styled version
 */
export default LongTextWrapper