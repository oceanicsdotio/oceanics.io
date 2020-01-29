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
        <Link to={props.to}>{props.children}</Link>
      </li>
    )


    header = (
      <h3
        style={{
          fontFamily: `Montserrat, sans-serif`,
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
          <ListLink to="/tools/">Tools</ListLink>
          <ListLink to="/workshops/">Workshops</ListLink>
          <ListLink to="/about/">About</ListLink>
          <ListLink to="mailto:business@oceanics.io">Contact</ListLink>
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
            Funded in part by Maine EPSCoR (NSF #1355457)
          </p>
          <p>
            <a>Accessibility</a>
          </p>
          <p>
            <a>Code of conduct</a>
          </p>
          <p>
            <a>Privacy</a>
          </p>

          <p>
            <a>Data management</a>
          </p>



        </footer>
      </div>
    )
  }
}

export default Layout
