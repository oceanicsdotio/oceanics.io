import React from "react"
import { Link } from "gatsby"

export default function Navigation() {
  return (
    <div
      style={{
        display: "flex",
        flex: "1",
        justifyContent: "space-between",
        borderBottom: "1px solid #d1c1e0",
      }}
    >
      <span>You are not logged in</span>

      <nav>
        <Link to="/">Logout</Link>
      </nav>
    </div>
  )
}