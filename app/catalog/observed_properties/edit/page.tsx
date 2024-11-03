import React, { Suspense } from "react";
import {Linking} from "@catalog/client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Page browser metadata
 */
export const metadata: Metadata = {
  title: `${openapi.info.title} | ${schema.title}`,
  description: `Update ${schema.title}. ${schema.description}`,
};
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
