import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
import Markdown from "react-markdown";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={"/catalog/data_streams"}
        prefetch={false}
      >
        {schema.title}
      </Link>
      <Markdown>{schema.description}</Markdown>
      <div className={layout.content}>{children}</div>
    </>
  );
}
