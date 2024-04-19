import React from "react";
import Link from "next/link";
import layout from "../../layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
    {"/"}
    <Link className={layout.link} href={"/catalog/observations/"}>
      Observations
    </Link>
    {children}
  </>
  );
}
