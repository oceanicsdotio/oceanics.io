import {useEffect, useState} from "react";

/**
 * Detect whether the browser user agent string is present
 * and matches known mobile devices.
 */
export default () => {

    const [mobile, setMobile] = useState(false);

    useEffect(()=>{
        const userAgent =
            typeof navigator === "undefined" ? "" : navigator.userAgent;
            
        setMobile(Boolean(
            userAgent.match(
                /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
            )
        ));
          
    },[]);

    return {mobile}
}