/**
 * React and friends.
 */
 import React, { useEffect, useState } from "react";

 /**
  * For interactive elements
  */
 import FormContainer from "..Form/FormContainer";
 
 
 import Article from "./Article";
 
 import useQueryString, { onSelectValue, onIncrementValue } from "../hooks/useQueryString";
 
 
 /**
  * Some of the canonical fields do not contain uniquely identifying information. 
  * Technically, the same content might appear in two places. 
  */
 const referenceHash = ({authors, title, year}) => {
    
     const stringRepr = `${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`.replace(/\s/g, "");
     const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
     return hashCode(stringRepr);
 };
 
 /**
  * How many articles are made visible at a time.
  */
 const itemIncrement = 3;
 
 /**
  * Base component for web landing page.
  * 
  * Optionally use query parameters and hash anchor to filter content. 
  */
 export default ({
     data: {
         allMdx: {
             nodes,
             group
         },
         site: {
             siteMetadata: { title }
         }
     },
     location: {
         search
     }
 }) => {
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
         const _eval = (obj, key, data) =>
             (!!obj[key] && !(data||[]).includes(obj[key]));
 
         // Use to filter based on query string
         const _filter = ({
             frontmatter: {
                 tags,
                 citations,
             }
         }) => !(
             _eval(query, "tag", tags) || 
             _eval(query, "reference", (citations||[]).map(referenceHash))
         );
         
         // Filter down to just matching, and then limit number of items
         setVisible(nodes.filter(_filter).slice(0, query.items));
 
     }, [ query ]);
 
     return (
       
             {visible.map((props, ii) => <Article {...{...props, search, key: `node-${ii}`}}/>)}
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
 
 