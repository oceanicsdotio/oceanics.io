import React from "react"
import { useIdentityContext } from "react-netlify-identity-widget"

const Settings = () => {
  const { user } = useIdentityContext()
  return (
    <>
      <h1>Settings</h1>
      <ul>
        <li>Name: {user.user_metadata && user.user_metadata.full_name}</li>
        <li>E-mail: {user.email}</li>
        <li>Credits: {58}</li>
      </ul>
    </>
  )
}

export default Settings
