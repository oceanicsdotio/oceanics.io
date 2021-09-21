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
import useQueryString from "oceanics-io-ui/build/hooks/useQueryString.js";
const ITEM_INCREMENT = 3;

const DEFAULTS = {
    items: ITEM_INCREMENT,
    tag: "",
    reference: 0
}

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
  location: {
    search
  },
  data
}) => {
  const router = useRouter();
  const navigate = useCallback((route) => {
      router.push(route)
  }, [router])
  /**
   * Search string query parameters
   */
  const { query, navigateWithQuery } = useQueryString(search, DEFAULTS, navigate);
  
  return (
    <>
      <Image src={"/shrimpers-web.png"} alt={"agents at rest"} width={"100%"}/>
      <Campaign
        navigate={navigate}
        title={PageData.title}
        campaign={PageData.campaigns[1]}
      />
      <Index
        query={query}
        onClickTag={(tag: string) => () => {navigateWithQuery({tag})}}
        onClickMore={() => {navigateWithQuery({items: query.items + 3})}}
        onClearAll={()=>{navigate("/")}}
        data={data}
      />
    </>
  )
};

export default IndexPage;
