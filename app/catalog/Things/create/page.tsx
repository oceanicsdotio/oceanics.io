"use client";
import React, { useRef } from "react";
import style from "@catalog/things/create/page.module.css";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import useCreate from "@catalog/useCreate";
/**
 * Get Things properties from OpenAPI schema
 */
const { Things } = specification.components.schemas;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Create({}) {
  /**
   * User must input uuid, it will not be generated within
   * the system. Currently duplicate UUID silently fails.
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  /**
   * Non-unique display name for humans. Can be unique
   * and contain information if you so choose, but it
   * doesn't matter to the database.
   */
  const name = useRef<HTMLInputElement | null>(null);
  /**
   * Freeform text description input reference.
   */
  const description = useRef<HTMLInputElement | null>(null);
  /**
   * JSON format input.
   */
  const properties = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker initialization.
   */
  const { message, create, disabled, onSubmit } = useCreate({
    left: Things.title,
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: description.current?.value,
      properties: properties.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{Things.description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <label className={style.label} htmlFor={"uuid"}>
          <code>uuid</code>
          {" (required)"}
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
          {" (required)"}
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
        <label className={style.label} htmlFor={"properties"}>
          <code>properties</code>
        </label>
        <input
          className={style.input}
          id={"properties"}
          type={"text"}
          name={"properties"}
          placeholder="..."
          ref={properties}
        />
        <Markdown>{Things.properties.properties.description}</Markdown>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
