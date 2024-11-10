"use client";
import React, { useRef } from "react";
import {
  type FormArgs,
  Initial,
  NamedNode,
  Paging,
  TextInput,
  useGetCollection,
} from "@catalog/client";
import openapi from "@app/../specification.json";
import style from "@catalog/page.module.css";
import Markdown from "react-markdown";
import type { DataStreams } from "@oceanics/app";
const schema = openapi.components.schemas.DataStreams;
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
}: FormArgs<DataStreams>) {
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
      <TextInput
        name={"name"}
        inputRef={name}
        required
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={description}
        required
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementName"}
        inputRef={unitOfMeasurementName}
        description={properties.unitOfMeasurement.properties.name.description}
        defaultValue={initial.unitOfMeasurement?.name}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementSymbol"}
        inputRef={unitOfMeasurementSymbol}
        description={properties.unitOfMeasurement.properties.symbol.description}
        defaultValue={initial.unitOfMeasurement?.symbol}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementDefinition"}
        inputRef={unitOfMeasurementDefinition}
        description={
          properties.unitOfMeasurement.properties.definition.description
        }
        defaultValue={initial.unitOfMeasurement?.definition}
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
        {action}
      </button>
    </form>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database. This is used
 * wherever you need to fetch and render all
 * or a subset of `DataStreams`.
 */
export default function ({}) {
  /**
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
  const { message, collection } = useGetCollection<Initial<DataStreams>>(schema.title);
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map((dataStream) => {
        return (
          <NamedNode
            key={dataStream.uuid}
            uuid={dataStream.uuid}
            name={dataStream.name}
            nav={"view"}
          >
            <p>unit of measurement:</p>
            <p style={{ textIndent: "2em" }}>{`name: ${
              dataStream.unitOfMeasurement?.name ?? "n/a"
            }`}</p>
            <p style={{ textIndent: "2em" }}>{`symbol: ${
              dataStream.unitOfMeasurement?.symbol ?? "n/a"
            }`}</p>
            <p style={{ textIndent: "2em" }}>{`definition: ${
              dataStream.unitOfMeasurement?.definition ?? "n/a"
            }`}</p>
            <p>observation type: {dataStream.observationType ?? "n/a"}</p>
            <p>phenomenon time: unknown</p>
            <p>result time: unknown</p>
          </NamedNode>
        );
      })}
    </>
  );
}
