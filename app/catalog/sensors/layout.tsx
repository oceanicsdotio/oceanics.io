import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.Sensors;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link className={layout.link} href={"/catalog/sensors/"}>
        {schema.title}
      </Link>
      <div className={layout.content}>
        {children}
      </div>
    </>
  );
}
