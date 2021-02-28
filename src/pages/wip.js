import React from "react";
import useShipyard from "../hooks/useShipyard";

export default () => {

    const {ref} = useShipyard({shape: []});

    return <canvas ref={ref}/>
}