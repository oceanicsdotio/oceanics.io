"use client";
import specification from "@app/../specification.json";
import type { FeaturesOfInterest } from "@oceanics/app";
import {
  type FormArgs,
  TextInput,
  Initial
} from "@catalog/client";
import {Edit as EditGeneric} from "@catalog/[collection]/edit/client";
import {Create} from "@catalog/[collection]/create/client";
import {Linked as LinkedGeneric} from "@catalog/[collection]/linked/client";
import {Collection} from "@catalog/[collection]/client";
import React, { useRef } from "react";
import style from "@catalog/page.module.css";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const schema = specification.components.schemas.FeaturesOfInterest;
const properties = schema.properties;
export function Data() {
  return <Collection<FeaturesOfInterest> 
    title={schema.title}
    AdditionalProperties={AdditionalProperties as any}
  />;
}
export function New({}) {
  return (
    <Create<FeaturesOfInterest>
      Form={Form}
      title={schema.title}
    ></Create>
  )
}
export function Edit({}) {
  return (
    <EditGeneric<FeaturesOfInterest>
      Form={Form}
      title={schema.title}
    ></EditGeneric>
  )
}
export function Linked({}) {
  return (
      <LinkedGeneric<FeaturesOfInterest> {...schema} />
  );
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
}: FormArgs<FeaturesOfInterest>) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const _description = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLInputElement | null>(null);
  const feature = useRef<HTMLInputElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
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
        inputRef={_description}
        required
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"encodingType"}
        inputRef={encodingType}
        description={properties.encodingType.description}
        defaultValue={initial.encodingType}
      ></TextInput>
      <TextInput
        name={"feature"}
        inputRef={feature}
        description={properties.feature.description}
        defaultValue={initial.feature}
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
export function AdditionalProperties(rest: Initial<FeaturesOfInterest>) {
  return(<>
    <p>description: {rest.description ?? "n/a"}</p>
    <p>encoding type: {rest.encodingType ?? "n/a"}</p>
    <p>feature: {rest.feature ?? "n/a"}</p>
  </>)
}

