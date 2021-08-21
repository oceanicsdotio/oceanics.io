/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Compile time type checking
 */
type LocationConfig = {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
};
type OptionalLocation = GeolocationPosition|null;
type ClientData = {
    mobile: boolean;
    location: OptionalLocation;
};

/**
 * Mobile detection string
 */
const MATCH_MOBILE = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i

/**
 * Localization settings.
 */
const GEOLOCATION: LocationConfig = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
}

/**
 * Effect results in object containing metadata about the
 * client and location.
 */
export default (): ClientData => {
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
        setMobile(Boolean((navigator?.userAgent ?? "").match(MATCH_MOBILE)));
    }, [ ]);

    /**
     * User location to be obtained from Geolocation API.
     */
    const [ location, setLocation ] = useState<OptionalLocation>(null);

    /**
     * Get the user location and 
     */
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            setLocation, 
            () => { console.error("Error getting client location.") },
            GEOLOCATION
        );
    }, []);


    return {
        mobile: mobile,
        location: location
    }

}