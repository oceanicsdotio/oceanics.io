"use client";
import React, { useRef, useEffect } from "react";
import style from "@catalog/things/create/page.module.css";
import { TextSelectInput } from "@catalog/useCreate";
import { getLinkable } from "@app/catalog/page";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getLinked: "getLinked",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Linking(schema: {
  properties: any;
  title: string;
  description: string;
}) {
  const options = getLinkable(schema.properties);
  const query = useSearchParams();
  const right = query.get("right");
  const left_uuid = query.get("uuid");
  /**
   * Form data is synced with user input
   */
  const neighborType = useRef<HTMLSelectElement | null>(null);
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [collection, setCollection] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getLinked:
          setMessage(`✓ Found ${data.value.length}`);
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
    if (!right) return;
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user = localStorage.getItem("gotrue.user");
    if (typeof user !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getLinked,
        data: {
          query: {
            left_uuid,
            left: schema.title,
            right,
            limit: 10,
            offset: 0
          },
          user,
        },
      });
    } else {
      console.error("User is not logged in.");
    }
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);

  const pathname = usePathname();
  const { push } = useRouter();

  useEffect(() => {
    console.log({ collection });
  }, [collection]);

  return (
    <>
      <hr />
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
      <p>{message}</p>
      <hr />
      <div>
        {collection.map(({ uuid, ...rest }) => {
          const _right = (right??"").split(/\.?(?=[A-Z])/).join("_").toLowerCase();
          return (
            <p key={uuid}>
              <a href={`/catalog/${_right}/edit?uuid=${uuid}&right=${schema.title}`}>{rest.name ?? uuid}</a>
            </p>
          );
        })}
      </div>
    </>
  );
}
