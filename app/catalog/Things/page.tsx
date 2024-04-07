"use client";
import layout from "@app/layout.module.css";
import Link from "next/link";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import { getLinkedCollections } from "@catalog/page";
import specification from "@app/../specification.json";
const { Things } = specification.components.schemas;
const links = getLinkedCollections(Things.properties);
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "Things";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
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
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(({ data: {data, type} }: MessageEvent) => {
    switch (type) {
      case ACTIONS.getCollection:
        setThings(data.value);
        setMessage(`✓ Found ${data.value.length}`);
        return;
      case ACTIONS.error:
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
    worker.current = new Worker(new URL("@catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getCollection,
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
  }, [workerMessageHandler]);
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{Things.description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href={"create"}>
          create
        </Link>{" "}
        <code>Things</code>, and link them to {links}.
      </p>
      <p>{message}</p>
      {things.map((each: { uuid: string; name: string }, index) => {
        return (
          <p key={`${Things.title}-${index}`}>
            <Link href={each.uuid}>{each.name}</Link>
          </p>
        );
      })}
    </>
  );
}
