import React, { ReactNode, type MouseEventHandler } from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";


interface IDocumentContent {
  onClickLabel: (label: string) => MouseEventHandler<HTMLAnchorElement>;
  className: string;
  document: any;
  children: ReactNode;
}

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections. This is used
 * by whatever template renders MDX or other static data
 * into webpages.
 */
export default function Layout ({
  children,
}: IDocumentContent) {
  // const timestamp = metadata.published
  //   .toISOString()
  //   .replace(/T/, " ")
  //   .replace(/Z/, "");

  return (
    <article>
      <header>
        {/* <h2>
          {metadata.labels.map(({ value }: {value: string}) => (
            <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>
              {value}
            </a>
          ))}
        </h2>
        <p>{metadata.description}</p> */}
      </header>
      <section>{children}</section>
    </article>
  );
};
