/**
 * React and friends
 */
import React, {useState} from "react";

/**
 * Type checking
 */
//@ts-ignore
import PropTypes from "prop-types";

/**
 * Component-level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import {ghost, grey} from "../../palette";

/**
 * Type for Meter child components
 */
export type MeterType = {
    name: string;
}

/**
 * TypeScript definition for inputs
 */
export type ThingType = {
    className?: string,
    spec: {
        name: string,
        properties: {
            meters: MeterType[]
        }
    }
}
   
/**
 * A thing is a physical entity in the SensorThings ontology. In 
 * this case, thing primarily means a mobile vehicle that may 
 * carry people, like a boat or truck. 
 * 
 * Hovering sets the expansion state.
 *
 * Resource levels are a common feature on marine thing and facilities.
 * 
 * Take basic user provided information about a tank and transform
 * it into the the nomenclature of the Vessel layout.
*/
export const Thing = ({
    className,
    spec: {
        name,
        properties: {
            meters: _meters=[]
        }
    }
}: ThingType) => {
    /**
     * Indicators for physical values, zero and greater
     */
    const [meters,] = useState(_meters);

    /**
     * Wrapped component block
     */
    return <div className={className}>
        {name}
        {meters.map(({name: _name, ...props}: MeterType) => 
            <div key={`${name} ${_name}`}>
                <label>{_name}</label>
                <meter {...props}/>
            </div>
        )}
    </div>
};

/**
 * Runtime typechecking
 */
Thing.propTypes = {
    className: PropTypes.string,
    spec: PropTypes.shape({
        name: PropTypes.string.isRequired,
        properties: PropTypes.shape({
            meters: PropTypes.arrayOf(
                PropTypes.shape({
                    name: PropTypes.string.isRequired
                })
            )
        })
    }).isRequired
}

/**
 * Styled version of the Thing Component
 */
export const StyledThing = styled(Thing)`
    display: block;
    border-bottom: 0.07rem solid ${ghost};
    padding: 1rem;
    margin: 0;
    color: ${ghost};
    box-sizing: border-box;

    font-size: large;
    font-family: inherit;

    & > div {
        & > meter {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 1rem;
            border: 0.1rem solid;
            background: none;
            color: ${grey};
            box-sizing: border-box;   
        }
    }
`;

/**
 * Styled version is default export
 */
export default StyledThing;