import React, { Suspense } from "react";
import {Linking} from "@catalog/client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.Locations;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Update", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <Suspense>
      <Linking {...schema}></Linking>
    </Suspense>
  );
}
