import type {Handler} from "@netlify/functions";
import { connect } from "../shared/shared";
import { GraphNode } from "../shared/cypher";

const handler: Handler = async ({}) => {
    const cypher = GraphNode.allLabels();
    const {records} = await connect(cypher.query)
    //@ts-ignore
    const fields = records.flatMap(({_fields: [label]}) => label)
    const result = [...new Set(fields)].map((label: string) => Object({
        name: label,
        url: `/api/${label}`
    }));
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
}

export {handler}