"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import useCreate, {TextInput} from "@catalog/useCreate";

const { properties, title: left, description } = specification.components.schemas.Locations;
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
  const _description = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLSelectElement | null>(null);
  const locationType = useRef<HTMLInputElement | null>(null);
  const locationCoordinates = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCreate({
    left,
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      encodingType: encodingType.current?.value,
      location: {
        type: locationType.current?.value,
        coordinates: locationCoordinates.current?.value
      }
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={crypto.randomUUID()}
        ></TextInput>
        <TextInput
          name={"name"}
          inputRef={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          inputRef={_description}
          required
          description={properties.description.description}
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
          name={"locationType"}
          inputRef={locationType}
          description={properties.location.properties.type.description}
        ></TextInput>
        <TextInput
          name={"locationCoordinates"}
          inputRef={locationCoordinates}
          description={properties.location.properties.coordinates.description}
        ></TextInput>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
