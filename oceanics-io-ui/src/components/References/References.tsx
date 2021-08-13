/**
 * React and friends
 */
import React, {Fragment, FC} from "react";

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
import Reference, {ReferenceType, ReferencePropTypes} from "./Reference"

/**
 * List of formatted references to append to a document that
 * includes citations. 
 */
export const References: FC<{
    heading?: string,
    references: ReferenceType[]
}> = ({
    heading="References", 
    references=[]
}) =>
    <Fragment>
        <a id={"references"} hidden={!references || !heading}>
            <h1>{heading}</h1>
        </a>
        {references.map((props: ReferenceType) => <Reference {...props}/>)}
    </Fragment>;

/**
 * Runtime type checking
 */
References.propTypes = {
    heading: PropTypes.string,
    references: PropTypes.arrayOf(PropTypes.shape(ReferencePropTypes).isRequired).isRequired
};

const StyledSection = styled(References)`
    color: inherit;
    visibility: ${({references, heading})=>(!references || !heading)?"hidden":null};
`;


/**
 * BAse version is exported as default
 */
export default StyledSection;