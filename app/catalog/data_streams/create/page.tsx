"use client";
import React, { type MutableRefObject, useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import useCreate from "@catalog/useCreate";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { DataStreams } = specification.components.schemas;
const { properties } = DataStreams;
function TextInput({
  name,
  ref,
  description,
  required = false,
}: {
  name: string;
  ref: MutableRefObject<HTMLInputElement | null>;
  description: string;
  required?: boolean;
}) {
  return (
    <>
      <label className={style.label} htmlFor={name}>
        <code>{name}</code>
        <span>{required ? "(required)" : ""}</span>
      </label>
      <input
        className={style.input}
        id={name}
        type={"text"}
        name={name}
        placeholder="..."
        ref={ref}
        required={required}
      />
      <Markdown>{description}</Markdown>
    </>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const description = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementName = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementSymbol = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementDefinition = useRef<HTMLInputElement | null>(null);
  const observationType = useRef<HTMLSelectElement | null>(null);
  const observedArea = useRef<HTMLInputElement | null>(null);
  const phenomenaTime = useRef<HTMLInputElement | null>(null);
  const resultTime = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCreate({
    left: DataStreams.title,
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: description.current?.value,
      observationType: observationType.current?.value,
      // unitOfMeasurement: {
      //   name: unitOfMeasurementName.current?.value,
      //   symbol: unitOfMeasurementSymbol.current?.value,
      //   definition: unitOfMeasurementDefinition.current?.value,
      // },
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{DataStreams.description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          ref={uuid}
          required
          description={properties.uuid.description}
        ></TextInput>
        <TextInput
          name={"name"}
          ref={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          ref={description}
          description={properties.description.description}
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementName"}
          ref={unitOfMeasurementName}
          description={properties.unitOfMeasurement.properties.name.description}
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementSymbol"}
          ref={unitOfMeasurementSymbol}
          description={
            properties.unitOfMeasurement.properties.symbol.description
          }
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementDefinition"}
          ref={unitOfMeasurementDefinition}
          description={
            properties.unitOfMeasurement.properties.definition.description
          }
        ></TextInput>

        <label className={style.label} htmlFor={"observationType"}>
          <code>observationType</code>
        </label>
        <select
          className={style.input}
          id={"observationType"}
          name={"observationType"}
          ref={observationType}
          defaultValue={"OM_Measurement"}
        >
          {properties.observationType.enum.map((value: string) => {
            return (
              <option key={value} value={value}>
                {value}
              </option>
            );
          })}
        </select>
        <Markdown>{properties.observationType.description}</Markdown>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
