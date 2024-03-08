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

export type Playlist = {
    id: string;
    title: string;
    songs: {
        id: string;
        title: string;
        playtime: string;
        source: string;
        cover: string;
    }[];
}[];

export type CurrentSong = {
    songId: string;
    albumId: string;
    song: string;
    album: string;
    playtime: string;
    source: string;
    cover: string;
}

export type Queue = {
    songId: string;
    albumId: string;
    song: string;
    album: string;
    playtime: string;
}[]

export type Settings = {
    shuffle: boolean;
    repeat: REPEAT;
    currentSongId: string | null;
}
