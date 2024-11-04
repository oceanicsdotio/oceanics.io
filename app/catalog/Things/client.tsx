"use client";
import React, {
  useRef,
} from "react";
import OpenAPI from "@app/../specification.json";
import type { Things } from "@oceanics/app";
import { NamedNode, TextInput, useGetCollection, Initial, Paging } from "@catalog/client";
import style from "@catalog/page.module.css";
/**
 * Metadata from the OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
const properties = schema.properties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database. Shared between
 * `/create` and `/edit` interfaces.
 */
export function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: {
  action: string
  initial: Initial<Things>
  onSubmit: any
  formRef: any
  disabled: boolean
}) {
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
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
      properties: _properties.current?.value || undefined,
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
        readOnly
        required={!properties.uuid.type.includes("null")}
        inputRef={uuid}
        description={properties.uuid.description}
        defaultValue={initial.uuid}
      ></TextInput>
      <TextInput
        name={"name"}
        required={!properties.name.type.includes("null")}
        inputRef={name}
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        required={!properties.description.type.includes("null")}
        inputRef={_description}
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"properties"}
        required={!properties.properties.type.includes("null")}
        inputRef={_properties}
        description={properties.properties.description}
        defaultValue={initial.properties}
      ></TextInput>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset">
        Reset
      </button>
    </form>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function () {
  /**
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
  const { message, collection, page } = useGetCollection(schema.title);
  /**
   * Client Component.
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, ...thing }: Initial<Things>) => {
        return (
          <NamedNode key={uuid} name={thing.name} uuid={uuid} nav={"view"}>
            <p>description: {thing.description ?? "n/a"}</p>
            <p>properties: {thing.properties ?? "n/a"}</p>
          </NamedNode>
        );
      })}
      <Paging {...page}/>
    </>
  );
}
