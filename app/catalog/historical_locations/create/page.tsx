import React, { Suspense } from "react";
import { Create } from "@catalog/historical_locations/client";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
      <Suspense><Create></Create></Suspense>
  );
}
