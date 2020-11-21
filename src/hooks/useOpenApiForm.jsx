import {useEffect, useState} from "react";
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
 * Hook builds the form structure for the component
 * from the paths in the specification.
 */
export default ({parameters, requestBody}) => {

    const [view, setView] = useState(null); // rendered data

    useEffect(()=>{
        setView({
            query: (parameters || []).map(schemaToInput),
            body: requestBody ? parseContent(requestBody.content) : null
        });
    },[]);

    return view;
}

    