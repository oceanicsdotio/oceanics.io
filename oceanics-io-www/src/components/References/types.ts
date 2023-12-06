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

