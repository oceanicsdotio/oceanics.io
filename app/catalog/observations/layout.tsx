import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.json";
import Markdown from "react-markdown";
const schema = openapi.components.schemas.Observations;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link className={layout.link} href={"/catalog/observations/"}>
        {schema.title}
      </Link>
      <div className={layout.content}>
        <Markdown>{schema.description}</Markdown>
        {children}
      </div>
    </>
  );
}
