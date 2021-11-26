import type {MutableRefObject} from "react";

export type FileObject = {
    key: string;
    updated: string;
    size: string; 
}

export type FileSystem = {
    objects: FileObject[];
    collections: {
        key: string;
    }[];
};

export type WorkerRef = MutableRefObject<Worker|null>