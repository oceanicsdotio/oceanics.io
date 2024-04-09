"use client";
import Link from "next/link";
import React from "react";
import { components } from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import Markdown from "react-markdown";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "FeaturesOfInterest";
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function FeaturesOfInterest({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const {collection, message} = useCollection({left});
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{components.schemas.FeaturesOfInterest.description}</Markdown>
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
