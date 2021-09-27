/**
 * React and friends.
 */
import React, {FC} from "react";
import Image from "next/image";
import Layout from "oceanics-io-ui/build/components/Layout/Layout";
import Head from "next/head";

/**
 * Page content, could be externalized in `data/`.
 */
const CONTENT = {
  title: "404",
  message: "You can't get there from here.",
  img: "/dagan-sprite.gif"
};

/**
 * Just a dumb functional component.
 */
const PageNotFound: FC<{}> = () => {
  return (
    <Layout
        description={"404"}
        title={CONTENT.title}
        HeadComponent={Head}
    >  
      <p>{CONTENT.message}</p>
      <Image 
        src={CONTENT.img} 
        alt={"Sea creature seeking answers"} 
        width={"100%"} 
        height={"100%"}
      />
    </Layout>
  )
};

PageNotFound.displayName = "404"
export default PageNotFound;