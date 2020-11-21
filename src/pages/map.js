
import React from "react"
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Map from "../components/Map";
import style from "../../static/style.yml";
import layers from "../../static/layers.yml";

export default ({
    data: {
        site: {
            siteMetadata: { title }
        }
    },
    location,
}) => {
    return (
        <Layout 
            expand={true}
            location={location} 
            title={title}
        >
            <SEO title="Ocean analytics as a service" />
            <Map 
                style={style} 
                layers={layers} 
                accessToken={'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q'}/>
        </Layout>
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
