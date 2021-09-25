/**
 * React and friends.
 */
import React, {useCallback} from "react";
import {useRouter} from "next/router";
import Image from "next/image";

/**
 * Campaign component
 */
import Campaign, { PageData } from "oceanics-io-ui/build/components/Campaign/Campaign";
import Index from "oceanics-io-ui/build/components/References/Index";


type QueryParams = {
    items?: number;
    tag?: string;
    reference?: number;
};

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
  data
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
        onClickTag={(tag: string) => () => {navigate("/", {tag})}}
        onClickMore={() => {navigate("/", {items: Number(router.query.items??0) + 3})}}
        onClearAll={()=>{router.push("/")}}
        data={data}
      />
    </>
  )
};

export default IndexPage;
