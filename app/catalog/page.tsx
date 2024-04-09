"use client";
import React, {
  useRef,
  useEffect,
  useState,
  MutableRefObject,
  useCallback,
} from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import layout from "@app/layout.module.css";
import styles from "@catalog/page.module.css";
import specification from "@app/../specification.json";
/**
 * Convenience method to extract the expected/possible types
 * of connected entities, according to the OpenAPI spec.
 * This is used in entity specific pages.
 */
export function getLinkedCollections(properties: any) {
  const related = Object.keys(properties).filter((key: string) =>
    key.includes("@")
  );
  const links = related.map((key: string, index: number) => {
    let name = key.split("@")[0];
    let prepend = "";
    if (index === related.length - 1) {
      prepend = " and ";
    } else if (index > 0) {
      prepend = ", ";
    }
    return (
      <span key={`linked-${index}`}>
        {prepend}
        <code>{name}</code>
      </span>
    );
  });
  return links;
}
/**
 * Active web worker messages.
 * Worker itself knows more message types.
 */
const MESSAGES = {
  getIndex: "getIndex",
  getCount: "getCount",
  error: "error",
};
/**
 * Data passed back from worker to render collection link
 */
interface ICollection {
  left: string;
  href: string;
  content: string;
}
/**
 * Data passed into the collection link component.
 */
interface ICollectionComponent extends ICollection {
  worker: MutableRefObject<Worker | null>;
}
/**
 * Link item for listing available collections. We don't care about order,
 * because we have no way of knowing which collections have nodes until
 * we make further queries.
 */
function Collection({ left, href, content, worker }: ICollectionComponent) {
  /**
   * Specification for one entity model.
   */
  const { description }: any = (specification.components.schemas as any)[left];
  /**
   * Get count of nodes for a single collection
   */
  const [message, setMessage] = useState(` ↻`);
  /**
   * Process worker messages, ignore unknown and allow siblings and
   * parent to catch it.
   */
  const workerMessageHandler = useCallback(
    ({ data: { type, data } }: any) => {
      if (type === MESSAGES.getCount && data.left === left) {
        setMessage(` ✓ N=${data.count}`);
      }
    },
    [left]
  );
  /**
   * On load request collection metadata from our API.
   * The web worker will handle this to prevent blocking interaction.
   */
  useEffect(() => {
    if (!worker.current) return;
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.current.postMessage({
      type: MESSAGES.getCount,
      data: {
        left,
      },
    });
    let handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [left, worker, workerMessageHandler]);
  return (
    <div key={href}>
      <hr />
      <p>
        <Link className={layout.link} href={href}>
          {content}
        </Link>
        <span>{message}</span>
      </p>
      <Markdown>{description}</Markdown>
    </div>
  );
}
/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Page({}) {
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
  const workerMessageHandler = useCallback(({ data: {type, data} }: any) => {
    switch (type) {
      case MESSAGES.getIndex:
        setIndex(data.index);
        setMessage(`✓ Found ${data.index.length}`);
        return;
      case MESSAGES.error:
        console.error("worker", type, data);
        return;
      default:
        console.warn("client", type, data);
        return;
    }
  }, []);
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
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined") {
      worker.current.postMessage({
        type: MESSAGES.getIndex,
        data: {user: user_data},
      });
    } else {
      console.error("User is not logged in.");
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
    <div className={styles.catalog}>
      <h2>{specification.info.title}</h2>
      <Markdown>{specification.info.description}</Markdown>
      <p>
        If code is more your style, try our{" "}
        <Link href="/openapi">
          {" "}
          OpenAPI documentation for integration developers.
        </Link>
      </p>
      <div>
        <p>{message}</p>
        {index.map((each, index) => (
          <Collection key={`collection-${index}`} worker={worker} {...each} />
        ))}
      </div>
    </div>
  );
}
