import React, { useMemo } from "react";
import styled from "styled-components";
import { ghost } from "../../palette";

/**
 * For interactive elements
 */
import * as PageData from "./PageData.json";
export {PageData as PageData}

type CampaignType = {
    callToAction: string;
    response: string;
    name: string;
    description: string;
}
export interface ICampaignType {
    className?: string;
    campaign: CampaignType;
}

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
export const Campaign = ({
    className,
    campaign: {
        description
    }
}: ICampaignType) => {
    /**
     * Format the narrative, we need to break into semantic paragraphs.
     */
    const narrative = useMemo(
        () => description.split("\n").map(
            (x: string, index: number) => 
                <p key={`paragraph-${index}`}>{x}</p>
        ),
        [description]
    )

    return (
        <div className={className}>
            {narrative}
        </div>
    )
}

/**
 * Styled version
 */
const StyledCampaign = styled(Campaign)`
    & p {
        font-size: larger;
    }
    & h2 {
        color: ${ghost};
        font-size: x-large;
    }
`

/**
 * Default export is styled version
 */
export default StyledCampaign