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
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const {collection, message} = useCollection({left});
  /**
   * Client Component
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
          <p key={`${Things.title}-${index}`}>
            <Link href={each.uuid}>{each.name}</Link>
          </p>
        );
      })}
    </>
  );
}
