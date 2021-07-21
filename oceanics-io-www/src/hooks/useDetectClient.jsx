/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Localization settings.
 */
const GEOLOCATION = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
}

/**
 * Effect results in object containing metadata about the
 * client and location.
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

    /**
     * User location to be obtained from Geolocation API.
     */
    const [ location, setLocation ] = useState(null);
    
    /**
     * Get the user location and 
     */
    useEffect(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            setLocation, 
            () => { console.log("Error getting client location.") },
            GEOLOCATION
        );
    }, []);


    return {
        mobile: mobile,
        location: location
    }

}