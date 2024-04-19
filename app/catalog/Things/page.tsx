"use client";
import layout from "@app/layout.module.css";
import Link from "next/link";
import React, {useState} from "react";
import Markdown from "react-markdown";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import styles from "@app/layout.module.css"
const {
  Things: { properties, description, title: left },
} = specification.components.schemas;
const links = getLinkedCollections(properties);
type Thing = {
  uuid: string;
  name: string;
  description: string;
  properties: string;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
function Thing({
  thing:{
    uuid,
    name,
    description,
    properties
  },
  onDelete,
}: {
  thing: Thing;
  onDelete: (uuid: string) => void;
}) {
  const url = `/.netlify/functions/entity/?left=${left}&left_uuid=${uuid}`;
  const [showDetails, setShowDetails] = useState(false);
  function onDetails() {
    setShowDetails(prev => !prev);
  }
  return (
    <div>
      <hr />
      <h3>
        <Link className={styles.link} href={url} prefetch={false}>{name}</Link>
      </h3>
      {showDetails && 
        <div>
          <p>uuid: {uuid}</p>
          <p>name: {name}</p>
          <p>description: {description??"n/a"}</p>
          <p>properties: {properties??"n/a"}</p>
        </div>
      }
      <div>
        <button onClick={onDetails}>Details</button>
        <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
      </div>
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
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href={"create/"}>
          create
        </Link>{" "}
        <code>Things</code>, and link them to {links}.
      </p>
      <p>{message}</p>
      {collection.map((thing: Thing) => {
        return (
          <Thing key={thing.uuid} onDelete={onDelete} thing={thing}></Thing>
        );
      })}
    </>
  );
}
