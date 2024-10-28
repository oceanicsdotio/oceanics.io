"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type FormEventHandler,
} from "react";
import Markdown from "react-markdown";
import style from "@catalog/page.module.css";
import Link from "next/link";
import specification from "@app/../specification.json";
import layout from "@app/layout.module.css";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
  deleteEntity: "deleteEntity",
  createEntity: "createEntity",
  getIndex: "getIndex",
  getLinked: "getLinked",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function useCollection(query: {
  left?: string
  limit?: number
  offset?: number
  right?: string
  uuid?: string
}) {
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
          setMessage(`✓ Found ${data.value.length} nodes`);
          setCollection(data.value);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        case ACTIONS.deleteEntity:
          setMessage(`✓ Deleted 1 node`);
          setCollection((previous: any[]) => {
            return previous.filter((each) => each.uuid !== data.uuid);
          });
          return;
        case ACTIONS.createEntity:
          if (data.data) {
            formRef.current?.reset();
            setMessage("✓ Created 1 node");
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
    if (typeof user === "undefined") {
      setMessage("! You are not logged in");
      return;
    }
    worker.current.postMessage({ user, ...message });
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

  const onGetCollection = () => {
    tryPostMessage({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: query.left
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
          right: query.right
        }
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
  /**
   * Delete a resource
   */
  const onDelete = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this node and its relationships?"
    )
    if (!confirmation) return;
    tryPostMessage({
      type: ACTIONS.deleteEntity,
      data: {
        query: {
          left: query.left,
          uuid: query.uuid
        }
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
    create: formRef,
    onGetIndex,
    onGetCollection,
    onGetLinked,
  };
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
}: {
  name?: string;
  children?: ReactNode;
  uuid: string;
  controls?: ReactNode;
}) {
  const url = `edit/?uuid=${uuid}`;
  const [showDetails, setShowDetails] = useState(false);
  function onDetails() {
    setShowDetails((prev) => !prev);
  }
  return (
    <div>
      <Link href={url} prefetch={false}>
        {name ?? uuid}
      </Link>
      <div>
        <button className={layout.button} onClick={onDetails}>
          Show Details
        </button>
        {controls}
      </div>
      {showDetails && children}
    </div>
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
export default function ({}) {
  const { onGetCollection, collection, message, disabled } = useCollection({
    limit: 100,
    offset: 0,
    left: "",
    right: ""
  });
  useEffect(()=>{
    if (disabled) return;
    onGetCollection();
  },[disabled])
  /**
   * Client Component.
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map((each, index) => (
        <Collection key={`collection-${index}`} {...each} />
      ))}
    </div>
  );
}
