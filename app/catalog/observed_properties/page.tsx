"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import layout from "@app/layout.module.css";
import type { ObservedProperties } from "@oceanics/app";
import Markdown from "react-markdown";
/**
 * Get schema metadata from the OpenAPI specification.
 */
const { title: left, description } = specification.components.schemas.ObservedProperties;
/**
 * Derive the the type we expect from the WebAssembly bindings.
 */
interface IObservedProperties extends Omit<ObservedProperties, "free"> {
  onDelete: (uuid: string) => void;
}
/**
 * Item level component
 */
function ObservedProperty({
  uuid,
  name,
  description,
  onDelete,
}: IObservedProperties) {
  const href = `/.netlify/functions/entity/?left=${left}&left_uuid=${uuid}`;
  return (
    <>
      <hr />
      <p key={uuid}>
        <Link className={layout.link} href={href} prefetch={false}>
          {name}
        </Link>
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
  const { collection, message, onDelete } = useCollection({
    left,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link className={layout.link} href="create/">
          create
        </Link>{" "}
        <code>{left}</code>.
      </p>
      <p>{message}</p>
      {collection.map((each: Omit<ObservedProperties, "free">) => {
        return (
          <ObservedProperty
            key={each.uuid}
            {...each}
            onDelete={onDelete}
          ></ObservedProperty>
        );
      })}
    </div>
  );
}
