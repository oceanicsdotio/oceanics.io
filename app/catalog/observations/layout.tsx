import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
    {"/"}
    <Link className={layout.link} href={"/catalog/observations/"}>
      Observations
    </Link>
    <div className={layout.content}>{children}</div>
  </>
  );
}
