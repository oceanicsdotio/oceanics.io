import React, { ReactNode } from "react";
import type { MouseEventHandler } from "react";
import styled from "styled-components";

const REFERENCE = "reference";

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
export const Document = ({
  className,
  document: {
    metadata: { references = [], ...metadata },
  },
  children,
  onClickLabel,
}: IDocumentContent) => {
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

/**
 * Styled version of the Document or resource, only adjusts
 * type setting, all other styling is left to Layout and
 * the parent component.
 */
const StyledDocument = styled(Document)`
  & header {
    & a + a::before {
      content: " / ";
    }
    & h2 {
      font-size: large;
      margin: 0.25em 0;
    }
  }
  & a {
    & img {
      width: 1rem;
      margin-left: 0.2rem;
    }
  }
  .${REFERENCE} {
    margin: 1em 0;
  }
`;

Document.displayName = "Document";
export default StyledDocument;
