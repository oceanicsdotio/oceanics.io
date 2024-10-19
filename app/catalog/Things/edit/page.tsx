"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import {TextSelectInput} from "@catalog/useCreate";
/**
 * OpenAPI schema information used in the interface.
 */
const { properties, title: left, description } = specification.components.schemas.Things;

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Connect({}) {
  /**
   * Form data is synced with user input
   */
  const neighborType = useRef<HTMLSelectElement | null>(null);
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <p>{"! Update Not Implemented"}</p>
      <hr />
      <form
        className={style.form}
      >
        <TextSelectInput
          name={"neighborType"}
          inputRef={neighborType}
          defaultValue={"Locations"}
          description={"The type of neighboring node to connect to"}
          options={["Locations"]}
        />
        <button className={style.submit} disabled={true}>
          Update Thing
        </button>
      </form>

    </>
  );
}
