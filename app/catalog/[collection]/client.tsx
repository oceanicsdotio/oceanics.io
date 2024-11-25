"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  type MutableRefObject
} from "react";
import Markdown from "react-markdown";
import style from "@catalog/page.module.css";
import Link from "next/link";
import specification from "@app/../specification.json";
const parameters = specification.components.parameters;
import { useSearchParams } from "next/navigation";
import { Initial, ACTIONS, useWorkerFixtures } from "@catalog/client"
export type FormArgs<T> = {
  action: string;
  initial: Initial<T>;
  onSubmit: Function;
  formRef: MutableRefObject<HTMLFormElement | null>;
  disabled: boolean;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function useClient<T extends NodeLike>() {
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<T[]>([]);
  const [linked, setLinked] = useState<any[]>([]);
  const [page, setPage] = useState<{
    next?: string;
    previous?: string;
    current: number;
  }>({
    current: 1,
  });
  const [index, setIndex] = useState<
    {
      description: string;
      href: string;
      url: string;
      content: string;
      "@iot.count": number;
    }[]
  >([]);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getIndex:
          setIndex(
            data.map((each: { name: string }) => {
              const { description } = (
                specification.components.schemas as {
                  [key: string]: { description?: string };
                }
              )[each.name];
              return {
                ...each,
                description,
              };
            })
          );
          return;
        case ACTIONS.getCollection:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          setPage(data.page);
          return;
        case ACTIONS.getLinked:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setLinked(data.value);
          return;
        case ACTIONS.getEntity:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          return;
        case ACTIONS.createEntity:
        case ACTIONS.updateEntity:
          window.location.reload();
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
          setMessage(data.message);
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
    const worker = useWorkerFixtures();
    /**
     * Load Web Worker on component mount
     */
    useEffect(() => {
      worker.ref.current = new Worker(
        new URL("@catalog/[collection]/worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
      worker.ref.current.addEventListener("message", workerMessageHandler, {
        passive: true,
      });
      const handle = worker.ref.current;
      worker.setDisabled(false);
      return () => {
        handle.removeEventListener("message", workerMessageHandler);
      };
    }, []);
  return {
    collection,
    index,
    message,
    worker,
    page,
    linked
  };
}

export type IMutate<T> = { title: string; Form: React.FunctionComponent<FormArgs<T>> };
export type NodeLike = {uuid: string, name?: string};

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
  AdditionalProperties=null,
}: {
  title: string;
  nav?: boolean;
  AdditionalProperties?: React.FunctionComponent|null;
}) {
  const query = useSearchParams();
  const { message, collection, worker, page } = useClient<T>();
  useEffect(() => {
    if (worker.disabled) return;
    const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
    const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
    worker.post({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: title,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  }, [worker.disabled]);
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, name, ...rest }, index) => (
        <details key={uuid} name="exclusive" open={index===0}>
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
          {AdditionalProperties && <div className={style.add_props} ><AdditionalProperties {...(rest as any)} /></div>}
        </details>
      ))}
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
  inputRef: MutableRefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
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
  inputRef: MutableRefObject<HTMLInputElement | null>;
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
  inputRef: MutableRefObject<HTMLSelectElement | null>;
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