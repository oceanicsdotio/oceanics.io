"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import type { HistoricalLocations } from "@oceanics/app";
import { type Initial } from "@catalog/client";

import style from "@catalog/page.module.css";
import {Edit as EditGeneric} from "@catalog/[collection]/edit/client";
import {Create} from "@catalog/[collection]/create/client";
import {Linked as LinkedGeneric} from "@app/catalog/[collection]/[related]/client";
import {Collection, TextInput, FormArgs, NumberInput} from "@catalog/[collection]/client";
const schema = specification.components.schemas.HistoricalLocations;
const properties = schema.properties;
export function Data() {
  return <Collection<HistoricalLocations> 
    title={schema.title}
    AdditionalProperties={AdditionalProperties as any}
  />;
}
export function New({}) {
  return (
    <Create<HistoricalLocations>
      Form={Form}
      title={schema.title}
    ></Create>
  )
}
export function Edit({}) {
  return (
    <EditGeneric<HistoricalLocations>
      Form={Form}
      title={schema.title}
    ></EditGeneric>
  )
} 
export function Linked({collection}: any) {
  return <LinkedGeneric<HistoricalLocations> collection={collection} related={schema} />;
}
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
function AdditionalProperties(rest: Initial<HistoricalLocations>) {
  return(<>
    <li>time: {rest.time}</li>
  </>)
}
