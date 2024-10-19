"use client";
import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import Markdown from "react-markdown";
import layout from "@app/layout.module.css";
import type { FeaturesOfInterest as FeatureType } from "@oceanics/app";
interface IFeaturesOfInterest extends Omit<FeatureType, "free"> {
  feature?: any,
  onDelete: (uuid: string) => void
};
const { title: left, description } = specification.components.schemas.FeaturesOfInterest;
/**
 * Item level component 
 */
function FeatureOfInterest ({name, uuid, description, encodingType, feature, onDelete}: IFeaturesOfInterest) {
  const href = `/.netlify/functions/entity/?left=${left}&left_uuid=${uuid}`;
  return (
    <>
      <hr/>
      <p>
        <Link className={layout.link} href={href} prefetch={false}>{name}</Link>
      </p>
      <button onClick={onDelete.bind(undefined, uuid)}>Delete</button>
      <p>uuid: {uuid}</p>
      <p>name: {name}</p>
      <p>description: {description??"n/a"}</p>
      <p>encoding type: {encodingType??"n/a"}</p>
      <p>feature: {feature??"n/a"}</p>
    </>
  )
}
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message, onDelete } = useCollection({
    left, 
    limit: specification.components.parameters.limit.schema.default,
    offset: specification.components.parameters.offset.schema.default
  });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can <Link href={"create/"} className={layout.link}>create</Link>{" "}
        <code>{left}</code>.
      </p>
      <p>{message}</p>
      {collection.map((each: Omit<FeatureType, "free">) => {
        return <FeatureOfInterest key={each.uuid} {...each} onDelete={onDelete}/>
        ;
      })}
    </div>
  );
}
