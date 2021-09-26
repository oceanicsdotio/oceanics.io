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
import type {Document} from "oceanics-io-ui/build/components/References/types";
import type {GetStaticProps} from "next";
import {readAllMarkdownContent} from "../next-util";


type QueryParams = {
    items?: number;
    tag?: string;
    reference?: number;
};

interface IIndexPage {
    documents: Document[];
}

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage: FC<IIndexPage> = ({
  documents
}) => {
  const router = useRouter();
  const navigate = useCallback((pathname: string, insert?: QueryParams) => {
    router.push({
      pathname,
      query: {...router.query, ...(insert||{})}
    })
  }, [router]);

  return (
    <>
      <Image src={"/shrimpers-web.png"} alt={"agents at rest"} width={"100%"}/>
      <Campaign
        navigate={navigate}
        title={PageData.title}
        campaign={PageData.campaigns[1]}
      />
      <Index
        query={router.query}
        onShowMore={() => {navigate("/", {items: Number(router.query.items??0) + 3})}}
        onClearConstraints={()=>{router.push("/")}}
        documents={documents}
      />
    </>
  )
};

export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
    return {props: {
        documents: readAllMarkdownContent()
    }}
}
