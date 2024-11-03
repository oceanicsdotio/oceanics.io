"use client";
import React from "react";
import OpenAPI from "@app/../specification.json";
import { useUpdate } from "@catalog/client";
import { FeaturesOfInterestForm } from "../client";
import style from "@catalog/page.module.css";
export const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.FeaturesOfInterest;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, form, onDelete } = useUpdate(schema.title);
  return (
    <>
      <p>{message}</p>
      <FeaturesOfInterestForm action={action} {...form} initial={form.initial as any}/>
      <button className={style.submit} onClick={onDelete}>
        Delete
      </button>
    </>
  );
}
