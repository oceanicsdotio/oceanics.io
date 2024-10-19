"use client";
import layout from "@app/layout.module.css";
import Link from "next/link";
import React, {useState} from "react";
import Markdown from "react-markdown";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type { Things } from "@oceanics/app";
import styles from "@app/layout.module.css"
interface IThings extends Omit<Things, "free"> {};
const {
 properties, description, title: left,
} = specification.components.schemas.Things;
const links = getLinkedCollections(properties);
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
  thing: IThings;
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
  const { collection, message, onDelete } = useCollection({ left, 
    limit: specification.components.parameters.limit.schema.default,
    offset: specification.components.parameters.offset.schema.default });
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
      {collection.map((thing: IThings) => {
        return (
          <Thing key={thing.uuid} onDelete={onDelete} thing={thing}></Thing>
        );
      })}
    </>
  );
}
