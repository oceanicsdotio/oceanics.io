import { useCallback } from "react";
import { useRouter } from "next/router";
import type { QueryType } from "../components/References/types";

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