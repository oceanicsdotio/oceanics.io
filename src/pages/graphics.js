import React from "react"
import { graphql } from "gatsby"

import SEO from "../components/seo"
import Map from "../components/Map"


export default class extends React.Component {

    render() {

        return (
            <>
                <SEO title={"Graphics Demo"} />
                <Map />
            </>
        )   
    }
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`


