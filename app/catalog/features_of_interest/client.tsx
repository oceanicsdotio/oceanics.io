"use client";
import React from "react";
import specification from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import type { FeaturesOfInterest } from "@oceanics/app";
import { NamedNode } from "@app/catalog/Node";
const { title: left } =
  specification.components.schemas.FeaturesOfInterest;
const components = specification.components;
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Collection({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({
    left,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: Omit<FeaturesOfInterest, "free">) => {
        return (
          <NamedNode key={uuid} uuid={uuid} name={rest.name}>
            <p>description: {rest.description ?? "n/a"}</p>
            <p>encoding type: {rest.encodingType ?? "n/a"}</p>
            <p>feature: {rest.feature ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </div>
  );
}
