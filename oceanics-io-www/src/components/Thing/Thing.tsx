import React, {useState} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import {ghost, grey} from "../../palette";

type MeterType = {
    name: string
    min: number
    max: number
    value: number
}
export type ThingType = {
    className?: string,
    spec: {
        name: string,
        properties: {
            meters?: MeterType[]
        }
    }
}
const propTypes = {
    className: PropTypes.string,
    spec: PropTypes.shape({
        name: PropTypes.string.isRequired,
        properties: PropTypes.shape({
            meters: PropTypes.arrayOf(
                PropTypes.shape({
                    name: PropTypes.string.isRequired,
                    min: PropTypes.number.isRequired,
                    max: PropTypes.number.isRequired,
                    value: PropTypes.number.isRequired
                })
            )
        })
    }).isRequired
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

    return (
        <div className={className}>
            {name}
            {meters.map(({name: _name, ...props}: MeterType) => 
                <div key={`${name} ${_name}`}>
                    <label>{_name}</label>
                    <meter {...props}/>
                </div>
            )}
        </div>
    )
};

/**
 * Styled version of the Thing Component
 */
export const StyledThing = styled(Thing)`

    display: block;
    border: 1px solid ${ghost};
    padding: 1rem;
    margin: 0;
    color: ${ghost};
    box-sizing: border-box;

    font-size: inherit;
    font-family: inherit;

    & label {
        display: block;
        font-size: smaller;
        font-style: italic;
        text-transform: lowercase;
        margin: 0;
    }

    & meter {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 1rem;
        border: 0.1rem solid;
        background: none;
        color: ${grey};
        box-sizing: border-box;   
    }
`;

Thing.displayName = "Thing";
Thing.propTypes = propTypes;
StyledThing.propTypes = propTypes;
export default StyledThing;