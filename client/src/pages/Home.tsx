import Hls from "hls.js";
import { useAtom } from "jotai";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { Actions, Header, SeekBar, SongInfo, SongMenuMobile } from "../views";

import {
    REPEAT,
    currentSongAtom,
    currentTimeAtom,
    durationAtom,
    firstQueueSongAtom,
    isPlayingAtom,
    playlistAtom,
    queueAtom,
    settingsAtom,
    type Queue,
} from "../atom";

import { api } from "../api";

type AllDataResponse = {
    id: string;
    title: string;
    artist: {
        id: string;
        name: string;
    };
    year: number;
    cover: string;
    songs: {
        id: string;
        title: string;
        playtime: string;
        source: string;
        cover: string;
    }[];
}[];

export default function Home() {
    const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState<REPEAT>(REPEAT.DISABLED);
    const [, setCurrentTime] = useAtom(currentTimeAtom);
    const [duration, setDuration] = useAtom(durationAtom);
    const audioRef = useRef<HTMLMediaElement>(null);
    const lastClickedId = useRef<string | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [firstQueueSong, setFirstQueueSong] = useAtom(firstQueueSongAtom);

    const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
    const [queue, setQueue] = useAtom(queueAtom);
    const [playlist, setPlaylist] = useAtom(playlistAtom);
    const [settings, setSettings] = useAtom(settingsAtom);

    const isLocalDataLoaded = currentSong !== undefined;
    const isSongAvailable = currentSong != null;

    function saveSettings(value: string) {
        localStorage.setItem("settings", value);
    }

    useEffect(() => {
        const settingsFromLocal = localStorage.getItem("settings");

        if (settingsFromLocal == null) {
            const defaultSettings = {
                shuffle: false,
                repeat: REPEAT.DISABLED,
                currentSongId: null,
            };

            setSettings(defaultSettings);
            saveSettings(JSON.stringify(defaultSettings));
        } else {
            setSettings(JSON.parse(settingsFromLocal));
        }

        api.get<AllDataResponse>("/all").then((res) => {
            setPlaylist(res.data);
        });
    }, []);

    useEffect(() => {
        if (settings == null) return;
        const { currentSongId, repeat, shuffle } = settings;

        if (currentSongId) {
            const findAlbum = playlist.find((e) => e.songs.some((s) => s.id == currentSongId));
            if (findAlbum) {
                const findSong = findAlbum.songs.find((e) => e.id == currentSongId)!;
                setCurrentSong((cs) => {
                    if (findSong.id == cs?.id) return cs;
                    const { songs, ...rest } = findAlbum;

                    return {
                        ...findSong,
                        album: _.cloneDeep(rest),
                    };
                });
            }
        } else setCurrentSong(null);

        setRepeat(repeat);
        setShuffle(shuffle);
    }, [playlist, settings]);

    useEffect(() => {
        const allSongFromPlaylist: Queue = [];
        for (const each of playlist) {
            const { songs, artist, ...rest } = each;
            for (const song of songs) {
                allSongFromPlaylist.push({ ...song, album: { ...rest, artist: { ...artist } } });
            }
        }

        const allSong = shuffle
            ? _.shuffle<Queue[number]>(allSongFromPlaylist)
            : allSongFromPlaylist;
        setQueue((queue) => {
            if (queue.length > 0) {
                const firstItem = queue[0];
                const findSongIndex = allSong.findIndex((e) => e.id == firstItem.id);

                if (findSongIndex > 0) {
                    for (let i = 0; i < findSongIndex; i++) {
                        allSong.push(allSong.shift()!);
                    }
                }
            }

            if (allSong.length != 0) setFirstQueueSong(allSong[0].id);

            return allSong;
        });
    }, [shuffle, playlist]);

    useEffect(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.play();
        } else audioRef.current.pause();
    }, [isPlaying]);

    useEffect(() => {
        if (!audioRef.current) return;
        if (hlsRef.current == null) {
            hlsRef.current = new Hls();
            hlsRef.current.on(Hls.Events.MANIFEST_LOADED, (_, data) => {
                if (data.levels[0].details?.totalduration)
                    setDuration(data.levels[0].details?.totalduration);
            });

            hlsRef.current.attachMedia(audioRef.current);
        }

        if (currentSong !== undefined) {
            if (currentSong?.source)
                hlsRef.current.loadSource(
                    `${import.meta.env.VITE_BACKEND_URL}${currentSong.source}`
                );
            setDuration(0);
        }

        setIsPlaying((isPlaying) => {
            if (isPlaying && audioRef.current) audioRef.current.play().catch((_) => {});
            return isPlaying;
        });
    }, [currentSong]);

    useEffect(() => {
        setQueue((queue) => {
            if (!currentSong || queue[0]?.id == currentSong.id) return queue;

            const findIndex = queue.findIndex((e) => e.id == currentSong.id);
            if (findIndex == -1) return queue;

            for (let i = 0; i < findIndex; i++) {
                queue.push(queue.shift()!);
            }

            return _.cloneDeep(queue);
        });
    }, [currentSong]);

    useEffect(() => {
        if (!audioRef.current) return;
        const curAudio = audioRef.current;

        const handleOnPlay = () => setIsPlaying(true);
        const handleOnPause = (e: Event) => {
            const target = e.target as HTMLAudioElement;
            if (target) {
                if (target.currentTime != target.duration) setIsPlaying(false);
            }
        };
        const handleTimeupdate = () => {
            if (
                curAudio &&
                lastClickedId.current != "seekbar-duration" &&
                lastClickedId.current != "seekbar-currenttime"
            )
                setCurrentTime(curAudio.currentTime);
        };

        curAudio.addEventListener("play", handleOnPlay);
        curAudio.addEventListener("pause", handleOnPause);
        curAudio.addEventListener("timeupdate", handleTimeupdate);

        return () => {
            curAudio.removeEventListener("play", handleOnPlay);
            curAudio.removeEventListener("pause", handleOnPause);
            curAudio.removeEventListener("timeupdate", handleTimeupdate);
        };
    }, []);

    function handleRepeat() {
        if (!audioRef.current) return false;

        if (repeat == REPEAT.DISABLED) {
            if (queue.length == 1) return false;
            else if (queue[1].id == firstQueueSong) return false;
        } else if (repeat == REPEAT.CURRENT) {
            audioRef.current.play();
            return null;
        }

        return true;
    }

    function moveSong(direction: "next" | "previous") {
        return () => {
            if (queue.length == 0) return;
            const targetQueue =
                queue.length == 1
                    ? queue[0]
                    : direction == "next"
                    ? queue[1]
                    : queue[queue.length - 1];
            const { id } = targetQueue;

            setQueue((queue) => {
                if (queue.length > 1) {
                    if (direction == "next") queue.push(queue.shift()!);
                    else queue.unshift(queue.pop()!);
                }
                return _.cloneDeep(queue);
            });

            setSettings((st) => {
                st!.currentSongId = id;
                saveSettings(JSON.stringify(st));
                return { ...st! };
            });

            setCurrentSong(_.cloneDeep(targetQueue));
        };
    }

    useEffect(() => {
        if (!audioRef.current) return;
        const curAudio = audioRef.current;

        const handleEnded = () => {
            const handleRepeatResult = handleRepeat();
            if (handleRepeatResult == null) return;
            if (handleRepeatResult == false) {
                setIsPlaying(false);
            }

            moveSong("next")();
        };
        curAudio.addEventListener("ended", handleEnded);

        return () => {
            curAudio.removeEventListener("ended", handleEnded);
        };
    }, [moveSong]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key == " " && isSongAvailable && document.querySelector(":focus") == null) {
                setIsPlaying((isPlaying) => {
                    return !isPlaying;
                });
            }
        };

        document.addEventListener("keypress", handleKeyPress);

        return () => {
            document.removeEventListener("keypress", handleKeyPress);
        };
    }, [isSongAvailable]);

    const isReady = settings != null && isLocalDataLoaded && duration != -1;

    return (
        <div className="h-screen w-full bg-primary">
            <Header />
            <SongMenuMobile />
            {isReady ? (
                <div
                    className="w-72 mx-auto overflow-hidden"
                    style={{
                        height: "calc(100vh-3.5rem)",
                    }}
                >
                    <SongInfo />
                    <SeekBar
                        audioRef={audioRef}
                        lastClickedId={lastClickedId}
                        duration={duration}
                    />
                    <Actions
                        audioRef={audioRef}
                        isSongAvailable={isSongAvailable}
                        moveSong={moveSong}
                    />
                </div>
            ) : (
                <div
                    className="w-72 mx-auto overflow-hidden animate-pulse"
                    style={{
                        height: "calc(100vh-3.5rem)",
                    }}
                >
                    <div className="mt-14">
                        <div className="relative size-72 mx-auto bg-gray-600 text-white"></div>
                    </div>
                    <div className="mt-4 flex flex-col justify-center items-center">
                        <h1 className="font-bold bg-gray-600 h-6 w-full"></h1>
                        <h2 className="font-semibold text-xs bg-gray-600 mt-2 h-4 w-full"></h2>
                    </div>
                    <div className="h-6 mt-8 w-full">
                        <div className="size-full flex justify-center items-center">
                            <div className="h-full w-6 bg-gray-600"></div>
                            <div className="h-full mx-1 flex-1 bg-gray-600"></div>
                            <div className="h-full w-6 bg-gray-600"></div>
                        </div>
                    </div>
                    <div className="h-16 mt-2">
                        <div className="size-full flex justify-center items-center">
                            <div className="h-full w-full  bg-gray-600"></div>
                        </div>
                    </div>
                </div>
            )}
            <audio ref={audioRef} key="hidden-audio" className="hidden" />
        </div>
    );
}
