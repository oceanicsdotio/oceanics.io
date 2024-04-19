"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import useCreate, {TextInput} from "@catalog/useCreate";

const { Observations } = specification.components.schemas;
const { properties } = Observations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCreate({
    left: Observations.title,
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{Observations.description}</Markdown>
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
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
