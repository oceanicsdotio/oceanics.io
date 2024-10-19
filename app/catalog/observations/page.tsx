"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import {components} from "@app/../specification.json";
import layout from "@app/layout.module.css";
import type { Observations } from "@oceanics/app";
import { NamedNode } from "../Node";
const { title } = components.schemas.Observations;

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, onDelete } = useCollection({
    left: title, 
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default
  });
  /**
   * Client Component
   */
  return (
    <div>
      <p>
        You can <Link className={layout.link} href="create/">create</Link>{" "}
        <code>{title}</code>.
      </p>
      <p>{message}</p>
      {collection.map(({uuid}: Omit<Observations, "free">) => {
        return (
        <NamedNode key={uuid} left_uuid={uuid as any} name={undefined} onDelete={onDelete}>
          <p>[placeholder]</p>
        </NamedNode>
        );
      })}
    </div>
  );
}
