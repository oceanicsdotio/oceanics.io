"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import layout from "@app/layout.module.css";
import type { Observations } from "@oceanics/app";
const { title } = specification.components.schemas.Observations;
interface IObservations extends Omit<Observations, "free"> {

}
/**
 * Item level component
 */
function Observation({ uuid, name }: IObservations) {
  const href = `/.netlify/functions/entity/?left=${title}&left_uuid=${uuid}`;
  return (
    <>
      <hr />
      <p key={uuid}>
        <Link className={layout.link} href={href} prefetch={false}>
          {name}
        </Link>
      </p>
      <p>uuid: {uuid}</p>
      <p>name: {name}</p>
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
        <code>{title}</code>.
      </p>
      <p>{message}</p>
      {collection.map((each: IObservations) => {
        return <Observation key={each.uuid} {...each}></Observation>;
      })}
    </div>
  );
}
