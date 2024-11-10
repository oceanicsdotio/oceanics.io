"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { Form } from "../client";
import { Create } from "@catalog/client";
import { type Observations } from "@oceanics/app";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  return <Create<Observations> Form={Form} title={schema.title}></Create>;
}
