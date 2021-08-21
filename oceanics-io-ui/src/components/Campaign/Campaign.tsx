/**
 * React and friends.
 */
import React, { useMemo, FC } from "react";

/**
 * Stylish stuff
 */
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { ghost } from "../../palette";

/**
 * For interactive elements
 */
import Button from "../Form/Button";
import * as PageData from "./PageData.json";
export {PageData as PageData}

type CampaignType = {
    callToAction: string;
    response: string;
    name: string;
    description: string;
};
export interface ICampaignType {
    navigate: (arg0: string) => void;
    className?: string;
    title: string;
    campaign: CampaignType;
};

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
export const Campaign: FC<ICampaignType> = ({
    navigate,
    className,
    title, 
    campaign: {
        description
    }
}) => {
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
            <h2>{title}</h2>
            {narrative}
            <Button onClick={()=>{navigate(`/bathysphere.html`)}}>
                {`Learn about our API`}
            </Button>
            <Button onClick={()=>{navigate(`/references`)}}>
                {`See the science`}
            </Button>
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