"use client";
import React, { useEffect, useRef } from "react";
import specification from "@app/../specification.json";
import type { Observations } from "@oceanics/app";
import { NamedNode, useCollection } from "@catalog/client";
type IObservations = Omit<Observations, "free"> & {
  uuid: string
};
const components = specification.components;
const { title, properties } = components.schemas.Observations;

import style from "@catalog/page.module.css";
import {TextInput, NumberInput} from "@catalog/client";

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function ObservationsForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: {
  action: string;
  initial: IObservations;
  onSubmit: any;
  formRef: any;
  disabled: boolean;
}) {
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
        validTimeEnd.current?.value || undefined
      ],
      parameters: parameters.current?.value || undefined
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
        <NumberInput
          name={"phenomenonTime"}
          inputRef={phenomenonTime}
          required
          description={properties.phenomenonTime.description}
          defaultValue={initial.phenomenonTime}
        ></NumberInput>
        <NumberInput
          name={"result"}
          inputRef={result}
          required
          description={properties.result.description}
          defaultValue={initial.result}
        ></NumberInput>
        <NumberInput
          name={"resultTime"}
          inputRef={resultTime}
          description={properties.resultTime.description}
          defaultValue={initial.resultTime}
        ></NumberInput>
        <TextInput
          name={"resultQuality"}
          inputRef={resultQuality}
          description={properties.resultQuality.description}
          defaultValue={initial.resultQuality}
        ></TextInput>
        <TextInput
          name={"validTimeStart"}
          inputRef={validTimeStart}
          description={properties.validTime.description}
          defaultValue={initial.validTime?.start.toString()}
        ></TextInput>
        <TextInput
          name={"validTimeEnd"}
          inputRef={validTimeEnd}
          description={properties.validTime.description}
          defaultValue={initial.validTime?.end.toString()}
        ></TextInput>
        <TextInput
          name={"parameters"}
          inputRef={parameters}
          description={properties.parameters.description}
          defaultValue={initial.parameters}
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
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, disabled, onGetCollection } = useCollection({
    left: title,
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
      {collection.map(({ uuid }: IObservations) => {
        return (
          <NamedNode key={uuid} uuid={uuid} name={undefined}></NamedNode>
        );
      })}
    </>
  );
}
