import type {Handler} from "@netlify/functions";
import { connect } from "../shared/shared";
import { GraphNode, Cypher, parseAsNodes } from "../shared/cypher";


interface IMutate {
    entity: string;
}

const mutate = ({entity}) => {
    const [e, mutation] = parseAsNodes({}, {});
    const cypher: Cypher = e.mutate(mutation);
    return connect(cypher.query);
}

/**
 * Valid for single and multiple fields
 */
const metadata = ({entity, uuid}) => {
    const cypher = new Cypher("", true);
    const value = connect(cypher.query);
    return {
        "@iot.count": 0,
        value,
    }
};


// @context
// def delete(db, entity, uuid):
//     # typing: (Driver, str, str) -> (None, int)
//     """
//     Delete a pattern from the graph
//     """
//     eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
//     return None, 204

const handler: Handler = async ({
    body,
    queryStringParameters
}) => {
    const uuid: string = queryStringParameters["uuid"];
    const {entityClass, ...props} = JSON.parse(body);
    const type = Entities[props.entity];


    return {
        statusCode: 501,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({message: "Not implemented"})
    };
}

export {handler}


