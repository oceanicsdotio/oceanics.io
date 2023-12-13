import { useCallback } from "react";
import { useRouter } from "next/router";
/**
 * Query string parameters used by the Index component to filter
 * which documents are visible. Actual parsing of URL is done in the
 * calling application.
 */
export type QueryType = {
    items?: number;
    label?: string;
    reference?: number;
};

const useNextRouter = () => {
   
    const router = useRouter();
    
    /**
     * Use next router, and merge query parameters.
     */
    const navigate = useCallback((
        pathname: string,
        insert?: QueryType,
        merge = true
    ) => {
        const query = { ...(merge ? router.query : {}), ...(insert ?? {}) }
        router.push({ pathname, query });
    }, [router]);

    const home = useCallback((label: string) => () => {
        navigate("/", {label}, true)
    }, [navigate])

    return {
        navigate,
        router,
        home
    }
};


export default useNextRouter;