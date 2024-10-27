import React from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Create } from "@catalog/sensors/client";
const { description } = specification.components.schemas.Sensors;
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
      <Markdown>{description}</Markdown>
      <Create/>
    </>
  );
}
