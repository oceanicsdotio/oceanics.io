"use client";
import layout from "@app/layout.module.css";
import Link from "next/link";
import React from "react";
import Markdown from "react-markdown";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type { Things } from "@oceanics/app";
import {NamedNode} from "@app/catalog/Node";
interface IThings extends Omit<Things, "free"> {}
const {
  properties,
  description,
  title: left,
} = specification.components.schemas.Things;
const { parameters } = specification.components;
const links = getLinkedCollections(properties);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data using Web Worker.
   */
  const { collection, message, onDelete } = useCollection({
    left,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
  });
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
      {collection.map(({uuid, ...thing}: IThings) => {
        return (
          <NamedNode key={uuid} name={thing.name} left_uuid={uuid} onDelete={onDelete}>
            <p>uuid: {uuid}</p>
            <p>description: {thing.description ?? "n/a"}</p>
            <p>properties: {thing.properties ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </>
  );
}
