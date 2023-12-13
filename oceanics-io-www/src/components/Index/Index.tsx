import React, {useState, useEffect} from "react";
import Oceanside from "../Oceanside/Oceanside";
import type {ApplicationType} from "../Oceanside/Oceanside";
import styled from "styled-components";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
export const Index = ({className, ...props}: ApplicationType) => {
    // Prevent pre-render by NextJS
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return (
        <div className={className}>
            {isClient && <Oceanside {...props}/>}
            <p>To protect our Ocean, you need to draw on community knowledge and make data-driven decisions for the future.</p>
            <p>We analyze public and proprietary assets and serve you synthetic and aggregate products to manage risk and conflict.</p>
            <p>Whether watching your surf or seeking opportunity.</p>
        </div>
    )
};

/**
 * Styled version
 */
export const StyledIndex = styled(Index)`
    & p {
        font-size: 1.5em;
    }
`

export default StyledIndex;