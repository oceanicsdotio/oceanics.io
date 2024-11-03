"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { ObservedPropertiesForm } from "@catalog/observed_properties/client";
import { useCreate } from "@catalog/client";
const action = "Create";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, form } = useCreate(schema.title);
  return (
    <>
      <p>{message}</p>
      <ObservedPropertiesForm action={action} {...form} />
    </>
  );
}
