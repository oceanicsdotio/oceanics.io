"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type {Sensors} from "@oceanics/app";
import Markdown from "react-markdown";
import layout from "@app/layout.module.css";
interface ISensors extends Omit<Sensors, "free"> {
  onDelete: (uuid: string) => void
};
const { title: left, description } = specification.components.schemas.Sensors;
/**
 * Item level component
 */
function Sensor({ uuid, name, description, onDelete }: ISensors) {
  let href = `/.netlify/functions/entity/?left=${left}&left_uuid=${uuid}`;
  return (
    <>
      <hr />
      <p key={uuid}>
        <Link className={layout.link} href={href} prefetch={false}>{name}</Link>
      </p>
      <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
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
  const { collection, message, onDelete } = useCollection({ left });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>You can <Link href="create/" className={layout.link}>create</Link> <code>{left}</code>.</p>
      <p>{message}</p>
      {collection.map((each: ISensors) => {
        return <Sensor key={each.uuid} {...each} onDelete={onDelete}></Sensor>;
      })}
    </div>
  );
}
