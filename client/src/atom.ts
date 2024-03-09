import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const showSongMenuAtom = atom(false);
export const currentSongAtom = atom<CurrentSong | null>(null);
export const isPlayingAtom = atom(false);
export const playlistAtom = atom<Playlist>([]);
export const queueAtom = atom<Queue>([]);
export const firstQueueSongAtom = atom<string | null>(null);

export enum REPEAT {
    DISABLED,
    PLAYLIST,
    CURRENT,
}

export const settingsAtom = atomWithStorage<Settings>("settings", {
    shuffle: false,
    repeat: REPEAT.DISABLED,
    currentSongId: null,
});

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
}

export type CurrentSong = FullSongDetails;
export type Queue = FullSongDetails[];

export type Settings = {
    shuffle: boolean;
    repeat: REPEAT;
    currentSongId: string | null;
}
