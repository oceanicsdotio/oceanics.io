"use client";
import React, { useEffect, useRef } from "react";
import styles from "@app/catalog/catalog.module.css";
import specification from "@app/../specification.json";
import { Input } from "@app/catalog/Catalog";
/**
 * Get Things properties from OpenAPI schema
 */
const { properties, description } = specification.components.schemas.Things;
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
export default function Create({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@app/catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
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
    <form className={styles.form}>
      <p>{description}</p>
      <Input id={"uuid"} description={properties.uuid.description}></Input>
      <Input id={"name"} description={properties.name.description}></Input>
      <Input
        id={"description"}
        description={properties.description.description}
      ></Input>
      <Input
        id={"properties"}
        description={properties.properties.description}
      ></Input>
    </form>
  );
}
