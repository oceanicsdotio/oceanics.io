import React, { Suspense } from "react";
import { Metadata } from "next";
import { DataStreamsForm } from "@catalog/data_streams/client";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
const action = "Create";
/**
 * Browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `${action} ${schema.title}. ${schema.description}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <Suspense>
      <DataStreamsForm action={action}></DataStreamsForm>
    </Suspense>
  );
}
