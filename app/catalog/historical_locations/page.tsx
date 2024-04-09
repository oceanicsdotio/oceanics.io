"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "HistoricalLocations";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
    /**
   * Retrieve node data use Web Worker.
   */
    const {collection, message} = useCollection({left});
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map((each: { uuid: string; name: string }) => {
        return (
          <p key={each.uuid}>
            <Link href={each.uuid}>{each.name ?? each.uuid}</Link>
          </p>
        );
      })}
    </div>
  );
}
