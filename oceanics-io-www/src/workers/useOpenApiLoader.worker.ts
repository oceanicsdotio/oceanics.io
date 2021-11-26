import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";
const ctx: Worker = self as unknown as Worker;


/** 
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
const parseYamlText = (text: string) => 
    YAML.parse(text)
        .split("\n")
        .filter((paragraph: string) => paragraph)


/**
 * Load and validate the OpenAPI specification. 
 */
const load = async (specUrl: string) => {
    try {
        let api = await SwaggerParser.validate(specUrl);
        api.info.description = parseYamlText(api.info.description??"");
        return api;
    } 
    catch(err) {
        return err;
    }
}

type Schema = {
    name: string;
    schema: {
        enum?: string[];
        type: string;
        description: string;
    }
}
type Input = {
    id: string;
    type: string;
    options: string[];
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
}: Schema): Input => {
    let type;
    let options = null;
    if (typeof schema !== "undefined"){
        type = schema.type;
        if (schema.enum??false) {
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
            .filter((word: string) => word)
            .map((word: string) => word.toLowerCase())
            .join(" "), 
        type,
        options,
        ...props
    });
};

type Property = {
    readOnly?: boolean;
    items?: Property;
    properties?: object;
}
type PropertiesEntry = [string, Property];
type Properties = {[index:string]: Property}
type Content = {
    ["application/json"]: {
        schema: {
            properties: Properties;
        }
    }
}


type IBuildView = {
    parameters: any;
    requestBody: {
        content: Content;
    }
}

/**
 * Builds the form structure for the hook
 * from the paths in the specification.
 */
 const buildView = ({parameters, requestBody}: IBuildView) => {

 const body = requestBody ? Object.entries(
    requestBody.content["application/json"].schema.properties
 ).flatMap(([k, v]: PropertiesEntry) => {
     let value = v;
     while (typeof value.items !== "undefined") value = value.items;
     if (typeof value.properties !== "undefined") {
        return Object.entries(value.properties).map(([k, v])=>Object({name: k, ...v}));
     } else {
        return {name: k, ...value}
     }
 }).filter(({readOnly=null})=>!readOnly) : null

    return {
        query: (parameters || []).map(schemaToInput),
        body
    }
}

type ApiOperation = {
    path: string;
    method: string;
    schema: Schema;
    view: {
        query: Input[];
        body: any;
    }
}

type PathsInput = {[index: string] : Schema}

/**
 * Flatten the route and method pairs to be filtered
 * and converted to UI features
 */
// const flattenSpecOperations = async (paths: PathsInput): Promise<ApiOperation[]> =>
//     Object.entries(paths).flatMap(([path, schema]) => 
//         Object.entries(schema).map(([method, schema]) => 
//             Object({
//                 path, 
//                 method, 
//                 schema: {
//                     ...schema,
//                     description: parseYamlText(schema.description)
//                 }, 
//                 view: buildView(schema)
//             })));

const scrapeIndexPage = async (url: string) => 
    fetch(url).then(response => response.json());

  
ctx.addEventListener("message", ({data}) => {
    switch (data.type) {
        case "status":
            ctx.postMessage({
                type: "status",
                data: "ready"
            });
            return;
    }
})