"use client";
import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import Markdown from "react-markdown";
import layout from "@app/layout.module.css";
import type { FeaturesOfInterest as FeatureType } from "@oceanics/app";
import { NamedNode } from "../Node";
const { title: left, description } =
specification.components.schemas.FeaturesOfInterest;
const components = specification.components
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
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
        <Link href={"create/"} className={layout.link}>
          create
        </Link>{" "}
        <code>{left}</code>.
      </p>
      <p>{message}</p>
      {collection.map(({ uuid, ...rest }: Omit<FeatureType, "free">) => {
        return (
          <NamedNode
            key={uuid}
            left_uuid={uuid}
            onDelete={onDelete}
            name={rest.name}
          >
            <p>description: {description ?? "n/a"}</p>
            <p>encoding type: {rest.encodingType ?? "n/a"}</p>
            <p>feature: {rest.feature ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </div>
  );
}
