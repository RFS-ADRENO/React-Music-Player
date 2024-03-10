import React from "react";
import { TbRepeat, TbRepeatOff, TbRepeatOnce } from "react-icons/tb";
import { REPEAT, isPlayingAtom, settingsAtom } from "../atom";
import {
    IoPauseCircle,
    IoPlayBackCircle,
    IoPlayCircleSharp,
    IoPlayForwardCircle,
    IoShuffle,
} from "react-icons/io5";
import { useAtom } from "jotai";

type Props = {
    audioRef: React.RefObject<HTMLAudioElement>;
    moveSong: (direction: "next" | "previous") => () => void;
    isSongAvailable: boolean
};

export function Actions({ audioRef, moveSong, isSongAvailable }: Props) {
    const [settings, setSettings] = useAtom(settingsAtom);
    const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);

    function saveSettings(value: string) {
        localStorage.setItem("settings", value);
    }

    function toggleRepeat() {
        let repeatMode = REPEAT.DISABLED;

        if (settings?.repeat == REPEAT.DISABLED) repeatMode = REPEAT.PLAYLIST;
        else if (settings?.repeat == REPEAT.PLAYLIST) repeatMode = REPEAT.CURRENT;

        setSettings((st) => {
            st!.repeat = repeatMode;
            saveSettings(JSON.stringify(st));
            return { ...st! };
        });
    }

    function toggleShuffle() {
        setSettings((st) => {
            st!.shuffle = !st!.shuffle;
            saveSettings(JSON.stringify(st));
            return { ...st! };
        });
    }

    function togglePlay() {
        if (!audioRef.current) return;
        setIsPlaying(!isPlaying);
    }

    return (
        <div className="h-16 mt-2">
            <div className="size-full flex justify-center items-center">
                <button disabled={!isSongAvailable} onClick={toggleShuffle}>
                    <IoShuffle size={34} color={`${settings?.shuffle ? "#208a2e" : "#a8a8a8"}`} />
                </button>
                <button disabled={!isSongAvailable} className="ml-4" onClick={moveSong("previous")}>
                    <IoPlayBackCircle size={40} />
                </button>
                <button disabled={!isSongAvailable} className="ml-2" onClick={togglePlay}>
                    {isPlaying ? <IoPauseCircle size={56} /> : <IoPlayCircleSharp size={56} />}
                </button>
                <button disabled={!isSongAvailable} className="ml-2" onClick={moveSong("next")}>
                    <IoPlayForwardCircle size={40} />
                </button>
                <button disabled={!isSongAvailable} className="ml-4" onClick={toggleRepeat}>
                    {settings?.repeat == REPEAT.CURRENT ? (
                        <TbRepeatOnce size={34} color="#208a2e" />
                    ) : settings?.repeat == REPEAT.PLAYLIST ? (
                        <TbRepeat size={34} color="#208a2e" />
                    ) : (
                        <TbRepeatOff size={34} color="#a8a8a8" />
                    )}
                </button>
            </div>
        </div>
    );
}
