"use client";
import React from "react";
import openapi from "@app/../specification.json";
import { LocationsForm as Form } from "../client";
import { Locations } from "@oceanics/app";
import { Create } from "@catalog/client";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Locations;
export default function ({}) {
  return (
    <Create<Locations> Form={Form} title={schema.title}/>
  );
}
