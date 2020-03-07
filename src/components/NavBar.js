import React from "react"
import { Link, navigate } from "gatsby"
import {
  IdentityModal,
  useIdentityContext,
} from "react-netlify-identity-widget"
import "react-netlify-identity-widget/styles.css" // delete if you want to bring your own CSS



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

function Login() {
  const identity = useIdentityContext()
  const [dialog, setDialog] = React.useState(false)
  return (
    <>
      <button onClick={() => setDialog(true)}>login</button>
      <IdentityModal
        showDialog={dialog}
        onCloseDialog={() => setDialog(false)}
        onLogin={user => navigate("/app/")}
        onSignup={user => navigate("/app/")}
      />
    </>
  )
}


export default () => {
  const { user, isLoggedIn, logoutUser } = useIdentityContext()
  console.log(user);
  let message = isLoggedIn
    ? `${user.email}`
    : ""

  return (
    <div
      style={{
        display: "block",
        width: "100%",
        justifyContent: "space-between",
        textAlign: "right",
        background: "none",
        marginBottom: `1.45rem`,
      }}
    >

      <nav>
        <ListLinkExternal href={"https://graph.oceanics.io"}>Bathysphere API</ListLinkExternal>
        <ListLink to={"tags"}>Tags</ListLink>

        {
          isLoggedIn ? (
            <Link to="/app/">console</Link>
          ) : (
            <></>
          )
        }

        {` `}

        {
           isLoggedIn ? (
            <Link to="/app/settings">{isLoggedIn ? message: ``}</Link>
          ) : (
             <></>
            )
        }

        {` `}

        {isLoggedIn ? (
          <a
            href="/"
            onClick={async event => {
              event.preventDefault()
              await logoutUser()
              navigate(`/`)
            }}
          >
            logout
          </a>
        ) : (
          Login()
        )}
      </nav>
    </div>
  )
}
