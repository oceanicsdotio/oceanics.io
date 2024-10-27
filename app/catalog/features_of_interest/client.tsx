"use client";
import specification from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import type { FeaturesOfInterest } from "@oceanics/app";
import { NamedNode } from "@app/catalog/Node";

const components = specification.components;
import React, { useRef } from "react";
import style from "@catalog/page.module.css";
import {TextInput} from "@catalog/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { title, properties } = specification.components.schemas.FeaturesOfInterest;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const _description = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLInputElement | null>(null);
  const feature = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCollection({
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
      name: name.current?.value,
      description: _description.current?.value,
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
          inputRef={_description}
          required
          description={properties.description.description}
        ></TextInput>
        <TextInput
          name={"encodingType"}
          inputRef={encodingType}
          description={properties.encodingType.description}
        ></TextInput>
        <TextInput
          name={"feature"}
          inputRef={feature}
          description={properties.feature.description}
        ></TextInput>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}

/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Collection({}) {
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
    <div>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: Omit<FeaturesOfInterest, "free">) => {
        return (
          <NamedNode key={uuid} uuid={uuid} name={rest.name}>
            <p>description: {rest.description ?? "n/a"}</p>
            <p>encoding type: {rest.encodingType ?? "n/a"}</p>
            <p>feature: {rest.feature ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </div>
  );
}
