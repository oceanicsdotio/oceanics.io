"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { Create } from "@catalog/client";
import { Form } from "../client";
import { type Sensors } from "@oceanics/app";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Sensors;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  return <Create<Sensors> Form={Form} title={schema.title} />;
}
