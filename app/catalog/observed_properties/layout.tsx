import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link className={layout.link} href={"/catalog/observed_properties/"}>
        ObservedProperties
      </Link>
      <div className={layout.content}>{children}</div>
    </>
  );
}
