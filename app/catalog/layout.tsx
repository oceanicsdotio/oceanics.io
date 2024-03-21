import React from "react";
import styles from "@app/layout.module.css";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.content}>
      <h1><Link className={styles.link} href="/catalog">Catalog</Link></h1>
      {children}
    </div>
  );
}
