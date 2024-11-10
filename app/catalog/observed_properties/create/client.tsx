"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { Form } from "../client";
import { type ObservedProperties } from "@oceanics/app";
import { Create } from "@catalog/client";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  return (
    <Create<ObservedProperties> Form={Form} title={schema.title}/>
  );
}
