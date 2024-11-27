"use client";
import React, { useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import style from "@catalog/page.module.css";
import specification from "@app/../specification.json";
import Link from "next/link";
import { ACTIONS, useWorkerFixtures } from "@catalog/client";
import { type NodeLike } from "@catalog/[collection]/client";
function fromKey(collection: string) {
  return collection
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
}
type Schema = {
  properties: Object;
  title: string;
  description: string;
};
type ILinked = {
  collection: Schema;
  related: Schema;
  nav?: boolean;
  AdditionalProperties?: React.FunctionComponent | null;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Linked<T extends NodeLike>({
  collection,
  related,
  AdditionalProperties,
  nav,
}: ILinked) {
  const schema = (specification.components.schemas as any)[related.title];
  const options = Object.keys(schema.properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
  const query = useSearchParams();
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [linked, setLinked] = useState<T[]>([]);
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
        case ACTIONS.getLinked:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setLinked(data.value);
          setPage(data.page);
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
    const left_uuid = query.get("uuid");
    worker.ref.current = new Worker(
      new URL("@catalog/[collection]/[related]/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.post({
      type: ACTIONS.getLinked,
      data: {
        query: {
          left: collection.title,
          left_uuid: left_uuid,
          right: related.title,
          limit: 10,
          offset: 0,
        },
      },
    });
    const handle = worker.ref.current;
    worker.setDisabled(false);
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  return (
    <>
      <p>{message}</p>
      <>
        {linked.map(({ uuid, name, ...rest }, index) => {
          const a = fromKey(related.title);
          return (
            <details key={uuid} name="exclusive" open={index === 0}>
              <summary>
                <Link href={`/catalog/${a}/edit?uuid=${uuid}`} prefetch={false}>
                  {name ?? uuid}
                </Link>
                {nav && (
                  <>
                    {" [ "}
                    <Link
                      href={`/catalog/${a}/view?uuid=${uuid}`}
                      prefetch={false}
                    >
                      view
                    </Link>
                    {" ]"}
                  </>
                )}
              </summary>
              {AdditionalProperties && (
                <div className={style.add_props}>
                  <AdditionalProperties {...(rest as any)} />
                </div>
              )}
              <ul>
                {options.map((each) => {
                  return (
                    <li>
                      <Link
                        href={`/catalog/${fromKey(related.title)}/${fromKey(each)}?uuid=${uuid}`}
                        prefetch={false}
                      >
                        {each}
                      </Link>
                    </li>
                  );
                })}
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
