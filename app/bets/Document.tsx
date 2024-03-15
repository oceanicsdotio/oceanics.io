import React, { ReactNode, type MouseEventHandler } from "react";

interface IDocumentContent {
  onClickLabel: (label: string) => MouseEventHandler<HTMLAnchorElement>;
  className: string;
  document: any;
  children: ReactNode;
}

/**
 Include inline links for references in markdown.
 Min required for unique hashing
 */
export const Inline = (
  // props: {
  //   parenthesis: boolean;
  //   authors: string[];
  //   published: number;
  //   title: string;
  // }
) => {
  // const doc = new Memo({
  //   metadata: {
  //     ...props,
  //     published: new Date(props.published, 0, 1).toISOString(),
  //     labels: [],
  //     description: "",
  //     publication: "",
  //     volume: "",
  //     pages: [],
  //   },
  // });
  // return <a href={`#${doc.hash}`}>{doc.inline()}</a>;
  return <></>
};

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections. This is used
 * by whatever template renders MDX or other static data
 * into webpages.
 */
export default function Document ({
  className,
  document: {
    metadata: { references = [], ...metadata },
  },
  children,
  onClickLabel,
}: IDocumentContent) {
  const timestamp = metadata.published
    .toISOString()
    .replace(/T/, " ")
    .replace(/Z/, "");

  return (
    <article className={className}>
      <header>
        <h2>{timestamp}</h2>
        <h2>
          {metadata.labels.map(({ value }: {value: string}) => (
            <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>
              {value}
            </a>
          ))}
        </h2>
        <p>{metadata.description}</p>
      </header>
      <hr />
      <section>{children}</section>
      <hr />
      {references.map((ref: any) => (
        <div key={ref.hash} className={className}>
          <a id={ref.hash} />
          {ref.reference}
          <a href={`/?reference=${ref.hash}`}>
            <img src="/favicon.ico" />
          </a>
        </div>
      ))}
    </article>
  );
};
