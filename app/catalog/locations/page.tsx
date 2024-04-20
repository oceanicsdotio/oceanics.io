"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import {components} from "@app/../specification.json";
import type {Locations as LocationsType} from "@oceanics/app";
import layout from "@app/layout.module.css";
import Markdown from "react-markdown";
const {title: left, description} = components.schemas.Locations;
interface ILocations extends Omit<LocationsType, "free"> {
  onDelete: (uuid: string) => void
}
/**
 * Item level component
 */
function Location({uuid, name, description, encodingType, location, onDelete}: ILocations) {
  return (
    <>
    <hr />
     <p>
      <Link className={layout.link} href={uuid}>{name}</Link>
    </p>
    <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
    <p>uuid: {uuid}</p>
    <p>name: {name}</p>
    <p>description: {description??"n/a"}</p>
    <p>encoding type: {encodingType??"n/a"}</p>
    <p>location:</p>
    <p>{`   type: ${location?.type??"n/a"}`}</p>
    <p>{`   coordinates: ${location?.coordinates??"n/a"}`}</p>
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
    const {collection, message, onDelete} = useCollection({left});
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>You can <Link className={layout.link} href="create/">create</Link> <code>{left}</code></p>
      <p>{message}</p>
      {collection.map((each: ILocations) => {
        return <Location key={each.uuid} {...each} onDelete={onDelete}></Location>;
      })}
    </div>
  );
}
