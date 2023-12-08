import React, {useState, useEffect} from "react";
import Oceanside from "./Oceanside";
import type {ApplicationType} from "./Oceanside";
import styled from "styled-components";
import { ghost } from "../../palette";
import * as PageData from "./PageData.json";
export {PageData as PageData}

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Index = (props: ApplicationType) => {
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    const description: string[] = PageData.campaigns[1].description.split("\n");
    return (
        <>
            {isClient && <Oceanside {...props}/>}
            <div>
                {description.map((x: string, index: number) => 
                    <p key={`paragraph-${index}`}>{x}</p>)}
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