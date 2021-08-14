/**
 * React and friends
 */
import React, {FC} from "react";

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Reference component
 */
import Reference, {ReferencePropTypes} from "./Reference"

/**
 * Type checking
 */
import {ReferenceType, ReferencesType} from "./utils";


/**
 * List of formatted citations to append to a document that
 * includes citations. 
 */
export const References: FC<ReferencesType> = ({
    citations,
    className,
}) => {
    return (
        <div className={className}>
            <a id={"citations"}/>        
            {(citations??[]).map((props: ReferenceType) => <Reference {...props}/>)}
        </div>
    );
}
/**
 * Runtime type checking
 */
References.propTypes = {
    className: PropTypes.string,
    citations: PropTypes.arrayOf(PropTypes.shape(ReferencePropTypes).isRequired).isRequired
};

/**
 * Styled version with display logic
 */
const StyledSection = styled(References)`
    color: inherit;
    display: ${({citations}):string|undefined=>(citations??false)?undefined:"none"};
`;

/**
 * Styled version is exported as default
 */
export default StyledSection;