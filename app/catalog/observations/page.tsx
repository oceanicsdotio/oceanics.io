"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import layout from "@app/layout.module.css";
import type { Observations } from "@oceanics/app";
const { title } = specification.components.schemas.Observations;
interface IObservations extends Omit<Observations, "free"> {
  onDelete: (uuid: string) => void
}
/**
 * Item level component
 */
function Observation({ uuid, onDelete }: IObservations) {
  const href = `/.netlify/functions/entity/?left=${title}&left_uuid=${uuid}`;
  return (
    <>
      <hr />
      <p key={uuid}>
        <Link className={layout.link} href={href} prefetch={false}>
          {uuid}
        </Link>
      </p>
      <button onClick={onDelete.bind(undefined, uuid??"")}>Delete</button>
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
  const { collection, message, onDelete } = useCollection({
    left: title, 
    limit: specification.components.parameters.limit.schema.default,
    offset: specification.components.parameters.offset.schema.default
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
      {collection.map((each: Omit<Observations, "free">) => {
        return <Observation key={each.uuid} {...each} onDelete={onDelete}></Observation>;
      })}
    </div>
  );
}
