import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  MutableRefObject,
} from "react";

export type Listener = (args: {
  data: { data: unknown; type: string; message?: string };
}) => void;

// In-memory log truncation
const LIMIT = 10;

// Actual handler
const onMessageHandler =
  (setValue: Dispatch<SetStateAction<string[]>>) =>
  ({ data }: { data: string }) => {
    setValue((prev: string[]) => [...prev.slice(0, LIMIT - 1), data]);
  };

interface InputType {
  name?: string;
  description?: string;
  id: string;
}
export interface FieldType extends InputType {
  type: "password" | "email" | "text" | "number" | "submit";
  disabled?: true;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  placeholder?: string;
  readonly?: boolean;
  required?: true;
  value?: any;
}

// Metadata we intend to use. There may be others.
interface Info {
  title: string;
  version: string;
  description: string;
}
// Properties as specified in OpenAPI request bodies
export interface Property {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
  type: string;
  description: string;
  enum?: string[];
}
// Collection of named properties
export interface Properties {
  [index: string]: Property;
}
// Parameters as specified in OpenAPI paths
interface Parameter {
  name: string;
  schema: Property;
}
// Path as specified in OpenAPI specification
export interface Method {
  tags: string[];
  summary: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: {
    content: {
      ["application/json"]: {
        schema: {
          properties?: Properties;
          oneOf?: Properties[];
        };
      };
    };
  };
}
export interface Methods {
  [index: string]: Method;
}


// Operation as specified after transformation in worker
export interface Operation {
  path: string;
  method: string;
  tags: string[];
  summary: string;
  description: string;
  parameters?: FieldType[];
  requestBody?: FieldType[];
}
// Specification
interface OpenApi {
  info: Info;
  operations: Operation[];
}

const useCatalog = ({ src, worker }: { src: string, worker: MutableRefObject<Worker|undefined> }) => {

  const [, setMessages] = useState<string[]>([]);

  // Start if we get a worker on load.
  useEffect(() => {
    if (typeof worker.current === "undefined") return
    let handle = worker.current;
    const listener = onMessageHandler(setMessages);
    handle.addEventListener("message", listener, { passive: true });
    handle.postMessage({ type: "status" });
    return () => {
      handle.removeEventListener("message", listener);
      handle.terminate();
    };
  }, [worker]);

  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const [api, setApi] = useState<OpenApi>({
    info: {
      title: `Loading ${src}...`,
      description: `Loading methods...`,
      version: "",
    },
    operations: [],
  });

  // Start listening to worker messages
  useEffect(() => {
    if (typeof worker.current === "undefined") return;
    let handle = worker.current
    let callback = ({ data }: any) => {
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
    }
    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
    }
  }, [worker]);

  /**
   * Hook loads and parses an OpenAPI spec from a URL using a
   * background worker.
   *
   * It runs once when the component loads. This allows
   * the specification to be available before derived data
   * is calculated for UI.
   */
  useEffect(() => {
    worker.current?.postMessage({
      type: "load",
      data: { src },
    });
  }, [worker, src]);

  return {
    api,
    worker,
  };
};

export default useCatalog;
