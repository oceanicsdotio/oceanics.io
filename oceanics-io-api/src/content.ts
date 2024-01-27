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
   
    const memo = new Node(JSON.stringify(data), "n0", "Memos");

    const {query} = memo.create();
    await db.write(query);

    const linkQueries = references.map((each: Record<string, unknown>) => {
        const node = new Node(JSON.stringify(each), `n1`, "Memos");
        const {query} = new Links("Reference", 0, 0, "").insert(memo, node);
        return query
    });
    await db.writeMany(linkQueries);

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
