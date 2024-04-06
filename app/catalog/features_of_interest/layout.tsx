import React from "react";
import Link from "next/link";
import layout from "../../layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>{"/"}
      <Link className={layout.link} href={"/catalog/features_of_interest/"}>
        FeaturesOfInterest
      </Link>
      {children}
    </>
  );
}
