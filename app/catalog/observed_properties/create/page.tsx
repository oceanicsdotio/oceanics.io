"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import useCreate, {TextInput} from "@catalog/useCreate";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { ObservedProperties } = specification.components.schemas;
const { properties } = ObservedProperties;
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
  const definition = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCreate({
    left: ObservedProperties.title,
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
      definition: definition.current?.value
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{ObservedProperties.description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={crypto.randomUUID()}
        ></TextInput>
        <TextInput
          name={"name"}
          inputRef={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          inputRef={description}
          required
          description={properties.description.description}
        ></TextInput>
        <TextInput
          name={"definition"}
          inputRef={definition}
          description={properties.definition.description}
        ></TextInput>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
