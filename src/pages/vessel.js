
import React, {useReducer} from "react"
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Schedule from "../components/Schedule";


export default ({
    data: {
        site: {
            siteMetadata: { title }
        }
    },
    location,
}) => {

    const [fullscreen, setFullscreen] = useReducer((prev)=>{
        return !prev;
    }, false);

    return !fullscreen ? (
        <Layout location={location} title={title}>
            <SEO title={"Ocean analytics as a service"} />
            <Schedule days={2} callback={setFullscreen}/>
        </Layout>
    ) : (
        <>
            <SEO title={"Ocean analytics as a service"} />
            <Schedule days={2} callback={setFullscreen}/>
        </>
    )
};

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
