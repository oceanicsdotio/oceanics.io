"use client";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import styles from "../catalog.module.css"

/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "Things";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const MESSAGES = {
  collection: "collection",
  error: "error"
}
/**
 * A Collection abstracts access to a data source.
 */
function Collection({
  id,
  url,
  maxzoom = 21,
  minzoom = 1,
  zoomLevel,
}: {
  id: string;
  /**
   * Source of the raw data
   */
  url: string;
  /**
   * The type of the data.
   */
  type: string;
  /**
   * How to render the data
   */
  component: string;
  /**
   * Does not appear when zoomed in further
   */
  maxzoom: number;
  /**
   * Not rendered when zoomed further out
   */
  minzoom: number;
  /**
   * Current zoom level passed in for rendering in cards
   * whether or not the channel is currently visible
   */
  zoomLevel: number;
  /**
   * The provider and legal owner of the data
   */
  attribution?: string;
  /**
   * URL that links to the provider
   */
  info: string;
}) {
  const inView = zoomLevel >= minzoom && zoomLevel <= maxzoom;
  return (
    <div>
      <h1>{id.replace(/-/g, " ")}</h1>
      <div className={"zoom"}>
        <div className={inView ? "visible" : ""}>
          {`zoom: ${minzoom}-${maxzoom}`}
        </div>
      </div>
      <a href={url}>{"download"}</a>
    </div>
  );
}
import Markdown from "react-markdown";
interface FieldType {
  name?: string;
  description?: string;
  id: string;
  key?: string;
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
// Properties as specified in OpenAPI request bodies
interface Property {
  readOnly?: boolean;
  items?: Property;
  properties?: object;
  type: string;
  description: string;
  enum?: string[];
}
// Collection of named properties
interface Properties {
  [index: string]: Property;
}
// Path as specified in OpenAPI specification
interface Method {
  tags: string[];
  summary: string;
  description: string;
  parameters?: {
    name: string;
    schema: Property;
  }[];
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

// HTMLInputElement type
type InputTypes = "text" | "number" | "email" | "password";
const convertType = (name: string, { type }: Property): InputTypes | null => {
  if (name === "password") {
    return "password";
  } else if (name === "email") {
    return "email";
  }
  if (type === "string") {
    return "text";
  } else if (type === "integer") {
    return "number";
  } else {
    console.warn(`Skipping unsupported type:`, type);
    return null;
  }
};

/**
 * Convert from OpenAPI schema standard to JSX Form component properties
 *
 * Split a camelCase string on capitalized words and rejoin them
 * as a lower case phrase separated by spaces.
 */
const propertyToInput = ([name, property]: [
  string,
  Property
]): FieldType | null => {
  const id = name
    .split(/([A-Z][a-z]+)/)
    .filter((word: string) => word)
    .map((word: string) => word.toLowerCase())
    .join(" ");
  const type = convertType(name, property);
  if (type) return { ...property, id, type };
  console.warn(`Skipping unknown format (${id}):`, property);
  return null;
};

function ApiOperation({
  path,
  method,
  operation: { requestBody, parameters, ...operation },
}: {
  path: string;
  method: string;
  operation: Method;
}) {
  let requestParams: FieldType[] = [];
  if (typeof requestBody !== "undefined") {
    const { schema } = requestBody.content["application/json"];
    let properties =
      typeof schema.oneOf === "undefined" ? schema.properties : schema.oneOf[0];
    const _body: [string, Property][] = Object.entries(
      properties as Properties
    ).flatMap(([name, property]: [string, Property]) => {
      let value = property;
      while (typeof value.items !== "undefined") value = value.items;
      if (typeof value.properties !== "undefined") {
        return Object.entries(value.properties);
      } else {
        return [[name, value]];
      }
    });
    requestParams = _body
      .map(propertyToInput)
      .filter((param) => param) as FieldType[];
    requestParams = requestParams.map((props) => {
      return { key: `request-body-${props.id}`, ...props };
    });
  }
  let queryParams: FieldType[] = (parameters ?? [])
    .map(({ name, schema }) => propertyToInput([name, schema]))
    .filter((param) => param) as FieldType[];
  queryParams = queryParams.map((props) => {
    return { key: `query-${props.id}`, ...props };
  });
  let formUniqueId = `${path}-${method}`;
  return (
    <form key={formUniqueId} id={formUniqueId} className={styles.form}>
      <h2>{operation.summary}</h2>
      <h3>path</h3>
      <code>{path}</code>
      <h3>method</h3>
      <code>{method.toUpperCase()}</code>
      <h3>description</h3>
      <Markdown>{operation.description}</Markdown>
      {[...requestParams, ...queryParams].map(
        ({ description, key, ...props }) => (
          <div key={key}>
            <label htmlFor={props.id}>{props.name}</label>
            <input {...props} />
            <div>{description}</div>
          </div>
        )
      )}
    </form>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Things({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [things, setThings] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("Loading...");
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("../worker.ts", import.meta.url), {
      type: "module",
    });
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.collection:
          setThings(data.data.value);
          setMessage(`We found ${data.data.value.length} matching nodes:`)
          return;
        case MESSAGES.error:
          console.error(data.type, data.data);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined") {
      worker.current.postMessage({
        type: MESSAGES.collection,
        data: {
          left,
          user: user_data
        },
      });
    } else {
      console.error("User is not logged in.");
    }
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {things.map((each: { uuid: string; name: string }) => {
        let href = `/catalog/things/${each.uuid}`;
        return (<p key={each.uuid}><Link href={href}>{each.name}</Link></p>)
      })}
    </div>
  );
}
