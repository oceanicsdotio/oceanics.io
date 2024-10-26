"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
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
export function getLinkable(properties: any) {
  return Object.keys(properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
}
export function getLinkedCollections(properties: any) {
  const related = getLinkable(properties);
  const links = related.map((name: string, index: number) => {
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
  error: "error",
};
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
    <div className={styles.catalog}>
      <Markdown>{specification.info.description}</Markdown>
      <p>
        If code is more your style, try our{" "}
        <Link href="/openapi/" prefetch={false}>
          {" "}
          OpenAPI documentation for integration developers.
        </Link>
      </p>
      <div>
        <p>{message}</p>
        {index.map((each, index) => (
          <Collection key={`collection-${index}`} {...each} />
        ))}
      </div>
    </div>
  );
}
