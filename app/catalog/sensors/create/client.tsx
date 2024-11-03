"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { useCreate } from "@catalog/client";
import { SensorsForm } from "@catalog/sensors/client";
const action = "Create";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Sensors;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, form } = useCreate(schema.title);
  return (
    <>
      <p>{message}</p>
      <SensorsForm action={action} {...form} />
    </>
  );
}
