"use client";
import layout from "@app/layout.module.css";
import Link from "next/link";
import React from "react";
import Markdown from "react-markdown";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
const { Things } = specification.components.schemas;
const links = getLinkedCollections(Things.properties);
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "Things";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function Thing({
  thing,
  onDelete,
}: {
  thing: any;
  onDelete: (uuid: string) => void;
}) {
  const url = `/.netlify/functions/entity/?left=Things&left_uuid=${thing.uuid}`;
  return (
    <div>
      <p>{thing.name}</p>
      <Link href={`/.netlify/functions/entity/?left=Things&left_uuid=${thing.uuid}`}>{url}</Link>
      <button onClick={onDelete.bind(undefined, thing.uuid)}>Delete</button>
    </div>
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
   * Client Component.
   */
  return (
    <>
      <Markdown>{Things.description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href={"create"}>
          create
        </Link>{" "}
        <code>Things</code>, and link them to {links}.
      </p>
      <p>{message}</p>
      {collection.map((each: { uuid: string; name: string }, index) => {
        return (
          <Thing
            key={`${Things.title}-${index}`}
            onDelete={onDelete}
            thing={each}
          ></Thing>
        );
      })}
    </>
  );
}
