import React,  {Fragment} from "react";
import styled from "styled-components";


/**
 * Popup for port and navigation information. Rendered client-side.
 */
import Location from "../components/Location";

/**
 * Oyster suitability popup, or any normalized probability distribution function
 */
import SuitabilityInformation from "../components/SuitabilityInformation";


/**
 * Create a lookup table, so that layer schemas can reference them by key.
 * 
 * There is some magic here, in that you still need to know the key. 
 */
const popups = {
    suitability: SuitabilityInformation,
    locations: Location
};

export const PopUpContent = ({features, component, className}) => {

    const Component = popups[component];

    return <div className={className}>
        {features.map((x, key) => 
            <Fragment key={key}>
                <Component {...x}/>
            </Fragment>
        )}
    </div>
};




const StyledPopUpContent = styled(PopUpContent)`

    background: #101010FF;
    font-family: inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > canvas {
        width: 200px;
        height: 75px;
        display: block;
        border-bottom: 1px solid ${({fg="#ccc"})=>fg};
        image-rendering: crisp-edges;
    }

    & > div {
        overflow-y: scroll;
        max-height: 300px;
        height: fit-content;
        padding: 0.5rem;

        & > ul {
            padding: 0;

            & > li {
                color: #CCCCCCFF;
                margin: 0;
                padding: 0;
                display: block;
            }
        }
    }
`;

export default StyledPopUpContent;
