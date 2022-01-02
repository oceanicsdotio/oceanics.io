"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Specification = void 0;
const swagger_parser_1 = __importDefault(require("@apidevtools/swagger-parser"));
const yaml_1 = __importDefault(require("yaml"));
const ajv_1 = __importDefault(require("ajv"));
/**
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
const parseYamlText = (text) => yaml_1.default.parse(text)
    .split("\n")
    .filter((paragraph) => paragraph);
class Specification {
    constructor(url) {
        this.url = url;
        this.ajv = new ajv_1.default();
    }
    /**
     * Load and validate the OpenAPI specification.
     */
    async load() {
        var _a;
        try {
            let api = await swagger_parser_1.default.validate(this.url);
            api.info.description = parseYamlText((_a = api.info.description) !== null && _a !== void 0 ? _a : "");
            this.api = api;
        }
        catch (err) {
            return err;
        }
    }
    validate(schema, data) {
        const valid = this.ajv.validate(schema, data);
        return {
            valid,
            errors: this.ajv.errors
        };
    }
    /**
     * Convert from OpenAPI schema standard to JSX Form component properties
     *
     * Split a camelCase string on capitalized words and rejoin them
     * as a lower case phrase separated by spaces.
     */
    static schemaToInput({ name, schema, ...props }) {
        var _a;
        let type;
        let options = null;
        if (typeof schema !== "undefined") {
            type = schema.type;
            if ((_a = schema.enum) !== null && _a !== void 0 ? _a : false) {
                type = "select";
                options = schema.enum;
            }
            else if (type === "string") {
                type = "text";
            }
            else if (type === "integer") {
                type = "number";
            }
        }
        return Object({
            id: name
                .split(/([A-Z][a-z]+)/)
                .filter((word) => word)
                .map((word) => word.toLowerCase())
                .join(" "),
            type,
            options,
            ...props
        });
    }
    ;
    /**
     * Flatten the route and method pairs to be filtered
     * and converted to UI features
     */
    async operations(paths) {
        return Object.entries(paths).flatMap(([path, schema]) => Object.entries(schema).map(([method, schema]) => Object({
            path,
            method,
            schema: {
                ...schema,
                description: parseYamlText(schema.description)
            },
            view: Specification.buildView(schema)
        })));
    }
}
exports.Specification = Specification;
/**
* Builds the form structure for the hook
* from the paths in the specification.
*/
Specification.buildView = ({ parameters, requestBody }) => {
    const filterReadOnly = ({ readOnly = null }) => !readOnly;
    const formatPaths = ([k, v]) => {
        let value = v;
        while (typeof value.items !== "undefined")
            value = value.items;
        if (typeof value.properties !== "undefined") {
            return Object.entries(value.properties).map(([k, v]) => Object({ name: k, ...v }));
        }
        else {
            return { name: k, ...value };
        }
    };
    let body = null;
    if (requestBody) {
        const props = requestBody.content["application/json"].schema.properties;
        body = Object.entries(props).flatMap(formatPaths).filter(filterReadOnly);
    }
    return {
        query: (parameters || []).map(Specification.schemaToInput),
        body
    };
};
