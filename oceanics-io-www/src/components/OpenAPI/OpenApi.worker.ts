import SwaggerParser from "@apidevtools/swagger-parser";
import type {FieldType} from "../Form/Form";
import type {Property, Method, Methods, Paths, Operation, Properties} from "./useOpenApi";
const ctx: Worker = self as unknown as Worker;

// Human readable name for body props and parameters
const nameToId = (name: string): string => 
    name.split(/([A-Z][a-z]+)/)
        .filter((word: string) => word)
        .map((word: string) => word.toLowerCase())
        .join(" ")

// HTMLInputElement type
type InputTypes = "text" | "number" | "email" | "password";
const convertType = (name: string, {type}: Property): InputTypes | null => {
    if (name === "password") {
        return "password"
    } else if (name === "email") {
        return "email"
    }
    if (type === "string") {
        return "text"
    } else if (type === "integer") {
        return "number"
    } else {
        console.warn(`Skipping unsupported type:`, type);
        return null
    }
};

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 * 
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces. 
 */
const propertyToInput = (
    [name, property]: [string, Property]
): FieldType | null  => {
    const id = nameToId(name);
    const type = convertType(name, property);
    if (type) return { ...property, id, type, }
    console.warn(`Skipping unknown format (${id}):`, property);
    return null
}

// Transform from an OpenApi path into an Operation
const methodToOperation = (
    path: string,
    method: string,
    {
        requestBody,
        parameters=[],
        ...props
    }: Method
): Operation => {
    let body: FieldType[] = [];
    if (typeof requestBody !== "undefined") {
        const {schema} = requestBody.content["application/json"];
        const properties = (typeof schema.oneOf === "undefined") ? schema.properties : schema.oneOf[0];

        const _body: [string, Property][] = Object.entries(properties as Properties).flatMap(([name, property]: [string, Property]) => {
            let value = property;
            while (typeof value.items !== "undefined") value = value.items;
            if (typeof value.properties !== "undefined") {
                return Object.entries(value.properties);
            } else {
                return [[name, value]]
            }
        })
        body = _body.map(propertyToInput).filter(param => param) as FieldType[];
    }
    const _parameters: FieldType[] = parameters.map(
        ({ name, schema }) => propertyToInput([name, schema])
    ).filter(param => param) as FieldType[];

    return {
        path,
        method,
        requestBody: body,
        parameters: _parameters,
        ...props
    }
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
    const operations = Object.entries(paths as Paths).flatMap(([path, methods]) => 
        Object.entries(methods as Methods).map(([method, operation]) => 
            methodToOperation(path, method, operation)));
    return {
        info,
        operations
    }
}

// Listener function
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
