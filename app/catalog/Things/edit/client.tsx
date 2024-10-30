"use client";
import React, { useEffect, useState } from "react";
import openapi from "@app/../specification.json";
import { Linking, useCollection } from "@catalog/client";
import {
  ThingsForm,
  useWebAssembly,
  type IThings,
} from "@catalog/things/client";
import { useSearchParams } from "next/navigation";
export const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Things;
const parameters = openapi.components.parameters;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  const { message, disabled, collection, onSubmitCreate, create } =
    useCollection({
      left: schema.title,
      limit: parameters.limit.schema.default,
      offset: parameters.offset.schema.default,
    });
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  const [initial, setInitial] = useState<IThings>({
    uuid,
    name: "",
  });
  useEffect(() => {
    if (!collection) return;
    const [node] = collection as IThings[];
    setInitial(node);
  }, [collection]);
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
      <Linking {...schema}></Linking>
    </>
  );
}
