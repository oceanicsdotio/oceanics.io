"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import Markdown from "react-markdown";
import style from "@catalog/page.module.css";
import Link from "next/link";
import specification from "@app/../specification.json";
/**
 * Active web worker messages.
 * Worker itself knows more message types.
 */
const MESSAGES = {
  getIndex: "getIndex",
  error: "error",
};

function InputMetadata({
  name,
  description,
  required = false,
  children
}: {
  name: string;
  description: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <label className={style.label} htmlFor={name}>
        <code>{name}</code>
        <span>{required ? " (required)" : ""}</span>
      </label>
      {children}
      <Markdown>{description}</Markdown>
    </>
  );
}

export function NumberInput({
  name,
  description,
  required = false,
  inputRef,
  ...rest
}: {
  name: string;
  // Passthrough, naming matters
  inputRef: MutableRefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <InputMetadata
      name={name}
      description={description}
      required={required}
    >
      <input
        className={style.input}
        id={name}
        type={"number"}
        name={name}
        required={required}
        ref={inputRef}
        {...rest}
      />
    </InputMetadata>
  );
}

export function TextInput({
  name,
  inputRef,
  description,
  required = false,
  defaultValue,
  readOnly=false
}: {
  name: string;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <InputMetadata
      name={name}
      description={description}
      required={required}
    >
      <input
        className={style.input}
        id={name}
        type={"text"}
        name={name}
        placeholder="..."
        ref={inputRef}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
      />
    </InputMetadata>
  );
}

export function TextSelectInput({
  name,
  inputRef,
  description,
  defaultValue,
  options
}: {
  name: string;
  inputRef: MutableRefObject<HTMLSelectElement | null>;
  description: string;
  defaultValue?: string;
  options: string[];
}) {
  return (
    <InputMetadata
      name={name}
      description={description}
    >
      <select
        className={style.input}
        id={name}
        name={name}
        ref={inputRef}
        defaultValue={defaultValue}
      >
        {options.map((value: string) => {
          return (
            <option key={value} value={value}>
              {value}
            </option>
          );
        })}
      </select>
    </InputMetadata>
  );
}

/**
 * Data passed back from worker to render collection link
 */
interface ICollection {
  name: string;
  href: string;
  url: string;
  content: string;
  "@iot.count": number;
}
/**
 * Link item for listing available collections. We don't care about order,
 * because we have no way of knowing which collections have nodes until
 * we make further queries.
 */
function Collection({ name, href, content, "@iot.count": count }: ICollection) {
  /**
   * Specification for one entity model. Could instead be passed
   * through the API, since it already knows the specification.
   */
  const { description }: any = (specification.components.schemas as any)[name];
  return (
    <div key={href}>
      <hr />
      <p>
        <Link href={href} prefetch={false}>
          {content}
        </Link>
        <span>{` ✓ N=${count}`}</span>
      </p>
      <Markdown>{description}</Markdown>
    </div>
  );
}
/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Index({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker | null>(null);
  /**
   * Index data loaded from the API.
   */
  const [index, setIndex] = useState<ICollection[]>([]);
  /**
   * Display message, workaround Suspense Data Fetching debacle.
   */
  const [message, setMessage] = useState("↻ Searching");
  /**
   * Process messages from Web Worker. Warn on unprocessed.
   */
  const workerMessageHandler = useCallback(({ data: { type, data } }: any) => {
    switch (type) {
      case MESSAGES.getIndex:
        setIndex(data);
        setMessage(`✓ Found ${data.length} indexed collections`);
        return;
      case MESSAGES.error:
        console.error("worker", type, data);
        setMessage(`! Something went wrong`);
        return;
      default:
        console.warn("client", type, data);
        return;
    }
  }, []);
  /**
   * Load Web Worker on component mount. I think the path needs to be
   * hard-coded here for webpack/bundlers to be able to include it.
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined" && user_data) {
      worker.current.postMessage({
        type: MESSAGES.getIndex,
        data: { user: user_data },
      });
    } else {
      setMessage("! You aren't logged in");
    }
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler]);
  /**
   * Client Component.
   */
  return (
    <div>
      <p>{message}</p>
      {index.map((each, index) => (
        <Collection key={`collection-${index}`} {...each} />
      ))}
    </div>
  );
}
