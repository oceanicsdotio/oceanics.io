/**
 * Inputs to hashing/uniqueId function
 */
 type ReferenceHashType = {
    authors: string[],
    title: string,
    year: number
}

/**
 * Compile time type checking
 */
 type OptString = string | null;
 export type PartialReference = {
    authors: string[];
    year: number;
    title: string;
};
 export type ReferenceType = PartialReference & {
     className?: string|undefined;
     journal?: OptString;
     volume?: OptString;
     pageRange: number[];
 };
 export type FrontmatterType = {
    title: string;
    date: string;
    description: string;
    tags: string[];
    citations?: ReferenceType[];
}
export type ArticleBaseType = {
    frontmatter: FrontmatterType;
    fields: {
        slug: string;
    };
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