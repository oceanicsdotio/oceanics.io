import React from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Create } from "@app/catalog/observed_properties/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const schema = specification.components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function({}) {
  /**
   * Server Component
   */
  return (
    <>
      <Markdown>{schema.description}</Markdown>
      <Create/>
    </>
  );
}
