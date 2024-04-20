"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import { components } from "@app/../specification.json";
import type { HistoricalLocations } from "@oceanics/app";
import layout from "@app/layout.module.css";
const { title } = components.schemas.HistoricalLocations;
interface IHistoricalLocations extends Omit<HistoricalLocations, "free"> {}
/**
 * Item level component
 */
function HistoricalLocation({
  historicalLocation: { uuid, time },
  onDelete,
}: {
  historicalLocation: IHistoricalLocations;
  onDelete: (uuid: string) => void;
}) {
  return (
    <>
      <hr />
      <p>
        <Link href={uuid}>{uuid}</Link>
      </p>
      <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
      <p>uuid: {uuid}</p>
      <p>time: {time}</p>
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
  const { collection, message, onDelete } = useCollection({
    left: title,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <p>
        You can{" "}
        <Link className={layout.link} href="create/">
          create
        </Link>{" "}
        <code>{title}</code>
      </p>
      <p>{message}</p>
      {collection.map((each: IHistoricalLocations) => {
        return (
          <HistoricalLocation
            key={each.uuid}
            historicalLocation={each}
            onDelete={onDelete}
          ></HistoricalLocation>
        );
      })}
    </div>
  );
}
