"use client";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type { Observations } from "@oceanics/app";
import { NamedNode } from "../Node";
type IObservations = Omit<Observations, "free">;
const components = specification.components;
const { title } = components.schemas.Observations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({
    left: title,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid }: IObservations) => {
        return (
          <NamedNode key={uuid} uuid={uuid as any} name={undefined}></NamedNode>
        );
      })}
    </>
  );
}
