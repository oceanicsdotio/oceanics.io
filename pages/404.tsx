import React from "react";
import type { GetStaticProps } from "next";
import type { ILayout } from "./_app";

export const getStaticProps = (async () =>{
  return {
    props: {
      meta: {
        title: "Oceanics.io",
        description: "404",
      },
    },
  }}) satisfies GetStaticProps<{
    meta: ILayout
}>;

const PageNotFound = () => {
  return (
    <>
      <p>{"You can't get there from here."}</p>
      <img
        src={"/assets/dagan-sprite.gif"}
        alt={"Sea creature seeking answers"}
        width={"100%"}
      />
    </>
  );
};

PageNotFound.displayName = "404";
export default PageNotFound;
