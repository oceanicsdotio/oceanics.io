import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import Collection from "@app/catalog/historical_locations/client";
const components = specification.components;
const { title } = components.schemas.HistoricalLocations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <div>
      <p>
        You can <Link href="create/" prefetch={false}>create</Link> <code>{title}</code>
      </p>
      <Collection></Collection>
    </div>
  );
}
