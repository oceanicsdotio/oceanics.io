import React from "react"
import { Link, graphql } from "gatsby"
import Layout from "../components/layout"
import SEO from "../components/seo"
import Map from "../components/map"
import PropTypes from "prop-types"


class MapPage extends React.Component {
  render() {
    const { data } = this.props;
    const siteTitle = data.site.siteMetadata.title;
    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title="Discover data" />
        <Map />
      </Layout>
    )
  }
}

MapPage.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
  }),
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