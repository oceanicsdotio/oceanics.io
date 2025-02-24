"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useReducer,
  type RefObject,
  useRef,
} from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import style from "@catalog/page.module.css";
import layout from "@app/layout.module.css";
import specification from "@app/../specification.yaml";
import { Initial, ACTIONS, messageQueueReducer, MessageQueue } from "@catalog/client";
export function fromKey(collection: string) {
  return collection
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
}
const parameters = specification.components.parameters;
export type FormArgs<T> = {
  action: string;
  initial: Initial<T>;
  onSubmit: Function;
  formRef: RefObject<HTMLFormElement | null>;
  disabled: boolean;
};
export type IMutate<T> = {
  title: string;
  Form: React.FunctionComponent<FormArgs<T>>;
};
export type NodeLike = { uuid: string; name?: string };
/**
 * Wraps collection retrieval and paging. Need to provide
 * a concrete type annotation, but at least expects uuid
 * and an optional name in the result data.
 *
 * Expects offset and limit to be in the query for paging,
 * but will revert to the defaults described in OpenAPI
 * spec.
 *
 * First one in array is shown with its summary details
 * open.
 */
export function Collection<T extends NodeLike>({
  title,
  nav = false,
  AdditionalProperties = null,
}: {
  title: string;
  nav?: boolean;
  AdditionalProperties?: React.FunctionComponent | null;
}) {
  const schema = (specification.components.schemas as any)[title];
  const options = Object.keys(schema.properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
  const query = useSearchParams();
  /**
   * Status message to understand what is going on in the background.
   */
  const [messages, appendToQueue] = useReducer(messageQueueReducer, []);
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<T[]>([]);
  const [page, setPage] = useState<{
    next?: string;
    previous?: string;
    current: number;
  }>({
    current: 1,
  });
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getCollection:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          setPage(data.page);
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
          appendToQueue(data.message);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    []
  );
  /**
   * Ref to Web Worker.
   */
  const ref = useRef<Worker>(null);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    const user = localStorage.getItem("gotrue.user");
    if (typeof user === "undefined" || !user) {
      const err = "! You are not logged in";
      console.error(err);
      return;
    }
    if (!ref.current) {
      ref.current = new Worker(
        new URL("@catalog/[collection]/worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
    }
    ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
    const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
    ref.current.postMessage({
      type: ACTIONS.getCollection,
      data: {
        user,
        query: {
          left: title,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
    // Durable ref, current may change before cleanup
    const handle = ref.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler]);

  return (
    <>
      <MessageQueue messages={messages} />
      <>
        {collection.map(({ uuid, name, ...rest }, index) => {
          return (
            <details key={uuid} name="exclusive" open={index === 0}>
              <summary>
                <Link href={`edit?uuid=${uuid}`} prefetch={false}>
                  {name ?? uuid}
                </Link>
                {nav && (
                  <>
                    {" [ "}
                    <Link href={`view?uuid=${uuid}`} prefetch={false}>
                      view
                    </Link>
                    {" ]"}
                  </>
                )}
              </summary>
              <ul>
                <li>Related</li>
                <ul>{options.map((each) => {
                  return (
                    <li>
                      <Link
                        href={`${fromKey(each)}?uuid=${uuid}`}
                        prefetch={false}
                      >
                        {each}
                      </Link>
                    </li>
                  );
                })}</ul>
                <li>Attributes</li>
                <ul>
                {AdditionalProperties && (
                  <AdditionalProperties {...(rest as any)} />
                )}
                </ul>
              </ul>
            </details>
          );
        })}
        <p>
          <a style={{ color: "lightblue" }} href={page.previous}>
            {"Back"}
          </a>
          <span>{` | Page ${page.current} | `}</span>
          <a style={{ color: "lightblue" }} href={page.next}>
            {"Next"}
          </a>
        </p>
      </>
    </>
  );
}

function InputMetadata({
  name,
  description,
  required = false,
  children,
}: {
  name: string;
  description: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <label htmlFor={name}>
        <details open={false}>
          <summary>
            <code>{name}</code>
            {required && <span>{" (required)"}</span>}
          </summary>
          <Markdown>{description}</Markdown>
        </details>
      </label>
      {children}
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
  inputRef?: RefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
}) {
  return (
    <InputMetadata name={name} description={description} required={required}>
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
  readOnly = false,
  ...rest
}: {
  name: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  pattern?: string;
  minlength?: number;
  maxlength?: number;
}) {
  return (
    <InputMetadata name={name} description={description} required={required}>
      <input
        className={style.input}
        id={name}
        type={"text"}
        name={name}
        placeholder={"..."}
        ref={inputRef}
        required={required}
        readOnly={readOnly}
        {...rest}
      />
    </InputMetadata>
  );
}

export function TextSelectInput({
  name,
  inputRef,
  description,
  defaultValue,
  options,
}: {
  name: string;
  inputRef: RefObject<HTMLSelectElement | null>;
  description: string;
  defaultValue?: string;
  options: string[];
}) {
  return (
    <InputMetadata name={name} description={description}>
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

export function FormContainer({
  action,
  children,
  onSubmit,
  formRef,
  disabled,
}: {
  children: React.ReactNode;
  disabled: boolean;
  action: string;
  onSubmit: any;
  formRef: any;
}) {
  return (
    <form className={style.form} onSubmit={onSubmit} ref={formRef}>
      {children}
      <button className={layout.submit} disabled={disabled}>
        {action}
      </button>
      <button className={layout.submit} type="reset" disabled={disabled}>
        Reset
      </button>
    </form>
  );
}
