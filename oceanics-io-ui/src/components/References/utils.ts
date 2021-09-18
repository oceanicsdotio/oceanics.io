import {MouseEventHandler} from "react";
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
type StyledType = {
    className?: string;
}

/**
 * Reference partials
 */
export type PartialReference = {
    authors: string[];
    year: number;
    title: string;
};
export type ReferenceType = PartialReference & StyledType & {
    journal?: OptString;
    volume?: OptString;
    pageRange: number[];
};

/**
 * Article metadata type
 */
export type FrontmatterType = {
    title: string;
    date: string;
    description: string;
    tags: string[];
    citations?: ReferenceType[];
};

/**
 * Article with data and metadata
 */
export type PartialArticle = {
    frontmatter: FrontmatterType;
    fields: {
        slug: string;
    };
}
export type ArticleType = StyledType & PartialArticle & {
    onClickTag: (arg0: string) => MouseEventHandler;
};

/**
 * Query string mapping
 */
export type QueryType = {
    items: number;
    tag: string;
    reference: number;
    increment: number;
};

export type GroupType = {
    fieldValue: string;
}

/**
 * Main page inputs
 */
export type IndexType = StyledType & {
    data: {
        allMdx: {
            nodes: PartialArticle[];
            group: GroupType[];
        }
    };
    query: QueryType;
    onClickTag: (tag: string) => MouseEventHandler<HTMLInputElement>;
    onClickMore: MouseEventHandler<HTMLButtonElement>;
};

/**
 * Additional props for Inline References
 */
export type InlineRefType = PartialReference & {
    unwrap: boolean;
    namedAuthors: number;
};

/**
 * Regular block references inputs
 */
export type ReferencesType = StyledType & {
    citations?: ReferenceType[];
};



/**
Some of the canonical fields do not contain uniquely identifying information. Technically,
the same content might appear in two places. 
*/
export const referenceHash = ({ authors, title, year }: ReferenceHashType) => {

    const stringRepr = (`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`).replace(/\s/g, "");
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const hash = hashCode(stringRepr);
    return hash;
};

export function filterFrontmatter (query: QueryType) {
    return function (article: ArticleType): boolean {
        const tags = new Set(article.frontmatter.tags);
        const refs = new Set((article.frontmatter.citations ?? []).map(referenceHash))
        const tagMatch: boolean = !!query.tag && tags.has(query.tag);
        const refMatch: boolean = !!query.reference && refs.has(query.reference);
        return tagMatch && refMatch
    }
}