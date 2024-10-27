import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Create } from "@catalog/historical_locations/client";

const { description } = specification.components.schemas.HistoricalLocations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <Suspense><Create></Create></Suspense>
    </>
  );
}
