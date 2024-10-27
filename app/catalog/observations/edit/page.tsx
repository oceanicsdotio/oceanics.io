import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import {Linking} from "@catalog/client";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Observations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Connect({}) {
  /**
   * Server component
   */
  return (
    <Suspense>
      <Linking {...schema}></Linking>
    </Suspense>
  );
}
