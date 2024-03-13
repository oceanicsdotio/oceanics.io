import { Metadata } from "next";
import Link from "next/link";
import styles from "@styles/layout.module.css"

export const metadata: Metadata = {
  title: "Out of the Blue | E-mail verification error",
  description: "There was a problem with our servers.",
};

export default function Page() {
  return (
    <>
      <h2>Something is wrong with our server.</h2>
      <p>
        Not ideal, but we'll fix it. It would help if you <Link className={styles.link} href="/about-us">could let us
        know about the problem.</Link>
      </p>
    </>
  );
}
