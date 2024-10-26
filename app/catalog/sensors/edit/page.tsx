"use client";
import React, {  Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import Linked from "@catalog/Linked";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Sensors;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{schema.description}</Markdown>
      <Suspense>
        <Linked {...schema}></Linked>
      </Suspense>
    </>
  );
}
