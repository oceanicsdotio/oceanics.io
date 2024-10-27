"use client";
import React, { useRef } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import {TextSelectInput} from "@catalog/useCreate";
/**
 * OpenAPI schema information used in the interface.
 */
const { description } = specification.components.schemas.Locations;
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
          defaultValue={"Things"}
          description={"The type of neighboring node to connect to"}
          options={["Things", "HistoricalLocations"]}
        />
        <button className={style.submit} disabled={true}>
          Update Location
        </button>
      </form>

    </>
  );
}
