import type {MutableRefObject} from "react";
export const shared = "Some shared variable";

export interface SharedWorkerGlobalScope {
    onconnect: (event: MessageEvent) => void;
  }

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