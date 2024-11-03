"use client";
import specification from "@app/../specification.json";
import type { FeaturesOfInterest } from "@oceanics/app";
import { NamedNode, useCollection } from "@catalog/client";
interface IFeaturesOfInterest extends Omit<FeaturesOfInterest, "free"> {}
const components = specification.components;
import React, { useEffect, useRef } from "react";
import style from "@catalog/page.module.css";
import {TextInput} from "@catalog/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { title, properties } = specification.components.schemas.FeaturesOfInterest;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function FeaturesOfInterestForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: {
  action: string;
  initial: IFeaturesOfInterest;
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
      </form>
  );
}

/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function ({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, disabled, onGetCollection } = useCollection({
    left: title,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  useEffect(()=>{
    if (!disabled) onGetCollection()
  }, [disabled])
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: Omit<FeaturesOfInterest, "free">) => {
        return (
          <NamedNode key={uuid} uuid={uuid} name={rest.name}>
            <p>description: {rest.description ?? "n/a"}</p>
            <p>encoding type: {rest.encodingType ?? "n/a"}</p>
            <p>feature: {rest.feature ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </div>
  );
}
