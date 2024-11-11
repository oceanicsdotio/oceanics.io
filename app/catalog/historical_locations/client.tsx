"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import type { HistoricalLocations } from "@oceanics/app";
import { type FormArgs, type Initial, Collection, NumberInput } from "@catalog/client";

import style from "@catalog/page.module.css";
import Markdown from "react-markdown";
import { TextInput } from "@catalog/client";

const schema = specification.components.schemas.HistoricalLocations;
const properties = schema.properties
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
}: FormArgs<HistoricalLocations>) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const time = useRef<HTMLInputElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value || undefined,
      time: time.current?.value || undefined,
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
          readOnly={true}
        ></TextInput>
        <NumberInput
          name={"time"}
          inputRef={time}
          required
          description={properties.time.description}
        />
        <button className={style.submit} disabled={disabled}>
          {action}
        </button>
        <button className={style.submit} type="reset">
          Reset
        </button>
      </form>
  );
}
export function AdditionalProperties(rest: Initial<HistoricalLocations>) {
  return(<>
    <p>time: {rest.time}</p>
  </>)
}
