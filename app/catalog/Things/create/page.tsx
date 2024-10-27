import React from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { ThingsForm } from "@catalog/things/client";
/**
 * Get Things properties from OpenAPI schema
 */
const { description } = specification.components.schemas.Things;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <ThingsForm
        limit={100}
        offset={0}
        initial={{
          uuid: crypto.randomUUID(),
          name: "",
        }}
      />
    </>
  );
}
