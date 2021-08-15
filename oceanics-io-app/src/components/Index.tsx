/**
 * React and friends.
 */
import React, { useState, useEffect, FC, RefObject } from "react";

/**
 * Component-level styling.
 */
import styled from "styled-components";


import ReactDOM from "react-dom";
import { Popup } from "mapbox-gl";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "oceanics-io-ui/build/components/Catalog/PopUpContent";
import Catalog from "oceanics-io-ui/build/components/Catalog/Catalog"

/**
 * Dedicated Worker loader.
 */
import useWasmWorkers from "../hooks/useWasmWorkers";
import useFragmentQueue from "../hooks/useFragmentQueue";
import useMapBox from "../hooks/useMapBox";
import ControlPane from "../components/ControlPane";


type ApplicationType = {
    location: {
        search: string;
    };
    mobile: boolean;
    worker: {
        worker: RefObject<any>;
        status: {
            ready: boolean;
        }
    }
}


/**
 * Page component rendered by GatsbyJS.
 */
const AppPage: FC<ApplicationType> = ({
    mobile,
    location: {
        search
    },
    worker: {
        worker,
        status
    }
}) => {
    /**
     * Set map full screen
     */
    const [expand, setExpand] = useState(false);

    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const { map, ref, zoom } = useMapBox({ expand });

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(() => {
        if (map) map.resize();
    }, [expand]);

    /**
     * Data sets to queue and build layers from.
     */
    const [queue, setQueue] = useState([]);

    /**
     * Reorder data sets as they are added.
     */
    const [channelOrder, setChannelOrder] = useState([]);

    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !queue || !worker.current || !status.ready) return;


        const callback = (id, source, layer, onClick) => {
            map.addLayer({ id, source, ...layer });
            if (onClick) map.on('click', id, onClick);
        }

        queue.filter(x => !map.getLayer(x)).forEach(({
            id,
            behind,
            standard = "geojson",
            url = null,
            component = null,
            attribution = null,
            ...layer
        }) => {

            setChannelOrder([...channelOrder, [id, behind]]);

            worker.current.getData(url, standard).then(source => {

                if (attribution) source.attribution = attribution;

                const onClick = !component ? null : ({ features, lngLat: { lng, lat } }) => {

                    const reduce = (layer.type === "circle" || layer.type === "symbol");

                    const projected = reduce ? features.map(({ geometry: { coordinates }, ...props }) => {
                        while (Math.abs(lng - coordinates[0]) > 180)
                            coordinates[0] += lng > coordinates[0] ? 360 : -360;
                        return {
                            ...props,
                            coordinates
                        }
                    }) : features;

                    worker.current.reduceVertexArray(
                        reduce ? projected : [{ coordinates: [lng, lat] }]
                    ).then(coords => {

                        const placeholder = document.createElement('div');

                        ReactDOM.render(
                            <PopUpContent features={projected} component={component} />,
                            placeholder
                        );

                        (new Popup({
                            className: "map-popup",
                            closeButton: false,
                            closeOnClick: true
                        })
                            .setLngLat(coords.slice(0, 2))
                            .setDOMContent(placeholder)
                        ).addTo(map)
                    });
                }

                callback(id, source, layer, onClick);

            }).catch(err => {
                console.log(`Error loading ${id}`, err);
            });
        });

    }, [queue, worker.current, status]);

    /**
     * Swap layers to be in the correct order as they are created. Will
     * only trigger once both layers exist.
     * 
     * Nice because you can resolve them asynchronously without worrying 
     * about creation order.
     */
    useEffect(() => {
        channelOrder.forEach(([back, front]) => {
            if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front)
        });
    }, [channelOrder]);


    /**
     * Use the worker to create the point feature for the user location.
     */
    useEffect(() => {
        if (!map || !worker.current || !location) return;

        worker.current.userLocation([
            location.coords.longitude,
            location.coords.latitude
        ]).then(source => {
            map.addLayer(source);
        });
    }, [worker, location, map]);

    /**
     * Pan to user location immediately.
     */
    useEffect(() => {
        if (map && location)
            map.panTo([location.coords.longitude, location.coords.latitude]);
    }, [location, map]);

    /**
     * Create home animation image
     */
    useEffect(() => {
        if (!map || map.hasImage("home")) return;
        map.addImage("home", pulsingDot({ size: 32 }));
    }, [map]);

    /**
     * Assume that on mobile the user will want to see the map
     * rather than our loading Jenk.
     */
    useEffect(() => {
        setExpand(mobile);
    }, [mobile]);


    return <div className={className} {...{ mobile, expand }}>
        <div
            row={0}
            column={0}
            display={!columnSize({ expand, mobile, column: 0 }) ? "none" : undefined}
        >
            <ControlPane search={search} />
        </div>
        <div
            row={0}
            column={1}
            display={!columnSize({ expand, mobile, column: 1 }) ? "none" : undefined}
        >
            <StyledMap ref={ref} />
        </div>
        <div
            display={!columnSize({ expand, mobile, column: 2 }) ? "none" : undefined}
            row={0}
            column={2}
        >
            <Catalog geojson={geojson} zoomLevel={zoom} queue={queue} setQueue={setQueue} />
        </div>
    </div>
};

/**
 * Styled version of page exported by default.
 */
const StyledIndex = styled(AppPage)`

    display: grid;
    grid-gap: 0;
    grid-template-columns: ${props =>
        `${columnSize({ ...props, column: 0 })}fr ${columnSize({ ...props, column: 1 })}fr`
    };
    grid-auto-rows: minmax(5rem, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;

    & canvas {
        image-rendering: crisp-edges;
        width: 90%;
        margin: auto;
    }

`;


/**
 * App component is the container for the grid/column
 * view of interface elements, depending on whether the user is
 * on desktop or mobile.
 * 
 * There is no tablet specific view at this time. 
 */
 const App = styled.div`
 display: grid;
 grid-gap: 0;
 grid-template-columns: ${props =>
     `auto ${columnSize({ ...props, column: 1 })}fr ${columnSize({ ...props, column: 2 })}fr`
 };
 grid-auto-rows: minmax(5rem, auto);
 margin: 0;
 padding: 0;
 height: 100vh;
 width: auto;
 overflow-y: clip;
`;

/**
* The div component holds one or more Mini-Apps.
*/
const div = styled.div`
 display: ${({ display }) => display};
 grid-row: ${({ row }) => row + 1};
 grid-column: ${({ column }) => column + 1};
 overflow-x: hidden;
 overflow-y: ${({ column }) => column !== 1 ? undefined : "hidden"};
 min-height: 100vh;
 bottom: 0;
 background-color: ${charcoal};

 & .logo {
     width: 100%;
     image-rendering: crisp-edges;
 }
`;

export default StyledIndex;
