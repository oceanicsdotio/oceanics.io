import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Create } from "@catalog/observations/client";
const schema = specification.components.schemas.Observations;
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
      <Suspense>
        <Create></Create>
      </Suspense>
    </>
  );
}
