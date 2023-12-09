import SwaggerParser from "@apidevtools/swagger-parser";
import type {SelectType, FieldType} from "../Form/Form";
const ctx: Worker = self as unknown as Worker;

interface Property {
    readOnly?: boolean
    items?: Property
    properties?: object
    type: string
    description: string
    enum?: string[]
}
interface NamedProperty extends Property {
    name: string
    id: string
}
type Properties = { 
    [index: string]: Property
}
type Parameter = {
    name: string
    schema: Property
}
type Operation = {
    parameters?: Parameter[];
    requestBody?: {
        content: {
            ["application/json"]: {
                schema: {
                    properties?: Properties
                    oneOf?: Properties[]
                }
            }
        };
    }
}

const nameToId = (name: string) => 
    name.split(/([A-Z][a-z]+)/)
        .filter((word: string) => word)
        .map((word: string) => word.toLowerCase())
        .join(" ")

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 * 
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces. 
 */
const schemaToInput = ({
    name,
    schema,
    ...props
}: Parameter): SelectType | FieldType => {
    const id = nameToId(name);
    if (typeof schema.enum !== "undefined") {
        return { id, options: schema.enum, ...props }
    } else if (schema.type === "string") {
        return { id, type: "text", ...props }
    } else if (schema.type === "integer") {
        return { id, type: "number", ...props }
    } else {
        throw Error(`${id}, ${schema.type}`)
    }
};

// descend through array to try and find properties
const formatPaths = ([k, v]: [string, Property]): NamedProperty[] => {
    let value = v;
    while (typeof value.items !== "undefined") value = value.items;
    if (typeof value.properties !== "undefined") {
        return Object.entries(value.properties).map(([k, v]) => Object({ name: k, id: nameToId(k), ...v }));
    } else {
        return [{ name: k, id: nameToId(k), ...value }]
    }
}

const parse = ({
    path, 
    method, 
    operation: {
        requestBody,
        parameters=[],
        ...schema
    }
}: {
    path: string
    method: string
    operation: Operation
}) => {
    let body: SelectType|FieldType[] = [];
    if (typeof requestBody !== "undefined") {
        const _schema = requestBody.content["application/json"].schema;
        const properties = (typeof _schema.oneOf === "undefined") ? 
            _schema.properties : _schema.oneOf[0];
        body = Object.entries(properties as Properties)
            .flatMap(formatPaths)
            .filter(({ readOnly = null }) => !readOnly)
    }
    return Object({
        path,
        method,
        body,
        parameters: parameters.map(schemaToInput),
        schema
    })
}

/**
 * Builds the form structure from the paths in the specification.
 * 
 * Need to:
 * - Remove read only properties
 * - Flatten the route and method pairs to be filtered and converted to UI features
 */
const load = async (src: string) => {
    const {info, paths} = await SwaggerParser.dereference(src);
    const entries = Object.entries(paths as object)
    const pathMethods = entries.flatMap(
        ([path, methods]: [string, object]) => 
            Object.entries(methods).map(([method, operation]) => 
                parse({path, method, operation})
            ));
    return {
        info, 
        paths: pathMethods
    }
}

/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
    switch (data.type) {
        case "status":
            ctx.postMessage({
                type: "status",
                data: "ready",
            });
            return;
        case "load":
            ctx.postMessage({
                type: "load",
                data: await load(data.data.src),
            });
            return;
        default:
            ctx.postMessage({
                type: "error",
                message: "unknown message format",
                data
            });
            return;
    }
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", handleMessage)

// Trick into being a module and for testing
export { handleMessage }
