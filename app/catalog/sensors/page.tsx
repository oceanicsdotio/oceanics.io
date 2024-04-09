"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "Sensors";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Sensors({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({ left });
  /**
   * Client Component
   */
  return (
    <div>
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
