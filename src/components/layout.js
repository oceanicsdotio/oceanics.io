import React from "react"
import { Link } from "gatsby"

import { rhythm, scale } from "../utils/typography"

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props
    const rootPath = `${__PATH_PREFIX__}/`
    let header

    const ListLink = props => (
      <li style={{ display: `inline-block`, marginRight: `1rem` }}>
        <Link {...props}>{props.children}</Link>
      </li>
    )

    const ListLinkExternal = props => (
      <li style={{ display: `inline-block`, marginRight: `1rem` }}>
        <a href={props.href}>{props.children}</a>
      </li>
    )

    header = (
      <h3
        style={{
          marginTop: 0,
        }}
      >
        <Link
          style={{
            boxShadow: `none`,
            textDecoration: `none`,
            color: `inherit`,
          }}
          to={`/`}
        >
          {title}
        </Link>
        <ul style={{ listStyle: `none`, float: `right` }}>
          <ListLinkExternal href={"https://graph.oceanics.io"}>Bathysphere API</ListLinkExternal>
          <ListLink to={"tags"}>Tags</ListLink>
        </ul>
      </h3>
    )

    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <header>{header}</header>
        <main>{children}</main>
        <footer>
          <hr/>
          <p>
            Copyleft 2018-{new Date().getFullYear()}. No rights reserved.
          </p>
          <p>
            Funded in part by Maine EPSCoR (NSF #1355457) and the LSU Board of Regents.
          </p>
          <p>
            <a href={"/code-of-conduct"}>Code of conduct</a>
          </p>
          <p>
            <a href={"/privacy-policy"}>Privacy policy</a>
          </p>

        </footer>
      </div>
    )
  }
}

export default Layout
