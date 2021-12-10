"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("../../shared/shared");
const cypher_1 = require("../../shared/cypher");
const mutate = ({ entity }) => {
    const [e, mutation] = (0, cypher_1.parseAsNodes)({}, {});
    const cypher = e.mutate(mutation);
    return (0, shared_1.connect)(cypher.query);
};
/**
 * Valid for single and multiple fields
 */
const metadata = ({ entity, uuid }) => {
    const cypher = new cypher_1.Cypher("", true);
    const value = (0, shared_1.connect)(cypher.query);
    return {
        "@iot.count": 0,
        value,
    };
};
// @context
// def delete(db, entity, uuid):
//     # typing: (Driver, str, str) -> (None, int)
//     """
//     Delete a pattern from the graph
//     """
//     eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
//     return None, 204
const handler = async ({ body, queryStringParameters }) => {
    const uuid = queryStringParameters["uuid"];
    const { entityClass, ...props } = JSON.parse(body);
    const type = Entities[props.entity];
    return {
        statusCode: 501,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Not implemented" })
    };
};
exports.handler = handler;
