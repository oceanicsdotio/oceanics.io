import React from "react";
import styles from "@app/layout.module.css";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.content}>
      <Link className={styles.link} href="/catalog">Catalog</Link>
      {children}
    </div>
  );
}
