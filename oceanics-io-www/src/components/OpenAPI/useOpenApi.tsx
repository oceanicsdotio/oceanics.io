import { useEffect, useState } from "react";
import useWorker from "../../hooks/useWorker";
import type { FieldType } from "../Form/Form";

// Metadata we intend to use. There may be others.
interface Info {
    title: string
    version: string
    description: string
}
// Properties as specified in OpenAPI request bodies
export interface Property {
    readOnly?: boolean
    items?: Property
    properties?: object
    type: string
    description: string
    enum?: string[]
}
// Collection of named properties
export interface Properties { 
    [index: string]: Property
}
// Parameters as specified in OpenAPI paths
export interface Parameter {
    name: string
    schema: Property
}
// Path as specified in OpenAPI specification
export interface Method {
    tags: string[]
    summary: string
    description: string
    parameters?: Parameter[]
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
export interface Methods {
    [index: string]: Method
}
export interface Paths {
    [index: string]: Methods
}
// Specification
export interface Specification {
    info: Info
    paths: Method[]
}

// Operation as specified after transformation in worker
export interface Operation {
    path: string
    method: string
    tags: string[]
    summary: string
    description: string
    parameters?: FieldType[]
    requestBody?: FieldType[]
}
// Specification
interface OpenApi {
    info: Info
    operations: Operation[]
}


// Defined in global scope to force Webpack to bundle the script.
const createWorker = () =>
  new Worker(new URL("./OpenApi.worker.ts", import.meta.url), {
    type: "module",
  });

const useOpenApi = ({ src }: { src: string}) => {
  // Web worker makes requests in background
  const worker = useWorker(createWorker);

  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const [api, setApi] = useState<OpenApi>({
    info: {
        title: `Loading ${src}...`,
        description: `Loading methods...`,
        version: ""
    },
    operations: []
  });

  // Start listening to worker messages
  useEffect(() => {
    return worker.listen(({ data }) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "load":
          setApi(data.data as OpenApi);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        default:
          return;
      }
    });
  }, []);

  /**
   * Hook loads and parses an OpenAPI spec from a URL using a
   * background worker.
   *
   * It runs once when the component loads. This allows
   * the specification to be available before derived data
   * is calculated for UI.
   */
  useEffect(() => {
    worker.post({
      type: "load",
      data: { src },
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    console.log(api.operations);
  }, [api]);

  return {
    api,
    worker
  };
};

export default useOpenApi;
