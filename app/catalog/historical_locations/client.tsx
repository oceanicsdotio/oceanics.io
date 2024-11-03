"use client";
import React, {useRef} from "react";
import specification from "@app/../specification.json";
import type { HistoricalLocations } from "@oceanics/app";
import { NamedNode, useCollection } from "@catalog/client";
const components = specification.components;
interface IHistoricalLocations extends Omit<HistoricalLocations, "free"> {};

import style from "@catalog/page.module.css";
import Markdown from "react-markdown";
import { TextInput } from "@catalog/client";

const { properties, title } = specification.components.schemas.HistoricalLocations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const time = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmitCreate, disabled, formRef: create, message } = useCollection({
    left: title,
    limit: 100,
    offset: 0
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmitCreate(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={crypto.randomUUID()}
        ></TextInput>
        <label className={style.label} htmlFor={"time"}>
          <code>time</code>
          <span>{" (required)"}</span>
        </label>
        <input
          className={style.input}
          id={"time"}
          type={"number"}
          name={"time"}
          ref={time}
        />
        <Markdown>{properties.time.description}</Markdown>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({
    left: title,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: IHistoricalLocations) => {
        return (
          <NamedNode key={uuid} uuid={uuid}>
            <p>time: {rest.time}</p>
          </NamedNode>
        );
      })}
    </>
  );
}
