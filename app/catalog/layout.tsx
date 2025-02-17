import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";
import Script from "next/script";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layout.content}>
      <Script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></Script>
      <div style={{"textAlign":"right"}} data-netlify-identity-button></div>
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
