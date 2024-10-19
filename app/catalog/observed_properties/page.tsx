"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import {components} from "@app/../specification.json";
import layout from "@app/layout.module.css";
import type { ObservedProperties } from "@oceanics/app";
import Markdown from "react-markdown";
import { NamedNode } from "../Node";
/**
 * Get schema metadata from the OpenAPI specification.
 */
const { title: left, description } =
  components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, onDelete } = useCollection({
    left,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href="create/">
          create
        </Link>{" "}
        <code>{left}</code>.
      </p>
      <p>{message}</p>
      {collection.map(({uuid, ...rest}: Omit<ObservedProperties, "free">) => {
        return (
          <NamedNode key={uuid} name={rest.name} left_uuid={uuid} onDelete={onDelete}>
            <p>description: {description}</p>
          </NamedNode>
        )
      })}
    </div>
  );
}
