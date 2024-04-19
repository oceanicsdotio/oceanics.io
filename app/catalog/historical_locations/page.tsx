"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import { components } from "@app/../specification.json";
import type {HistoricalLocations} from "@oceanics/app";
const { title } = components.schemas.HistoricalLocations;
/**
 * Item level component
 */
function HistoricalLocation({ uuid }: HistoricalLocations) {
  return (
    <>
      <p>
        <Link href={uuid}>{uuid}</Link>
      </p>
      <p>uuid: {uuid}</p>
    </>
  );
}
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
  });
  /**
   * Client Component
   */
  return (
    <div>
      <p>
        You can <Link href="create/">create</Link>{" "}
        <code>{title}</code>
      </p>
      <p>{message}</p>
      {collection.map((each: HistoricalLocations) => {
        return (
          <HistoricalLocation key={each.uuid} {...each}></HistoricalLocation>
        );
      })}
    </div>
  );
}
