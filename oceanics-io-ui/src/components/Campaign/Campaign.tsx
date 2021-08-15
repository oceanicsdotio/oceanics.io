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

/**
 * Page data
 */
import PageData from "./PageData.json";

type CampaignType = {
    callToAction: string;
    response: string;
    name: string;
    description: string;
};
type PageType = {
    title: string;
    campaigns: CampaignType[];
}
export interface ICampaignType {
    navigate: (arg0: string) => void;
    className?: string;
};


/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
export const Campaign: FC<ICampaignType> = ({
    navigate,
    className,
}) => {
    /**
    * Unpack static data
    */
    const {title, campaigns}: PageType = PageData;

    /** 
     * Pick one of the campaigns at random
     */
    const index: number = useMemo(
        () => Math.floor(Math.random() * campaigns.length), 
        [campaigns]
    );

    /**
     * Use a memo so that if something decides to refresh the parent,
     * we won't pick the other narrative and be confusing. 
     */
    const campaign: CampaignType = useMemo(
        () => campaigns[index], 
        [index]
    );

    /**
     * Format the narrative, we need to break into semantic paragraphs
     */
    const narrative = useMemo(
        () => campaign.description.split("\n").map((x: string)=><p>{x}</p>),
        [campaign]
    )


    return (
        <div className={className}>
            <h2>{title}</h2>
            {narrative}
            <Button onClick={()=>{navigate(`/bathysphere/`)}}>
                {`Learn about our API`}
            </Button>
            <Button onClick={()=>{navigate(`/references/`)}}>
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