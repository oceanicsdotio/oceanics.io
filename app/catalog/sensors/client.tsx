"use client";
import specification from "@app/../specification.json";
import type { Sensors } from "@oceanics/app";
import { Collection, type Initial } from "../client";

import React, { useRef } from "react";
import style from "@catalog/page.module.css";
import Markdown from "react-markdown";
import { TextInput } from "@catalog/client";

const schema = specification.components.schemas.Sensors;
const properties = schema.properties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Form({
  action,
  disabled,
  onSubmit,
  formRef,
  initial,
}: {
  action: string;
  initial: Initial<Sensors>;
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
  const metadata = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLSelectElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
      metadata: metadata.current?.value || undefined,
      encodingType: encodingType.current?.value || undefined,
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
      <label className={style.label} htmlFor={"encodingType"}>
        <code>encodingType</code>
      </label>
      <select
        className={style.input}
        id={"encodingType"}
        name={"encodingType"}
        ref={encodingType}
        defaultValue={properties.encodingType.default}
      >
        {properties.encodingType.enum.map((value: string) => {
          return (
            <option key={value} value={value}>
              {value}
            </option>
          );
        })}
      </select>
      <Markdown>{properties.encodingType.description}</Markdown>
      <TextInput
        name={"metadata"}
        inputRef={metadata}
        description={properties.metadata.description}
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
function AdditionalProperties(sensor: Initial<Sensors>) {
  return (<>
    <p>description: {sensor.description}</p>
  </>)
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  return (
    <Collection<Initial<Sensors>>
      title={schema.title}
      AdditionalProperties={AdditionalProperties as any}
    />
  );
}
