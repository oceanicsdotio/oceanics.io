import React from "react"

import { navigate } from "gatsby"
import { useIdentityContext } from "react-netlify-identity-widget"

import { Router } from "@reach/router"
import Layout from "../components/Layout"
import Settings from "./settings"
import Main from "./main"

const App = () => {
  return (
    <>

    <Layout>
      <Router>
        <PrivateRoute path="/app/" component={Main} />
        <PrivateRoute path="/app/settings" component={Settings} />
      </Router>
    </Layout>
    </>
  )
}


function PrivateRoute(props) {
  const { isLoggedIn } = useIdentityContext()
  const { component: Component, location, ...rest } = props

  React.useEffect(
    () => {
      if (!isLoggedIn && location.pathname !== `/`) {
        // If the user is not logged in, redirect to the login page.
        navigate(`/`)
      }
    },
    [isLoggedIn, location]
  )
  return isLoggedIn ? <Component {...rest} /> : null
}

function PublicRoute(props) {
  return <div>{props.children}</div>
}

export default App
