
import matter from "gray-matter";
import type { Input } from "gray-matter";
import type { Handler } from "@netlify/functions";
import * as db from "./shared/queries";
import { Links, Node } from "oceanics-io-api-wasm";

/**
 * Endpoint allows bulk upload of content metadata. 
 * 
 * 1. Parse frontmatter from doc.
 * 2. Create linked nodes if they do not already exist. 
 * 3. Create topology.
 */
const handler: Handler = async ({ body }) => {
    const { 
        data: {
            references=[], 
            ...data
        }, 
        content
    } = matter(body as Input);
   
    const memo = Node.materialize(JSON.stringify(data), "n0", "Memos");

    const {query} = memo.create();
    const linkQueries = references.map((each: Record<string, unknown>) => {
        const node = Node.materialize(JSON.stringify(each), `n1`, "Memos");
        const {query} = new Links("Reference", 0, 0, "").insert(memo, node);
        return query
    });
    await db.connect(query, false);
    await db.batch(linkQueries, false);

    return {
        statusCode: 200,
        body: JSON.stringify({
            query,
            links: linkQueries,
            content: content.length
        })
    }
}

export { handler }
