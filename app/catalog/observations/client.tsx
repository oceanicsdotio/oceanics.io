"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import type { Observations } from "@oceanics/app";
import {Edit as EditGeneric} from "@catalog/[collection]/edit/client";
import {Create} from "@catalog/[collection]/create/client";
import {Linked as LinkedGeneric} from "@catalog/[collection]/linked/client";
import {Collection, TextInput, NumberInput, FormArgs} from "@catalog/[collection]/client";
const components = specification.components;
const schema = components.schemas.Observations;
import style from "@catalog/page.module.css";
export function Data() {
  return <Collection<Observations> title={schema.title} />
}
export function New({}) {
  return <Create<Observations> Form={Form} title={schema.title}></Create>
}
export function Edit({}) {
  return <EditGeneric<Observations> Form={Form} title={schema.title}></EditGeneric>
}
export function Linked({}) {
  return <LinkedGeneric<Observations> {...schema} />
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
}: FormArgs<Observations>) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const phenomenonTime = useRef<HTMLInputElement | null>(null);
  const result = useRef<HTMLInputElement | null>(null);
  const resultTime = useRef<HTMLInputElement | null>(null);
  const resultQuality = useRef<HTMLInputElement | null>(null);
  const validTimeStart = useRef<HTMLInputElement | null>(null);
  const validTimeEnd = useRef<HTMLInputElement | null>(null);
  const parameters = useRef<HTMLInputElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      phenomenonTime: phenomenonTime.current?.value || undefined,
      result: result.current?.value || undefined,
      resultTime: resultTime.current?.value || undefined,
      resultQuality: resultQuality.current?.value || undefined,
      validTime: [
        validTimeStart.current?.value || undefined,
        validTimeEnd.current?.value || undefined,
      ],
      parameters: parameters.current?.value || undefined,
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
        description={schema.properties.uuid.description}
        defaultValue={initial.uuid}
        readOnly
      ></TextInput>
      <NumberInput
        name={"phenomenonTime"}
        inputRef={phenomenonTime}
        required
        description={schema.properties.phenomenonTime.description}
        defaultValue={initial.phenomenonTime}
      ></NumberInput>
      <NumberInput
        name={"result"}
        inputRef={result}
        required
        description={schema.properties.result.description}
        defaultValue={initial.result}
      ></NumberInput>
      <NumberInput
        name={"resultTime"}
        inputRef={resultTime}
        description={schema.properties.resultTime.description}
        defaultValue={initial.resultTime}
      ></NumberInput>
      <TextInput
        name={"resultQuality"}
        inputRef={resultQuality}
        description={schema.properties.resultQuality.description}
        defaultValue={initial.resultQuality}
      ></TextInput>
      <TextInput
        name={"validTimeStart"}
        inputRef={validTimeStart}
        description={schema.properties.validTime.description}
        defaultValue={initial.validTime?.start.toString()}
      ></TextInput>
      <TextInput
        name={"validTimeEnd"}
        inputRef={validTimeEnd}
        description={schema.properties.validTime.description}
        defaultValue={initial.validTime?.end.toString()}
      ></TextInput>
      <TextInput
        name={"parameters"}
        inputRef={parameters}
        description={schema.properties.parameters.description}
        defaultValue={initial.parameters}
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
