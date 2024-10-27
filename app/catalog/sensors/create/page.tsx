import React, { Suspense } from "react";
import { Create } from "@catalog/sensors/client";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  /**
   * Server Component
   */
  return (
    <Suspense>
      <Create />
    </Suspense>
  );
}
