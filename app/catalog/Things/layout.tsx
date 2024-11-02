import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import OpenAPI from "@app/../specification.json";
/**
 * Static metadata from OpenAPI spec
 */
const title = OpenAPI.components.schemas.Things.title;
/**
 * Layer the navigation links in nested layouts.
 */
export default function({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        style={{ display: "inline-block" }}
        href={`/catalog/${title.toLowerCase()}/`}
      >
        {title}
      </Link>
      <div className={layout.content}>
        {children}
      </div>
    </>
  );
}
