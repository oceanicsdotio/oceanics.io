import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layout.content}>
      <Link className={layout.link} href={"/"} prefetch={false}>
        Home
      </Link>
      {"/"}
      <Link className={layout.link} href="/catalog" prefetch={false}>
        Catalog
      </Link>
      {children}
    </div>
  );
}
