import React from "react"
import { Link, navigate } from "gatsby"
import {
  IdentityModal,
  useIdentityContext,
} from "react-netlify-identity-widget"
import "react-netlify-identity-widget/styles.css" // delete if you want to bring your own CSS

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
        borderBottom: "1px solid rebeccapurple",
        backgroundColor: "aliceblue",
        marginBottom: `1.45rem`,
      }}
    >

      <nav>

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
