import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";

/** 
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
const parseYamlText = text => 
    YAML.parse(text)
        .split("\n")
        .filter(paragraph => paragraph)


/**
 * Load and validate the OpenAPI specification. 
 * 
 * @param {*} specUrl 
 */
export const load = async (specUrl) => {
    try {
        let api = await SwaggerParser.validate(specUrl);
        
        api.info.description = parseYamlText(api.info.description);
        
        return api;
    } 
    catch(err) {
        return err;
    }
}


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
}) => {
    let type;
    let options = null;
    if (schema !== undefined){
        type = schema.type;
        if ("enum" in schema) {
            type = "select";
            options = schema.enum;
        } else if (type === "string") {
            type = "text";
        } else if (type === "integer") {
            type = "number";
        } 
    }

    return Object({
        id: name
            .split(/([A-Z][a-z]+)/)
            .filter(word => word)
            .map(word => word.toLowerCase())
            .join(" "), 
        type,
        options,
        ...props
    });
};

/**
 * Take the request body content and convert it to data
 * forms
 */
const parseContent = (content) => 
    Object.entries(
        content["application/json"].schema.properties
    ).flatMap(([k, v]) => {
        let value = v;
        while ("items" in value) {
            value = value.items;
        }
        if ("properties" in value) {
            return Object.entries(value.properties);
        } else {
            return [[k, value]];
        }
    }).map(
        ([k, v])=>Object({name: k, ...v})
    ).filter(({readOnly=null})=>!readOnly);


/**
 * Builds the form structure for the hook
 * from the paths in the specification.
 */
 const buildView = ({parameters, requestBody}) => {
    return {
        query: (parameters || []).map(schemaToInput),
        body: requestBody ? parseContent(requestBody.content) : null
    }
}

/**
 * Flatten the route and method pairs to be filtered
 * and converted to UI features
 */
export const flattenSpecOperations = async (paths) =>
    Object.entries(paths).flatMap(([path, schema]) => 
        Object.entries(schema).map(([method, schema]) => 
            Object({
                path, 
                method, 
                schema: {
                    ...schema,
                    description: parseYamlText(schema.description)
                }, 
                view: buildView(schema)
            })));

export const scrapeIndexPage = async (url) => 
    fetch(url).then(response => response.json());

