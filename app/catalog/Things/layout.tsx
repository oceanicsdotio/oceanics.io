import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        style={{ display: "inline-block" }}
        href={"/catalog/things/"}
      >
        Things
      </Link>
      <>{children}</>
    </>
  );
}
