import React from "react";
import useBathysphereApi from "../../hooks/useBathysphereApi";

/**
 * Account is a page-level component. 
 * 
 * If we have information that indicates the user has 
 * registered previously, we want to render
 * a login interface. 
 * 
 * If the user is logged in already, we can try to get 
 * account data and render that. 
 * 
 * Otherwise, assume that they need to create an account.
 * 
 */
const Account = () => {

    const {} = useBathysphereApi({})

    return <></>
}

export default Account