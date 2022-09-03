
import matter from "gray-matter";
import type { Handler } from "@netlify/functions";
import { materialize } from "./shared/middleware";
import { Links } from "oceanics-io-api-wasm";

/**
 * Endpoint allows bulk upload of content metadata. 
 * 
 * 1. Parse frontmatter from doc.
 * 2. Create linked nodes if they do not already exist. 
 * 3. Create topology.
 */
const handler: Handler = async ({ body }) => {
    const { data: {content, references=[], ...data} } = matter(body);
   
    const memo = materialize(data, "n0", "Memos");

    const {query} = memo.create();
    const linkQueries = references.map((each: Record<string, unknown>) => {
        const node = materialize(each, `n1`, "Memos");
        const {query} = new Links("Reference", 0, 0, "").insert(memo, node);
        return query
    });

    return {
        statusCode: 200,
        body: JSON.stringify({
            query,
            links: linkQueries,
            content
        })
    }
}

export { handler }
