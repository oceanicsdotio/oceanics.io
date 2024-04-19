"use client";
import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import useCollection from "@catalog/useCollection";
import Markdown from "react-markdown";
import layout from "@app/layout.module.css";
import type { FeaturesOfInterest as FeatureType } from "@oceanics/app";
interface IFeaturesOfInterest extends Omit<FeatureType, "free"> {
  feature: any
};
const { FeaturesOfInterest } = specification.components.schemas;
/**
 * Item level component 
 */
function FeatureOfInterest ({name, uuid, description, encodingType}: IFeaturesOfInterest) {
  const href = `/.netlify/functions/entity/?left=${FeaturesOfInterest.title}&left_uuid=${uuid}`;
  return (
    <div key={uuid}>
      <hr/>
      <Link href={href} prefetch={false}>{name}</Link>
      <p>uuid: {uuid}</p>
      <p>name: {name}</p>
      <p>description: {description??"n/a"}</p>
      <p>encoding type: {encodingType??"n/a"}</p>
    </div>
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
  const { collection, message } = useCollection({
    left: FeaturesOfInterest.title,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{FeaturesOfInterest.description}</Markdown>
      <p>
        You can <Link href={"create/"} className={layout.link}>create</Link>{" "}
        <code>{FeaturesOfInterest.title}</code>.
      </p>
      <p>{message}</p>
      {collection.map((each: IFeaturesOfInterest) => {
        return <FeatureOfInterest key={each.uuid} {...each}/>
        ;
      })}
    </div>
  );
}
