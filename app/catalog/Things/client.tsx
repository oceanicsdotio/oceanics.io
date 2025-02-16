"use client";
import React, {
  useRef,
} from "react";
import type { Things } from "@oceanics/app";
import OpenAPI from "@app/../specification.yaml";
import { type Initial } from "@catalog/client";
import { Edit as EditGeneric } from "@catalog/[collection]/edit/client";
import { Create } from "@catalog/[collection]/create/client";
import { Linked as LinkedGeneric } from "@app/catalog/[collection]/[related]/client";
import {
  Collection,
  TextInput,
  type FormArgs,
  FormContainer,
} from "@catalog/[collection]/client";
/**
 * Metadata from the OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
const properties = schema.properties;
/**
 * View interface
 */
export function Data({}) {
  return (
    <Collection<Things>
      title={schema.title}
      nav={true}
      AdditionalProperties={AdditionalProperties as any}
    />
  );
}
/**
 * Create new node
 */
export function New({}) {
  return <Create<Things> Form={Form} title={schema.title}></Create>;
}
/**
 * Update or delete node
 */
export function Edit({}) {
  return <EditGeneric<Things> Form={Form} title={schema.title}></EditGeneric>;
}
/**
 * Get other nodes related to this one
 */
export function Linked({collection}: any) {
  return <LinkedGeneric<Things> collection={collection} related={schema} />;
}
function useRefs() {
  /**
   * User must input uuid, it will not be generated within
   * the system. Currently duplicate UUID silently fails.
   */
  const uuid = useRef<HTMLInputElement>(null);
  /**
   * Non-unique display name for humans. Can be unique
   * and contain information if you so choose, but it
   * doesn't matter to the database.
   */
  const name = useRef<HTMLInputElement>(null);
  /**
   * Freeform text description input reference.
   */
  const description = useRef<HTMLInputElement>(null);
  /**
   * JSON format input.
   */
  const properties = useRef<HTMLInputElement>(null);
  return { uuid, name, description, properties };
}
/**
 * Form fields specific to Things nodes
 */
function Fields({
  refs,
  initial,
  disabled,
}: {
  refs: any;
  initial: Initial<Things>;
  disabled: boolean;
}) {
  return (
    <>
      <TextInput
        name={"uuid"}
        readOnly
        required={!properties.uuid.type.includes("null")}
        inputRef={refs.uuid}
        description={properties.uuid.description}
        defaultValue={initial.uuid}
      ></TextInput>
      <TextInput
        name={"name"}
        required={!properties.name.type.includes("null")}
        inputRef={refs.name}
        description={properties.name.description}
        defaultValue={initial.name}
        readOnly={disabled}
      ></TextInput>
      <TextInput
        name={"description"}
        required={!properties.description.type.includes("null")}
        inputRef={refs.description}
        description={properties.description.description}
        defaultValue={initial.description}
        readOnly={disabled}
      ></TextInput>
      <TextInput
        name={"properties"}
        required={!properties.properties.type.includes("null")}
        inputRef={refs.properties}
        description={properties.properties.description}
        defaultValue={initial.properties}
        readOnly={disabled}
      ></TextInput>
    </>
  );
}
function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<Things>) {
  /**
   * Input field handles.
   */
  const refs = useRefs();
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: refs.uuid.current?.value,
      name: refs.name.current?.value || undefined,
      description: refs.description.current?.value || undefined,
      properties: refs.properties.current?.value || undefined,
    };
  };
  return (
    <FormContainer
      onSubmit={onSubmit(onSubmitCallback)}
      formRef={formRef}
      action={action}
      disabled={disabled}
    >
      <Fields refs={refs} disabled={disabled} initial={initial}></Fields>
    </FormContainer>
  );
}
// Fields displayed when <details/> element is expanded
export function AdditionalProperties(thing: Initial<Things>) {
  return (
    <>
      <li>description: {thing.description ?? "n/a"}</li>
      <li>properties: {thing.properties ?? "n/a"}</li>
    </>
  );
}