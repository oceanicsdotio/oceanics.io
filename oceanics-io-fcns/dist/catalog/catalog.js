"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("../../shared/shared");
const cypher_1 = require("../../shared/cypher");
const handler = async ({}) => {
    const cypher = cypher_1.GraphNode.allLabels();
    const { records } = await (0, shared_1.connect)(cypher.query);
    //@ts-ignore
    const fields = records.flatMap(({ _fields: [label] }) => label);
    const result = [...new Set(fields)].map((label) => Object({
        name: label,
        url: `/api/${label}`
    }));
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
};
exports.handler = handler;
