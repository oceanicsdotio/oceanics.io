export const shared = 'Some shared variable';

export interface SharedWorkerGlobalScope {
    onconnect: (event: MessageEvent) => void;
  }

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