
import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";
import Ajv from "ajv";




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

type Property = {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
}
type PropertiesEntry = [string, Property];
type Properties = { [index: string]: Property }
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
type ApiOperation = {
  path: string;
  method: string;
  schema: Schema;
  view: {
    query: Input[];
    body: any;
  }
}

type SpecNode = { [index: string]: Schema }
type UnpackedPair = [string, Schema]


/** 
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
 const parseYamlText = (text: string) =>
 YAML.parse(text)
   .split("\n")
   .filter((paragraph: string) => paragraph)

export class Specification {
  url: string;
  api: any;
  ajv: Ajv;

  constructor(url: string) {
    this.url = url;
    this.ajv = new Ajv();
  }
  /**
   * Load and validate the OpenAPI specification. 
   */
  async load() {
    try {
      let api = await SwaggerParser.validate(this.url);
      api.info.description = parseYamlText(api.info.description ?? "")      
      this.api = api;
    }
    catch (err) {
      return err;
    }
  }

  validate(schema: object, data: object) {
    const valid = this.ajv.validate(schema, data);
    return {
      valid,
      errors: this.ajv.errors
    }
  }



  /**
   * Convert from OpenAPI schema standard to JSX Form component properties
   * 
   * Split a camelCase string on capitalized words and rejoin them
   * as a lower case phrase separated by spaces. 
   */
  static schemaToInput({
    name,
    schema,
    ...props
  }: Schema): Input {
    let type;
    let options = null;
    if (typeof schema !== "undefined") {
      type = schema.type;
      if (schema.enum ?? false) {
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

  /**
   * Flatten the route and method pairs to be filtered
   * and converted to UI features
   */
  async operations(paths: SpecNode): Promise<ApiOperation[]> {
  return Object.entries(paths).flatMap(([path, schema]: UnpackedPair) =>
    Object.entries(schema).map(([method, schema]: any) =>
      Object({
        path,
        method,
        schema: {
          ...schema,
          description: parseYamlText(schema.description)
        },
        view: Specification.buildView(schema)
      })));
    }

    /**
 * Builds the form structure for the hook
 * from the paths in the specification.
 */
static buildView = ({ parameters, requestBody }: IBuildView) => {

  const filterReadOnly = ({ readOnly = null }) => !readOnly;
  const formatPaths = ([k, v]: PropertiesEntry) => {
    let value = v;
    while (typeof value.items !== "undefined") value = value.items;
    if (typeof value.properties !== "undefined") {
      return Object.entries(value.properties).map(([k, v]) => Object({ name: k, ...v }));
    } else {
      return { name: k, ...value }
    }
  }

  let body = null;
  if (requestBody) {
    const props = requestBody.content["application/json"].schema.properties;
    body = Object.entries(props).flatMap(formatPaths).filter(filterReadOnly);
  }

  return {
    query: (parameters || []).map(Specification.schemaToInput),
    body
  }
}
}







