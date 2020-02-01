import React from "react"
import { graphql } from "gatsby"
import PropTypes from "prop-types"
import Layout from "../components/layout"
import Table from "../components/table"
import SEO from "../components/seo"

const state = {
  order: "time",
  records: [{
    "time": "2019-01-01 05:00:00",
    "product": "lobster",
    "weight": 101,
    "price": 5.63
  },{
    "time": "2019-01-02 05:00:00",
    "product": "lobster",
    "weight": 150,
    "price": 4.76
  },{
    "time": "2019-01-04 05:00:00",
    "product": "lobster",
    "weight": 132,
    "price": 3.97
  },{
    "time": "2019-01-04 05:00:00",
    "product": "crab",
    "weight": 54,
    "price": 1.20
  }],
  schema: [{
    "label": "time",
    "type": "datetime",
  }, {
    "label": "product",
    "type": "string",
  }, {
    "label": "weight",
    "type": "float",
    parse: (x) => {return parseFloat(x)}
  }, {
    "label": "price",
    "type": "currency",
    format: (x) => {return `$${x.toFixed(2)}`},
    parse: (x) => {return parseFloat(x.replace("$", ""))}
  }]
}

export default class TablePage extends React.Component {
  render() {
    const { data } = this.props;
    const siteTitle = data.site.siteMetadata.title;
    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title="Situational awareness for a changing ocean" />
        <Table {...state} />
      </Layout>
    )
  }
}

TablePage.propTypes = {
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