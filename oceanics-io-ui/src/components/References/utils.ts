/**
 * Inputs to hashing/uniqueId function
 */
 type ReferenceHashType = {
    authors: string[],
    title: string,
    year: number
}

/**
Some of the canonical fields do not contain uniquely identifying information. Technically,
the same content might appear in two places. 
*/
export const referenceHash = ({authors, title, year}: ReferenceHashType) => {
   
    const stringRepr = (`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`).replace(/\s/g, "");
    const hashCode = (s: string) => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    const hash =  hashCode(stringRepr);
    return hash;
};