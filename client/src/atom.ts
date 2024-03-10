import { atom } from "jotai";

export const showSongMenuAtom = atom(false);
export const currentSongAtom = atom<CurrentSong | null | undefined>(undefined);
export const isPlayingAtom = atom(false);
export const playlistAtom = atom<Playlist>([]);
export const queueAtom = atom<Queue>([]);
export const firstQueueSongAtom = atom<string | null>(null);
export const durationAtom = atom<number>(-1);
export const currentTimeAtom = atom<number>(0);

export enum REPEAT {
    DISABLED,
    PLAYLIST,
    CURRENT,
}

export const settingsAtom = atom<Settings | null>(null);

export interface IAlbum {
    id: string;
    title: string;
    artist: {
        id: string;
        name: string;
    };
    year: number;
    cover: string;
}

export interface ISong {
    id: string;
    title: string;
    playtime: string;
    source: string;
    cover: string;
}

export type Playlist = (IAlbum & { songs: ISong[] })[];

export type FullSongDetails = ISong & {
    album: IAlbum;
};

export type CurrentSong = FullSongDetails;
export type Queue = FullSongDetails[];

export type Settings = {
    shuffle: boolean;
    repeat: REPEAT;
    currentSongId: string | null;
};
