export const shared = 'Some shared variable';


export type FileSystem = {
    objects: {
        key: string;
        updated: string;
        size: string;
    }[];
    collections: {
        key: string;
    }[];
};