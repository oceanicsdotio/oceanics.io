/**
 * React and friends
 */
 import React from "react";

 /**
  * Runtime input type checking
  */
 import PropTypes from "prop-types";

 
 /**
  * Compile time type definitions
  */
 type InlineRefType = {
     authors: string[],
     year: number,
     hash: string,
     unwrap: boolean,
     namedAuthors: number
 }
 
 /**
  Include inline links for references in markdown
  */
 export const Inline = ({
     authors,
     year,
     unwrap=false,
     hash,
     namedAuthors=3
 }: InlineRefType) => {
     const nAuthors = authors.length;
     const names = authors.slice(0, Math.min(nAuthors, namedAuthors)).map((x: string) => x.split(" ")[0]);
     let nameString;
     if (nAuthors === 1) {
         nameString = names[0];
     } else if (nAuthors > namedAuthors) {
         nameString = `${names[0]} et al `;
     } else {
         nameString = [names.slice(0, names.length-1).join(", "), names[names.length-1]].join(" & ")
     }
     
     const text = unwrap ? `${nameString} (${year})` : `(${nameString} ${year})`;
    
     return <a href={`#${hash}`}>{text}</a>;
 };
 
 /**
  * Runtime type checking
  */
 Inline.propTypes = {
     authors: PropTypes.arrayOf(PropTypes.string),
     year: PropTypes.number.isRequired,
     hash: PropTypes.string,
     namedAuthors: PropTypes.number,
     unwrap: PropTypes.bool
 };
 
 export default Inline