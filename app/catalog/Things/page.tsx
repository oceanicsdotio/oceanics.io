"use client";
import layout from "@app/layout.module.css";
import specification from "@app/../specification.json";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
const { properties, description } = specification.components.schemas.Things;
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
    <>
      {prepend}
      <code>{name}</code>
    </>
  );
});
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "Things";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const MESSAGES = {
  collection: "collection",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [things, setThings] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("@app/catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.collection:
          setThings(data.data.value);
          setMessage(`✓ Found ${data.data.value.length}`);
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
        type: MESSAGES.collection,
        data: {
          left,
          user: user_data,
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
  /**
   * Client Component
   */
  return (
    <>
      <p>{description}</p>
      <p>
        You can{" "}
        <Link className={layout.link} href={"create"}>
          create
        </Link>{" "}
        <code>Things</code>, and link them to {links}.
      </p>
      <p>{message}</p>
      {things.map((each: { uuid: string; name: string }) => {
        let href = `${each.uuid}`;
        return (
          <p key={each.uuid}>
            <Link href={href}>{each.name}</Link>
          </p>
        );
      })}
    </>
  );
}
