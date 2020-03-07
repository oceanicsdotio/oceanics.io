import React from "react"
import { Link } from "gatsby"
import Header from "./header"

import { rhythm, scale } from "../utils/typography"
import NavBar from "./NavBar"

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props
    const rootPath = `${__PATH_PREFIX__}/`

    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <Header siteTitle={"Oceanicsdotio"}/>
        <NavBar />
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
