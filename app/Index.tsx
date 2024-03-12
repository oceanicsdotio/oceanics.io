"use client";

import React, {useState, useEffect} from "react";
import Oceanside, {StyledCanvasPlaceholder, type ApplicationType} from "../src/components/Oceanside/Oceanside";


export default function Index({...props}: ApplicationType) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return (
        <div>
            {isClient ? <Oceanside {...props}/> : <StyledCanvasPlaceholder/>}
        </div>
    )
}