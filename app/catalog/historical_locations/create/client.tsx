"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { Form } from "../client";
import { Initial, useCreate } from "@catalog/client";
import type {HistoricalLocations} from "@oceanics/app"
const action = "Create";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.HistoricalLocations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, form } = useCreate<Initial<HistoricalLocations>>(schema.title);
  return (
    <>
      <p>{message}</p>
      <Form action={action} {...form as any}/>
    </>
  );
}
