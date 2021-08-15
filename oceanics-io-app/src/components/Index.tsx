/**
 * React and friends.
 */
import React, { useMemo, FC, RefObject } from "react";

/**
 * Component-level styling.
 */
import styled from "styled-components";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import Catalog from "oceanics-io-ui/build/components/Catalog/Catalog";
import {LayerType} from "oceanics-io-ui/build/components/Catalog/LayerCard";
import Pane from "./Pane";
import {columnSize} from "../utils";

/**
 * Dedicated Worker loader.
 */
// import useWasmWorkers from "../hooks/useWasmWorkers";
// import useFragmentQueue from "../hooks/useFragmentQueue";
// @ts-ignore
import useMapBox from "../hooks/useMapBox";
// @ts-ignore
import useSelectChannels from "../hooks/useSelectChannels";
import ControlPane from "../components/ControlPane";


type ApplicationType = {
    className?: string;
    location: {
        coords: {
            latitude: string;
            longitude: string;
        };
    };
    mobile: boolean;
    worker: {
        worker: RefObject<any>;
        status: {
            ready: boolean;
        };
    };
    channels: {
        geojson: LayerType[];
    };
    expand: boolean;
    mapbox: {
        accessToken: string;
        defaults: {
            zoom: number;
        };
    };
    query: object;
};
    


/**
 * Page component rendered by GatsbyJS.
 */
const AppPage: FC<ApplicationType> = ({
    className,
    mobile,
    location,
    worker,
    channels: {
        geojson
    },
    expand,
    mapbox,
    query
}) => {
    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const { ref, zoom } = useMapBox({ expand, ...mapbox });
    const { tiles, icons, queue, setQueue } = useSelectChannels({worker, location});

    const panes = useMemo(() => {
        return [
            <ControlPane 
                query={query}
                worker={worker}
                static={{
                    oceanside: {tiles},
                    icons: {icons}
                }}
            />,
            <div ref={ref} />,
            <Catalog 
                geojson={geojson}
                zoomLevel={zoom} 
                queue={queue} 
                setQueue={setQueue} 
            />
        ]
    }, [ref]);

    return <div className={className}>
        {panes.map((children: JSX.Element, index: number) => (
            <Pane
                row={0}
                column={index}
                expand={expand}
                mobile={mobile}
            >{children}</Pane>)
        )}
    </div>
};

/**
 * Styled version of page exported by default.
 */
const StyledIndex = styled(AppPage)`
    display: grid;
    grid-gap: 0;
    grid-template-columns: ${(props: ApplicationType): string =>
        `${columnSize({ ...props, column: 0 })}fr ${columnSize({ ...props, column: 1 })}fr`
    };
    grid-auto-rows: minmax(5rem, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;
`;

export default StyledIndex;