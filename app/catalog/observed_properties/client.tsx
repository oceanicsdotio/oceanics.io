"use client";
import React, { useEffect, useRef } from "react";
import specification from "@app/../specification.json";
import type { ObservedProperties } from "@oceanics/app";
import { NamedNode, useCollection } from "../client";
interface IObservedProperties extends Omit<ObservedProperties,"free"> {}
/**
 * Get schema metadata from the OpenAPI specification.
 */
const components = specification.components;
const { title: left } = components.schemas.ObservedProperties;

import style from "@catalog/page.module.css";
import { TextInput } from "@catalog/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { properties } =
  specification.components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function ObservedPropertiesForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: {
  action: string;
  initial: IObservedProperties;
  onSubmit: any;
  formRef: any;
  disabled: boolean;
}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const _description = useRef<HTMLInputElement | null>(null);
  const definition = useRef<HTMLInputElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      definition: definition.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        inputRef={uuid}
        required
        description={properties.uuid.description}
        defaultValue={initial.uuid}
      ></TextInput>
      <TextInput
        name={"name"}
        inputRef={name}
        required
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={_description}
        required
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"definition"}
        inputRef={definition}
        description={properties.definition.description}
        defaultValue={initial.definition}
      ></TextInput>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
    </form>
  );
}

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, disabled, onGetCollection } = useCollection({
    left,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  useEffect(() => {
    if (disabled) return;
    onGetCollection();
  }, [disabled]);
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: Omit<ObservedProperties, "free">) => {
        return (
          <NamedNode key={uuid} name={rest.name} uuid={uuid}>
            <p>description: {rest.description}</p>
          </NamedNode>
        );
      })}
    </>
  );
}
