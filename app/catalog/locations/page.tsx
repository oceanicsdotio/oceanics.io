"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import {components} from "@app/../specification.json";
import type {Locations as LocationsType} from "@oceanics/app";
import layout from "@app/layout.module.css";
const {title} = components.schemas.Locations;
interface ILocations extends Omit<LocationsType, "free"> {
  location: any
}
/**
 * Item level component
 */
function Location({uuid, name}: ILocations) {
  return (
    <p>
      <Link className={layout.link} href={uuid}>{name}</Link>
    </p>
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
    const {collection, message} = useCollection({left: title});
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {collection.map((each: ILocations) => {
        return <Location key={each.uuid} {...each}></Location>;
      })}
    </div>
  );
}
