/**
 * React and friends.
 */
import React, {FC} from "react";
import Layout from "oceanics-io-ui/build/components/Layout/Layout";
import Head from "next/head";

/**
 * Just a dumb functional component.
 */
const PageNotFound: FC<{}> = () => {
  return (
    <Layout
        description={"404"}
        title={"Oceanics.io"}
        HeadComponent={Head}
    >  
      <p>{"You can't get there from here."}</p>
      <img src={"/dagan-sprite.gif"} alt={"Sea creature seeking answers"} width={"100%"}/>
    </Layout>
  )
};

PageNotFound.displayName = "404"
export default PageNotFound;