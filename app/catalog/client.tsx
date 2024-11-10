"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type FormEventHandler
} from "react";
import Markdown from "react-markdown";
import style from "@catalog/page.module.css";
import Link from "next/link";
import specification from "@app/../specification.json";
const parameters = specification.components.parameters;
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { v7 as uuid7 } from "uuid";
export type Initial<T> = Omit<T, "free">;
export type FormArgs<T> = {
  action: string;
  initial: Initial<T>;
  onSubmit: Function;
  formRef: MutableRefObject<HTMLFormElement | null>;
  disabled: boolean;
};
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
  deleteEntity: "deleteEntity",
  createEntity: "createEntity",
  updateEntity: "updateEntity",
  getEntity: "getEntity",
  getIndex: "getIndex",
  getLinked: "getLinked",
  error: "error",
  status: "status",
  redirect: "redirect",
};
function useWorker(messageHandler: any) {
  /**
   * Ref to Web Worker.
   */
  const ref = useRef<Worker>();
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    ref.current = new Worker(new URL("@catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    ref.current.addEventListener("message", messageHandler, {
      passive: true,
    });
    const handle = ref.current;
    setDisabled(false);
    return () => {
      handle.removeEventListener("message", messageHandler);
    };
  }, []);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const post = useCallback((message: { type: string; data: any }) => {
    if (!ref.current) {
      console.error("! Worker isn't ready");
      return;
    }
    const user = localStorage.getItem("gotrue.user");
    if (typeof user === "undefined" || !user) {
      const err = "! You are not logged in";
      console.error(err);
      return;
    }
    ref.current.postMessage({ ...message, data: { ...message.data, user } });
  }, []);
  return {
    post,
    disabled,
    ref,
  };
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function useClient<T extends { uuid: string }>() {
  const { push } = useRouter();
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<T[]>([]);
  const [page, setPage] = useState<
    { next?: string; previous?: string; current: number }
  >({
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
          setPage(data.page)
          return;
        case ACTIONS.getLinked:
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
  const worker = useWorker(workerMessageHandler);
  return {
    collection,
    index,
    message,
    worker,
    page
  };
}

// export function useLinked() {
//   const {} = useClient({});
//   const onGetLinked: FormEventHandler = (event) => {
//     event.preventDefault();
//     worker.post({
//       type: ACTIONS.getLinked,
//       data: {
//         query: {
//           left: query.left,
//           uuid: query.uuid,
//           right: query.right,
//         },
//       },
//     });
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };
// }

export function useCreate<T extends { uuid: string }>(title: string) {
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement | null>(null);

  const { message, worker } = useClient<T>();

  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      worker.post({
        type: ACTIONS.createEntity,
        data: {
          query: { left: title },
          body: JSON.stringify(callback()),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [initial, setInitial] = useState<{ uuid: string }>({
    uuid: uuid7(),
  });
  return {
    form: {
      formRef,
      initial,
      disabled: worker.disabled,
      onSubmit: onSubmit,
    },
    setInitial,
    message,
  };
}
export interface NodeForm {
  disabled: boolean;
  formRef: MutableRefObject<HTMLFormElement>;
  onSubmit: () => {};
  initial: { uuid: string };
}

export function useUpdate<T extends { uuid: string }>(title: string) {
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  const { message, worker, collection } = useClient<T>();
  /**
   * Delete a resource
   */
  const onDelete = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this node and its relationships?"
    );
    if (!confirmation) return;
    worker.post({
      type: ACTIONS.deleteEntity,
      data: {
        query: {
          left: title,
          left_uuid: uuid,
        },
      },
    });
  };

  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      const { uuid, ...data } = callback();
      worker.post({
        type: ACTIONS.updateEntity,
        data: {
          query: { left: title, left_uuid: uuid },
          body: JSON.stringify(data),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [initial, setInitial] = useState<T>({ uuid } as any);
  useEffect(() => {
    if (!worker.disabled) {
      worker.post({
        type: ACTIONS.getEntity,
        data: {
          query: {
            left: title,
            left_uuid: uuid,
          },
        },
      });
    }
  }, [worker.disabled]);
  useEffect(() => {
    if (!collection.length) return;
    const [node] = collection;
    setInitial(node);
  }, [collection]);
  return {
    message,
    form: {
      disabled: worker.disabled,
      formRef,
      onSubmit,
      initial,
    },
    onDelete,
  };
}
/**
 * Shared by collection index pages. Wraps the useCollection hook,
 * and fires a query once the worker is ready.
 *
 * Redirect to Create page if there are no existing nodes to view.
 */
export function useGetCollection<T extends { uuid: string }>(title: string) {
  const query = useSearchParams();
  const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
  const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
  const { message, collection, worker, page } = useClient<T>();
  useEffect(() => {
    if (worker.disabled) return;
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
  return {
    collection,
    message,
    page
  };
}

export function Paging(page: {
  previous?: string;
  next?: string;
  current: number;
}) {
  return (
    <p>
      <a style={{ color: "lightblue" }} href={page.previous}>
        {"Back"}
      </a>
      <span>{` | Page ${page.current} | `}</span>
      <a style={{ color: "lightblue" }} href={page.next}>
        {"Next"}
      </a>
    </p>
  );
}

export function ClientCollection<T extends { uuid: string }>({
  title,
  nav,
  AdditionalProperties,
}: {
  title: string;
  nav?: string;
  AdditionalProperties: React.FunctionComponent;
}) {
  /**
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
  const { message, collection, page } = useGetCollection<T>(title);
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, name, ...rest }: any) => {
        return (
          <NamedNode key={uuid} uuid={uuid} nav={nav} name={name}>
            <AdditionalProperties {...rest} />
          </NamedNode>
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
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function NamedNode({
  name,
  children,
  uuid,
  nav = null,
}: {
  name?: string;
  children?: ReactNode;
  uuid: string;
  nav?: string | null;
}) {
  const url = `edit?uuid=${uuid}`;
  return (
    <details>
      <summary>
        <Link href={url} prefetch={false}>
          {name ?? uuid}
        </Link>
        {nav && (
          <>
            {" [ "}
            <Link href={`${nav}?uuid=${uuid}`} prefetch={false}>
              {nav}
            </Link>
            {" ]"}
          </>
        )}
      </summary>
      {children}
    </details>
  );
}
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
  const pathname = usePathname();
  const { push } = useRouter();
  /**
   * Form data is synced with user input
   */
  const neighborType = useRef<HTMLSelectElement | null>(null);
  return (
    <>
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
      {/* <div>
        {collection.map(({ uuid, ...rest }) => {
          const _right = (right??"").split(/\.?(?=[A-Z])/).join("_").toLowerCase();
          return (
            <p key={uuid}>
              <a href={`/catalog/${_right}/edit?uuid=${uuid}&right=${schema.title}`}>{rest.name ?? uuid}</a>
            </p>
          );
        })}
      </div> */}
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
        <details>
          <summary>
            <code>{name}</code>
            <span>{required ? " (required)" : ""}</span>
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
        placeholder="..."
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
/**
 * Link items for listing available collections.
 */
export default function ({}) {
  const { index, message, worker } = useClient();
  useEffect(() => {
    if (worker.disabled) return;
    worker.post({
      type: ACTIONS.getIndex,
      data: {},
    });
  }, [worker.disabled]);
  return (
    <>
      <p>{message}</p>
      {index.map(({ "@iot.count": count, content, href, description }) => (
        <details key={href}>
          <summary>
            <Link href={href} prefetch={false}>
              {content}
            </Link>
            <span>{` ✓ ${count}`}</span>
          </summary>
          <Markdown>{description}</Markdown>
        </details>
      ))}
    </>
  );
}
