/**
 * React and friends.
 */
 import React, { useMemo } from "react";

 /**
  * Needed for parsing source files
  */
 import YAML from "yaml";
 
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
 import FormContainer from "../Form/FormContainer";
 
 /**
  * Page data
  */
 // @ts-ignore
 import about from "js-yaml-loader!./campaign.yml";
 
 
 /**
  * Larger paragraphs
  */
 const StyledParagraph = styled.p`
     font-size: larger;
 `;
 

 const CampaignContainer = styled.div`
     margin-bottom: 3em;
 
 
     & p {
         font-size: 1.3rem;
         margin-top: 1rem;
         margin-bottom: 1rem;
         line-height: 1.6rem;
     }
 
     & div {
         color: ${ghost};
         font-size: 2rem;
     }
 `;
 
 type CampaignType = {
     navigate: Function
 }

 /**
  * Base component for web landing page.
  * 
  * Optionally use query parameters and hash anchor to filter content. 
  */
 export const Campaign = ({
     navigate
 }: CampaignType) => {
 
     /**
      * Use a memo so that if something decides to refresh the parent,
      * we won't pick the other narrative and be confusing. 
      */
      const version = useMemo(() => {
 
         const random = Math.floor(Math.random() * about.length);
         const { text, ...props } = about[random];
 
         return {
             ...props,
             content: YAML.parse(text)
                 .split("\n")
                 .filter((paragraph: string) => paragraph)
         }
     }, []);    
 
 
     return <CampaignContainer>
        <div>
        {"Autonomous, Prosperous, Accountable. Pick Three."} 
        </div>
        {version.content.map((text: string, ii: number) => 
            <StyledParagraph key={`paragraph-${ii}`} children={text}/>)
        }
    
        <FormContainer
            actions={[
            //     {
            //     value: `${version.response}`,
            //     type: "button",
            //     onClick: () => {navigateWithQuery(`/app`, search, {campaign: version.name})}
            // },
            {
                value: `Learn about our API`,
                type: "button",
                onClick: () => {navigate(`/bathysphere/`)}
            },{
                value: "See the science",
                type: "button",
                onClick: ()=>{navigate(`/references/`)}
            }]}
        />
    </CampaignContainer>
 }