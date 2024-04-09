"use client";
import Link from "next/link";
import React from "react";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "../useCollection";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
const { properties, description } =
  specification.components.schemas.DataStreams;
const links = getLinkedCollections(properties);
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "DataStreams";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function DataStreams({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({ left });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can link <code>DataStreams</code> to {links}
      </p>
      <p>{message}</p>
      {collection.map((each: { uuid: string; name: string }) => {
        return (
          <p key={each.uuid}>
            <Link href={each.uuid}>{each.name}</Link>
          </p>
        );
      })}
    </div>
  );
}
