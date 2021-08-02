/**
 * React and friends
 */
import React, {Fragment} from "react";

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
import Reference, {ReferenceType} from "./Reference"


// Internal page link to navigate from table of contents or inline
const Anchor = styled.a`
    color: inherit;
    visibility: ${({hidden})=>hidden?"hidden":null};
`;






/**
 * List of formatted references to append to a document that
 * includes citations. 
 */
export const References = ({
    heading="References", 
    references=[]
}:{
    heading: string,
    references: ReferenceType[]
}) =>
    <Fragment>
        <Anchor id={"references"} hidden={!references || !heading}>
            <h1>{heading}</h1>
        </Anchor>
        {
            Object.entries(Object.fromEntries(
                references.map((props: ReferenceType) => 
                    [referenceHash(props), props])
            )).map(([hash, props]) => 
                <Fragment key={hash}>
                    <a id={hash} />
                    <Reference {...props}/>
                </Fragment>
            )
        }
    </Fragment>;

/**
 * Runtime type checking
 */
References.propTypes = {
    heading: PropTypes.string,
    references: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string
    }))
};

/**
 * BAse version is exported as default
 */
export default References;