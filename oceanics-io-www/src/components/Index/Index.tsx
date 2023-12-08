import React, {useState, useEffect} from "react";
import Oceanside from "../Oceanside/Oceanside";
import type {ApplicationType} from "../Oceanside/Oceanside";
import styled from "styled-components";
import { ghost } from "../../palette";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Index = (props: ApplicationType) => {
    // Prevent pre-render by NextJS
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    return (
        <>
            {isClient && <Oceanside {...props}/>}
            <div>
                To protect our Ocean, you need to draw on community knowledge and make data-driven decisions for the future.
                
                We analyze public and proprietary assets and serve you synthetic and aggregate products to manage risk and conflict.
                
                Whether watching your surf or seeking opportunity.
            </div>
        </>
    )
};

/**
 * Styled version
 */
const StyledIndex = styled(Index)`
    & p {
        font-size: larger;
    }
    & h2 {
        color: ${ghost};
        font-size: x-large;
    }
`

export default StyledIndex;