import React, {useState, useEffect} from "react";
import styled from "styled-components";
import {ghost, grey} from "../palette";


/**
 * Use here temporarily for demo.
 */
import useDataStream from "../hooks/useDataStream";
   
/**
A thing is a physical entity in the SensorThings ontology. In 
this case, thing primarily means a mobile vehicle that may 
carry people, like a boat or truck. 

Hovering sets the expansion state.

 * Resource levels are a common feature on marine thing and facilities.
 * 
 * Take basic user provided information about a tank and transform
 * it into the the nomenclature of the Vessel layout.
*/
const Thing = ({
    className,
    spec: {
        name,
        properties=null
    }
}) => {

    /**
     * Indicators for physical values zero and greater
     */
    const [meters, setMeters] = useState([]);

    /**
     * Future cases can receive meter levels from networked devices
     */
    useEffect(()=>{
        setMeters(properties && properties.meters ? properties.meters : []);
    }, []);

    /**
     * Show calculated environmental data as example.
     */
    const { ref } = useDataStream({});

    return <div className={className}>
        {name}
        <canvas ref={ref}/>
        {"Light"}
        {meters.map(props => 
            <div key={`${name} ${props.name}`}>
                <label>{props.name}</label>
                <meter {...props}/>
            </div>
        )}
    </div>
};


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

export default StyledThing;