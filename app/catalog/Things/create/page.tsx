"use client";
import React, { useRef } from "react";
import style from "@catalog/things/create/page.module.css";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import useCreate, { TextInput } from "@catalog/useCreate";
/**
 * Get Things properties from OpenAPI schema
 */
const { title: left, description, properties } = specification.components.schemas.Things;
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
  const _description = useRef<HTMLInputElement | null>(null);
  /**
   * JSON format input.
   */
  const _properties = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker initialization.
   */
  const { message, create, disabled, onSubmit } = useCreate({
    left
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      properties: _properties.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          required
          inputRef={uuid}
          description={properties.uuid.description}
          defaultValue={crypto.randomUUID()}
        ></TextInput>
        <TextInput
          name={"name"}
          required
          inputRef={name}
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          required
          inputRef={_description}
          description={properties.description.description}
        ></TextInput>
        <TextInput
          name={"properties"}
          inputRef={_properties}
          description={properties.properties.description}
        ></TextInput>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
