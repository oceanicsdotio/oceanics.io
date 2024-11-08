"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type FormEventHandler,
  Suspense
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
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function useCollection(
  query: {
    left?: string;
    limit: number;
    offset: number;
    right?: string;
    uuid?: string;
  },
  expectSome = false
) {
  const pathSegment = query.left
    ?.split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  const previous = query.offset
    ? `/catalog/${pathSegment}/?offset=${Math.max(
        query.offset - query.limit,
        0
      )}&limit=${query.limit}`
    : undefined;
  const { push } = useRouter();
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<any[]>([]);
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  const [next, setNext] = useState<string>();
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getIndex:
          setCollection(data);
          setMessage(`✓ Found ${data.length} indexed collections`);
          return;
        case ACTIONS.getCollection:
          const count = Math.min(data.value.length, query.limit);
          const moreExist = count && query.limit < data.value.length;
          window.scrollTo({ top: 0, behavior: "smooth" });
          let _message = `✓ Found ${count} nodes`;
          if (moreExist) {
            setMessage(_message);
            setCollection((data.value as any[]).slice(0, query.limit));
            const newOffset = query.limit + query.offset;
            setNext(
              `/catalog/${pathSegment}/?offset=${newOffset}&limit=${query.limit}`
            );
          } else if (count) {
            setMessage(_message);
            setCollection(data.value);
          } else if (expectSome) {
            setMessage(`${_message}, redirecting...`);
            setTimeout(() => {
              push(`/catalog/${pathSegment}/create/`);
            }, 500);
          } else {
            setMessage(_message);
          }
          return;
        case ACTIONS.getEntity:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          setMessage(`✓ Found 1 matching node`);
          return;
        case ACTIONS.deleteEntity:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setMessage(`✓ Deleted 1 node`);
          push(`/catalog/${pathSegment}/`);
          return;
        case ACTIONS.createEntity:
          if (data) {
            setMessage("✓ Created 1 node");
            window.location.reload();
          } else {
            setMessage("! Something Went Wrong");
          }
          return;
        case ACTIONS.updateEntity:
          if (data) {
            setMessage("✓ Updated 1 node");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setMessage("! Something Went Wrong");
          }
          return;
        case ACTIONS.getLinked:
          setMessage(`✓ Found ${data.value.length} linked nodes`);
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
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const handle = worker.current;
    setDisabled(false);
    setMessage("✓ Ready");
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const tryPostMessage = useCallback((message: { type: string; data: any }) => {
    if (!worker.current) {
      setMessage("! Worker isn't ready");
      return;
    }
    const user = localStorage.getItem("gotrue.user");
    if (typeof user === "undefined" || !user) {
      const err = "! You are not logged in";
      console.error(err);
      setMessage("! You are not logged in");
      return;
    }
    worker.current.postMessage({ ...message, data: { ...message.data, user } });
    setMessage("↻ Working");
  }, []);

  const onSubmitCreate =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      tryPostMessage({
        type: ACTIONS.createEntity,
        data: {
          query: { left: query.left },
          body: JSON.stringify(callback()),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const onSubmitUpdate =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      const { uuid, ...data } = callback();
      tryPostMessage({
        type: ACTIONS.updateEntity,
        data: {
          query: { left: query.left, left_uuid: uuid },
          body: JSON.stringify(data),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const onGetCollection = () => {
    tryPostMessage({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: query.left,
          limit: query.limit + 1,
          offset: query.offset,
        },
      },
    });
    return collection
  };

  const getCollection = () => {
    tryPostMessage({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: query.left,
          limit: query.limit + 1,
          offset: query.offset,
        },
      },
    });
    return collection
  };

  const onGetEntity = () => {
    tryPostMessage({
      type: ACTIONS.getEntity,
      data: {
        query: {
          left: query.left,
          left_uuid: query.uuid,
        },
      },
    });
  };

  const onGetLinked: FormEventHandler = (event) => {
    event.preventDefault();
    tryPostMessage({
      type: ACTIONS.getLinked,
      data: {
        query: {
          left: query.left,
          uuid: query.uuid,
          right: query.right,
        },
      },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onGetIndex = () => {
    tryPostMessage({
      type: ACTIONS.getIndex,
      data: {},
    });
  };

  const getIndex = () => {
    tryPostMessage({
      type: ACTIONS.getIndex,
      data: {},
    });
    return collection
  };
  /**
   * Delete a resource
   */
  const onDelete = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this node and its relationships?"
    );
    if (!confirmation) return;
    tryPostMessage({
      type: ACTIONS.deleteEntity,
      data: {
        query: {
          left: query.left,
          left_uuid: query.uuid,
        },
      },
    });
  };
  /**
   * Client Component
   */
  return {
    collection,
    message,
    worker,
    onDelete,
    disabled,
    onSubmitCreate,
    onSubmitUpdate,
    formRef,
    onGetIndex,
    onGetCollection,
    onGetEntity,
    onGetLinked,
    getCollection,
    getIndex
    page: {
      next,
      previous,
      current: Math.ceil(query.offset / query.limit) + 1,
    },
  };
}

export function useCreate(title: string) {
  const { message, disabled, onSubmitCreate, formRef } = useCollection({
    left: title,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
  });
  const [initial, setInitial] = useState<{ uuid: string }>({
    uuid: uuid7(),
  });
  return {
    form: {
      formRef,
      initial,
      disabled,
      onSubmit: onSubmitCreate,
    },
    setInitial,
    message,
  };
}

export function useUpdate(title: string) {
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  const {
    message,
    disabled,
    collection,
    onGetEntity,
    formRef,
    onSubmitUpdate,
    onDelete,
  } = useCollection({
    left: title,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
    uuid,
  });
  const [initial, setInitial] = useState<{ uuid: string }>({ uuid });
  useEffect(() => {
    if (!disabled) {
      onGetEntity();
    }
  }, [disabled]);
  useEffect(() => {
    if (!collection.length) return;
    const [node] = collection;
    setInitial(node);
  }, [collection]);
  return {
    message,
    form: {
      disabled,
      formRef,
      onSubmit: onSubmitUpdate,
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
export function useGetCollection(title: string) {
  const expectSomeOrRedirect = true;
  const query = useSearchParams();
  const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
  const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
  const { message, disabled, collection, onGetCollection, page } =
    useCollection(
      {
        left: title,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      expectSomeOrRedirect
    );
  useEffect(() => {
    if (disabled) return;
    onGetCollection();
  }, [disabled]);
  return {
    collection,
    message,
    page,
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

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function NamedNode({
  name,
  children,
  uuid,
  controls,
  nav = null,
}: {
  name?: string;
  children?: ReactNode;
  uuid: string;
  controls?: ReactNode;
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
      <div>{controls}</div>
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
 * Link item for listing available collections. We don't care about order,
 * because we have no way of knowing which collections have nodes until
 * we make further queries.
 */
function Collection({
  name,
  href,
  content,
  "@iot.count": count,
}: {
  name: string;
  href: string;
  url: string;
  content: string;
  "@iot.count": number;
}) {
  /**
   * Specification for one entity model. Could instead be passed
   * through the API, since it already knows the specification.
   */
  const { description }: any = (specification.components.schemas as any)[name];
  const redirect = count > 0 ? href : href + "/create/";
  return (
    <details key={href}>
      <summary>
        <Link href={redirect} prefetch={false}>
          {content}
        </Link>
        <span>{` ✓ ${count}`}</span>
      </summary>
      <Markdown>{description}</Markdown>
    </details>
  );
}
/**
 * Client Component.
 */
export default function ({}) {
  const { onGetIndex, collection, message, disabled } = useCollection({
    limit: 100,
    offset: 0,
  });
  useEffect(() => {
    if (disabled) return;
    onGetIndex();
  }, [disabled]);
  return (
    <Suspense fallback={<p>{message}</p>}>
      <p>{message}</p>
      {collection.map((each) => (
        <Collection key={each.href} {...each} />
      ))}
    </Suspense>
  );
}
