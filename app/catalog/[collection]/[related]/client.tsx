"use client";
import React, { useEffect, useState, useRef, useReducer } from "react";
import { useSearchParams } from "next/navigation";
import style from "@catalog/page.module.css";
import specification from "@app/../specification.yaml";
import Link from "next/link";
import { ACTIONS, MessageQueue, type Initial, messageQueueReducer } from "@catalog/client";
import { type NodeLike, fromKey } from "@catalog/[collection]/client";
import type { InteractiveMesh, MeshStyle } from "@oceanics/app";
/**
 * Placeholder visualization style.
 */
const meshStyle: Initial<MeshStyle> = {
  backgroundColor: "#11002299",
  overlayColor: "lightblue",
  lineWidth: 0.5,
  fontSize: 24,
  tickSize: 10,
  fade: 0.6,
  labelPadding: 10,
  radius: 5,
};
/**
 * Schema for the collection and related nodes.
 */
type Schema = {
  properties: Object;
  title: string;
  description: string;
};
/**
 * Interface the generic Linked component.
 */
type ILinked = {
  collection: Schema;
  related: Schema;
  nav?: boolean;
  AdditionalProperties?: React.FunctionComponent | null;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database. This is not used
 * directly in the page component, like other Client
 * components. Instead is is used as a helper function
 * imported into entity specific Linked components.
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
  const [messages, appendToQueue] = useReducer(messageQueueReducer, []);
  /**
   * Preview 2D render target.
   */
  const ref = useRef<HTMLCanvasElement>(null);
  /**
   * Keep reference to the WASM constructor.
   */
  const [wasm, setWasm] = useState<{
    InteractiveMesh: typeof InteractiveMesh;
  } | null>(null);
  /**
   * Load WASM runtime and save just the method handles
   * we need locally. Not sure if this saves us anything,
   * but seems like a clean idea.
   */
  useEffect(() => {
    (async () => {
      const wasm = await import("@oceanics/app");
      const { panic_hook, InteractiveMesh } = wasm;
      panic_hook();
      setWasm({ InteractiveMesh });
    })();
  }, []);
  /**
   * Once we have the WASM instance, create and
   * save the control and data structure.
   */
  useEffect(() => {
    if (!wasm || !ref.current) return;
    const handle = ref.current;
    const { InteractiveMesh } = wasm;
    const interactive = new InteractiveMesh(10, 10);
    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    let requestId: number | null = null;
    (function render() {
      const elapsed = performance.now();
      interactive.draw(handle, elapsed, meshStyle);
      interactive.rotate(0.01, 0.5, 0.5, 0.5);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [wasm]);
  /**
   * Node or index data, if any.
   */
  const [linked, setLinked] = useState<T[]>([]);
  /**
   * Pagination state is set in the backend.
   */
  const [page, setPage] = useState<{
    next?: string;
    previous?: string;
    current: number;
  }>({
    current: 1,
  });
    /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>(null);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    const left_uuid = query.get("uuid");
    worker.current = new Worker(
      new URL("@catalog/[collection]/[related]/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const workerMessageHandler = 
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getLinked:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setLinked(data.value);
          setPage(data.page);
          return;
        case ACTIONS.error:
          appendToQueue(data.message);
          return;
        case ACTIONS.status:
          appendToQueue(data.message);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    }
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.current.postMessage({
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
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  return (
    <>
      <MessageQueue messages={messages} />
      <canvas className={style.canvas} ref={ref}></canvas>
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
