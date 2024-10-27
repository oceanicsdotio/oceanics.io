"use client";
import React, { useRef, useEffect, useState, useCallback, type MutableRefObject } from "react";
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

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getLinked: "getLinked",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Linking(schema: {
  properties: any;
  title: string;
  description: string;
}) {
  const options = Object.keys(schema.properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
  const query = useSearchParams();
  const right = query.get("right");
  const left_uuid = query.get("uuid");
  /**
   * Form data is synced with user input
   */
  const neighborType = useRef<HTMLSelectElement | null>(null);
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [collection, setCollection] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getLinked:
          setMessage(`✓ Found ${data.value.length}`);
          setCollection(data.value);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    []
  );
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (!right) return;
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user = localStorage.getItem("gotrue.user");
    if (typeof user !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getLinked,
        data: {
          query: {
            left_uuid,
            left: schema.title,
            right,
            limit: 10,
            offset: 0
          },
          user,
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

  const pathname = usePathname();
  const { push } = useRouter();

  useEffect(() => {
    console.log({ collection });
  }, [collection]);

  return (
    <>
      <hr />
      <form
        className={style.form}
        onSubmit={() => {
          if (!neighborType.current) return;
          const search = new URLSearchParams(query);
          search.set("right", neighborType.current.value);
          push(`${pathname}?${search.toString()}`);
        }}
      >
        <TextSelectInput
          name={"neighborType"}
          inputRef={neighborType}
          description={"The type of neighboring node to connect to"}
          options={options}
          defaultValue={query.get("right")?.toString()}
        />
        <button className={style.submit}>Load</button>
      </form>
      <p>{message}</p>
      <hr />
      <div>
        {collection.map(({ uuid, ...rest }) => {
          const _right = (right??"").split(/\.?(?=[A-Z])/).join("_").toLowerCase();
          return (
            <p key={uuid}>
              <a href={`/catalog/${_right}/edit?uuid=${uuid}&right=${schema.title}`}>{rest.name ?? uuid}</a>
            </p>
          );
        })}
      </div>
    </>
  );
}


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
