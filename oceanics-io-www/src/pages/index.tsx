/**
 * React and friends.
 */
import React, {useCallback, FC} from "react";
import {useRouter} from "next/router";
import Image from "next/image";

/**
 * Campaign component
 */
import Campaign, { PageData } from "oceanics-io-ui/build/components/Campaign/Campaign";
import Index from "oceanics-io-ui/build/components/References/Index";
import Layout from "oceanics-io-ui/build/components/Layout/Layout";
import type {IDocumentIndexSerialized, QueryType} from "oceanics-io-ui/build/components/References/types";
import type {GetStaticProps} from "next";
import {readAllMarkdownContent} from "../next-util";
import useDeserialize from "../hooks/useDeserialize";
import Head from "next/head";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage: FC<IDocumentIndexSerialized> = ({
  documents
}) => {
    const deserialized = useDeserialize(documents)
  const router = useRouter();
  const navigate = useCallback((pathname: string, insert?: QueryType) => {
    router.push({
      pathname,
      query: {...router.query, ...(insert||{})}
    })
  }, [router]);

  return (
    <Layout
        description={"The trust layer for the blue economy."}
        title={'Blue computing'}
        HeadComponent={Head}
    >
      {/* <Image 
        src={"/shrimpers-web.png"} 
        alt={"agents at rest"} 
        layout="fill"
        objectFit="contain"
        /> */}
      <Campaign
        navigate={navigate}
        title={PageData.title}
        campaign={PageData.campaigns[1]}
      />
      <Index
        query={router.query}
        onShowMore={() => {navigate("/", {items: Number(router.query.items??0) + 3})}}
        onClearConstraints={()=>{router.push("/")}}
        documents={deserialized}
      />
    </Layout>
  )
};

IndexPage.displayName = "Index";
export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
    return {
        props: {documents: readAllMarkdownContent()}
    }
}
