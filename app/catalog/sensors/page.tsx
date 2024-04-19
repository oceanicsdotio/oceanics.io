"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type {Sensors} from "@oceanics/app";
interface ISensors extends Omit<Sensors, "free"> {};
const { title: left } = specification.components.schemas.Sensors;
/**
 * Item level component
 */
function Sensor({ uuid, name, description }: ISensors) {
  let href = `/.netlify/functions/entity/?left=${left}&left_uuid=${uuid}`;
  return (
    <>
      <p key={uuid}>
        <Link href={href}>{name}</Link>
      </p>
      <p>uuid: {uuid}</p>
      <p>name: {name}</p>
      <p>description: {description}</p>
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
  const { collection, message } = useCollection({ left });
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map((each: ISensors) => {
        return <Sensor key={each.uuid} {...each}></Sensor>;
      })}
    </div>
  );
}
