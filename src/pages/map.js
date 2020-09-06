
import React, { useEffect, useState } from "react"
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Map from "../components/Map";

export default ({data: {site: {siteMetadata: {title}}}, location}) => {
    
    const [mapData, setMapData] = useState(null);
    
    useEffect(() => {
        /*
        Fetch static configuration data for using Mapbox. This includes JSON descriptions
        of the map style, and the data layers. 
        */
        (async () => {
            setMapData({
                style: await fetch("/style.json").then(r => r.json()),
                layers: await fetch("/layers.json").then(r => r.json())
            });
        })();
    }, []); 

    
    return (
      <Layout location={location} title={title}>
        <SEO title="Ocean analytics as a service" /> 
        { mapData ? <Map {...mapData}/> : null}
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
    allMarkdownRemark {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            tags
            description
          }
        }
      }
    }
  }
`
