"use client";
import React, { useRef, useEffect, useState, MutableRefObject } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import layout from "@app/layout.module.css";
import specification from "@app/../specification.json";

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
  status: "status",
  index: "index",
  error: "error",
  count: "count",
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
  worker: MutableRefObject<Worker | undefined>;
}
/**
 * Link item for listing available collections. We don't care about order,
 * because we have no way of knowing which collections have nodes until
 * we make further queries.
 */
function Collection({ left, href, content, worker }: ICollectionComponent) {
  const spec: any = (specification.components.schemas as any)[left];
  /**
   * Get count of nodes for a single collection */
  const [message, setMessage] = useState(` ↻`);
  /**
   * On load request collection metadata from our API.
   * The web worker will handle this to prevent blocking interaction.
   */
  useEffect(() => {
    let workerMessageHandler = ({ data }: any) => {
      switch ((data.type, data.data.left)) {
        // Only handle messages related to the collection.
        case (MESSAGES.count, left):
          setMessage(` ✓ N=${data.data.count}`);
          return;
        // Let parent and siblings handle all other messages.
        default:
          return;
      }
    };
    worker.current?.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.current?.postMessage({
      type: MESSAGES.count,
      data: {
        left,
      },
    });
    let handle = worker.current;
    return () => {
      handle?.removeEventListener("message", workerMessageHandler);
    };
  }, [left, worker]);
  return (
    <div key={href}>
      <hr />
      <p>
        <Link className={layout.link} href={href}>
          {content}
        </Link>
        <span>{message}</span>
      </p>
      
      <Markdown>{spec.description}</Markdown>
    </div>
  );
}
/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Catalog({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Index data loaded from the API.
   */
  const [index, setIndex] = useState<ICollection[]>([]);
  /**
   * Display message, workaround Suspense Data Fetching debacle.
   */
  const [message, setMessage] = useState("↻ Searching");
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("@app/catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    let workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        // Use worker to populate navigation data
        case MESSAGES.index:
          setIndex(data.data.index);
          setMessage(`✓ Found ${data.data.index.length}`);
          return;
        // Handled elsewhere, fallthrough
        case MESSAGES.count:
        case MESSAGES.status:
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
        type: MESSAGES.index,
        data: user_data,
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
   * Client Component.
   */
  return (
    <div>
      <p>{message}</p>
      {index.map((each, index) => (
        <Collection key={`collection-${index}`} worker={worker} {...each} />
      ))}
    </div>
  );
}
