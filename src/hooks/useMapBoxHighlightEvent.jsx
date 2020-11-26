import {useEffect} from "react";
/*
Highlight layers

When the cursor position intersects with the space
defined by a feature set, set the hover state to true.

When the cursor no longer intersects the shapes, stop
highlighting the features. 
*/
export default ({ready, map, source}, featureIds=null) => {

    useEffect(() => {
        // Highlight closures on hover
        if (!ready) return;

        map.on('mousemove', source, (e) => {
            if (e.features.length > 0) {
                (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: false })});
                featureIds = e.features.map(feature => feature.id);
                (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: true })});
            }
        });
            
        map.on('mouseleave', source, () => {
            (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: false })});
            featureIds = [];
        });
       
    }, [ready]);
};