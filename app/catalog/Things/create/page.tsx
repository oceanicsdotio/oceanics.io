"use client";
import React, { FormEventHandler, useEffect, useRef, useState } from "react";
import style from "@catalog/things/create/page.module.css";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
/**
 * Get Things properties from OpenAPI schema
 */
const { Things } = specification.components.schemas;
/**
 * Web worker messages handled in this context.
 * The shared worker may understand/send other types.
 */
const MESSAGES = {
  create: "create",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const description = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const worker = useRef<Worker | null>(null);
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * Let user know that there is something going on
   * in the background.
   */
  const [waiting, setWaiting] = useState<boolean|undefined>();
  /**
   * Load Web Worker and perform startup on component mount.
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.create:
          console.error("@client", data.type, data.data);
          return;
        case MESSAGES.error:
          console.error("@client", data.type, data.data);
          return;
        default:
          console.warn("@client", data.type, data.data);
          return;
      }
    };
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const handle = worker.current;
    setDisabled(false);
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmit: FormEventHandler = async (event) => {
    event.preventDefault();
    const user_data = localStorage.getItem("gotrue.user");
    worker.current?.postMessage({
      type: MESSAGES.create,
      data: {
        left: Things.title,
        user: user_data,
        body: JSON.stringify({
          uuid: uuid.current?.value,
          name: name.current?.value,
          description: description.current?.value,
        }),
      },
    });
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{Things.description}</Markdown>
      <hr />
      <form className={style.form} onSubmit={onSubmit}>
        <label className={style.label} htmlFor={"uuid"}>
          <code>uuid</code>
        </label>
        <input
          className={style.input}
          id={"uuid"}
          type={"text"}
          name={"uuid"}
          placeholder="..."
          required
          ref={uuid}
        />
        <Markdown>{Things.properties.uuid.description}</Markdown>
        <label className={style.label} htmlFor={"name"}>
          <code>name</code>
        </label>
        <input
          className={style.input}
          id={"name"}
          type={"text"}
          name={"name"}
          placeholder="..."
          required
          ref={name}
        />
        <Markdown>{Things.properties.name.description}</Markdown>
        <label className={style.label} htmlFor={"description"}>
          <code>description</code>
        </label>
        <input
          className={style.input}
          id={"description"}
          type={"text"}
          name={"description"}
          placeholder="..."
          ref={description}
        />
        <Markdown>{Things.properties.description.description}</Markdown>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
