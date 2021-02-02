import { useEffect, useState } from "react";

/**
 * Detect whether the browser user agent string is present
 * and matches known mobile devices.
 */
export default () => {

    /**
     * Boolean indicating whether the device is a small mobile,
     * or full size desktop.
     */
    const [ mobile, setMobile ] = useState(false);

    /**
     * "Guess" the type of device based on known user agent string.
     * 
     * This is disclosed in the website privacy policy. 
     */
    useEffect(() => {
        const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
            
        setMobile(Boolean(
            userAgent.match(
                /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
            )
        ));
          
    }, [ ]);

    return { mobile }
}