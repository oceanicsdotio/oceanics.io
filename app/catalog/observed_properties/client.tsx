"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import type { ObservedProperties } from "@oceanics/app";
import {
  FormArgs,
  NamedNode,
  Paging,
  useGetCollection,
  Initial,
} from "../client";
import style from "@catalog/page.module.css";
import { TextInput } from "@catalog/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const schema = specification.components.schemas.ObservedProperties;
const properties = schema.properties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<ObservedProperties>) {
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
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
      definition: definition.current?.value || undefined,
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
        readOnly
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
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
  const { message, collection, page } = useGetCollection<
    Initial<ObservedProperties>
  >(schema.title);
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }) => {
        return (
          <NamedNode key={uuid} name={rest.name} uuid={uuid}>
            <p>description: {rest.description}</p>
          </NamedNode>
        );
      })}
      <Paging {...page} />
    </>
  );
}
