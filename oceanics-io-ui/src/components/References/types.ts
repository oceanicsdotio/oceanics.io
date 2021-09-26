import {MouseEventHandler} from "react";
const NAMED_AUTHORS = 3; 

/**
 * Query string parameters used by the Index component to filter
 * which documents are visible. Actual parsing of URL is done in the
 * calling application.
 */
export type QueryType = {
    items?: number;
    label?: string;
    reference?: number;
};

/**
 * Information about the document, which may or may not 
 * be duplicated in the content.
 */
type MetadataType = {
    authors: string[];
    title: string;
    published: Date;
    description: string;
    labels: {
        value: string;
        onClick?: MouseEventHandler<HTMLAnchorElement>;
    }[];
    references: Document[];
    publication: string;
    volume: string;
    pages: number[][];
};

export interface IStyled {
    className?: string;
};

export interface IDocument extends IStyled {
    document: Document;
};

/**
 * A document is a cross-referenced piece of information. This could
 * be an academic journal article, or an internal memo or report.
 */
export class Document {
    public metadata: MetadataType;
    public content?: string;

    constructor ({
        metadata, 
        content
    }: {
        metadata: MetadataType;
        content: string;
    }) {
        this.metadata = metadata;
        this.content = content;
    };

    public get hash() {
        const inputs = [
            ...this.metadata.authors, 
            this.metadata.published.getFullYear().toString(), 
            this.metadata.title
        ];
        const series = inputs.join("").replace(/\s/g, "").toLowerCase().split('');
        return series.reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0).toString();
    }

    public get year(): number {
        return this.metadata.published.getFullYear();
    }

    public get authors() {
        const {authors} = this.metadata;
        const count = authors.length;
        const stop = Math.min(count, NAMED_AUTHORS);
        const lastNames = authors.slice(0, stop).map((x: string) => x.split(" ")[0]);

        if (count === 0) {
            throw Error("No Document Attribution");
        } else if (count === 1) {
            return lastNames[0];
        } else if (count > NAMED_AUTHORS) {
            return `${lastNames.join(", ")} et al`;
        } else {
            const tail = lastNames.pop();
            return `${lastNames.join(", ")} & ${tail}`
        }
    }

    public get reference() {
        
        // const _pages = pages ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
        // const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${publication} ${volume || ""}${pages}`;
        return "";
        
    }
};