"use client"
import React, { useState } from "react";
import openapi from "@app/../specification.json";
import { type IThings, ThingsForm } from "@catalog/things/client";
import { v7 as uuid7 } from "uuid"
import { useCollection } from "@app/catalog/client";
export const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const parameters = openapi.components.parameters;
const schema = openapi.components.schemas.Things;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, disabled, onSubmitCreate, create } =
    useCollection({
      left: schema.title,
      limit: parameters.limit.schema.default,
      offset: parameters.offset.schema.default,
    });
  const [ initial ] = useState<IThings>({
    uuid: uuid7(),
    name: "",
  })
  return (
    <>
      <p>{message}</p>
      <ThingsForm
        action={action}
        create={create}
        disabled={disabled}
        onSubmit={onSubmitCreate}
        initial={initial}
      />
    </>
  );
}
