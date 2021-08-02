/**
 * React and friends.
 */
 import React, { useEffect, useState } from "react";

 /**
  * For interactive elements
  */
 import FormContainer from "../Form/FormContainer";
 
 /**
  * Preview of article
  */
 import Article from "./Article";
 
 /**
  * Navigation
  */
 import useQueryString, { onSelectValue, onIncrementValue } from "../hooks/useQueryString";
 
 import {referenceHash} from "./utils"
 import {ReferenceType} from "./Reference"
 
 /**
  * How many articles are made visible at a time.
  */
 const itemIncrement = 3;


 type FrontmatterType = {
     tags: string[],
     citations: ReferenceType[],
 }

 type IndexType = {
     data: {
         allMdx: {
             nodes: any,
             group: any
         }
     },
     location: {
         search: string
     }
 }
 
 /**
  * Base component for web landing page.
  * 
  * Optionally use query parameters and hash anchor to filter content. 
  */
 const Index = ({
     data: {
         allMdx: {
             nodes,
             group
         }
     },
     location: {
         search
     }
 }: IndexType) => {
     /**
      * The array of visible articles. The initial value is the subset from 0 to
      * the increment constant. 
      */
     const [ visible, setVisible ] = useState(nodes.slice(0, itemIncrement));
 
     const { query } = useQueryString({
         search,
         defaults: {
             items: itemIncrement,
             tag: null,
             reference: null
         }
     })
     /**
      * When page loads or search string changes parse the string to React state.
      * 
      * Determine visible content. 
      */
     useEffect(() => {
         if (!query) return;
 
         // Pick up a value and see if article has it.
         const _eval = (obj: any, key: string, data: string[]) =>
             (!!obj[key] && !(data||[]).includes(obj[key]));
 
         // Use to filter based on query string
         const _filter = ({
             frontmatter: {
                 tags,
                 citations=[],
             }
         }: {frontmatter: FrontmatterType}) => !(
             _eval(query, "tag", tags) || 
             _eval(query, "reference", citations.map(referenceHash))
         );
         
         // Filter down to just matching, and then limit number of items
         setVisible(nodes.filter(_filter).slice(0, query.items));
 
     }, [ query ]);
 
     return (
       
             {visible.map((props, ii) => 
                <Article {...{...props, search, key: `node-${ii}`}}/>)}
             <br/>
             
             <FormContainer
                 fields={[{
                     type: "select",
                     id: "filter by tag",
                     options: group.map(({ fieldValue }) => fieldValue),
                     onChange: onSelectValue(search, "tag")
                 }]}
                 actions={[{
                     value: "More arcana",
                     type: "button",
                     onClick: onIncrementValue(search, "items", itemIncrement)
                 }]}
             />
     )
 };


 export default Index
 
 