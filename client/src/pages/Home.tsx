import Hls from "hls.js";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    IoPauseCircle,
    IoPlayBackCircle,
    IoPlayCircleSharp,
    IoPlayForwardCircle,
    IoShuffle,
} from "react-icons/io5";
import { TbRepeat, TbRepeatOff, TbRepeatOnce } from "react-icons/tb";
import { Header, SongMenuMobile } from "../views";

import PPLogoGray from "../assets/pp-logo-gray.png";
import {
    REPEAT,
    currentSongAtom,
    firstQueueSongAtom,
    isPlayingAtom,
    playlistAtom,
    queueAtom,
    settingsAtom,
    type Queue,
} from "../atom";

import { api } from "../api";

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

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
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [tempCurrentTime, setTempCurrentTime] = useState<number | null>(null);
    const audioRef = useRef<HTMLMediaElement>(null);
    const seekbarRef = useRef<HTMLDivElement>(null);
    const isHolding = useRef(false);
    const lastClickedId = useRef<string | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [firstQueueSong, setFirstQueueSong] = useAtom(firstQueueSongAtom);

    const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
    const [queue, setQueue] = useAtom(queueAtom);
    const [playlist, setPlaylist] = useAtom(playlistAtom);
    const [settings, setSettings] = useAtom(settingsAtom);

    const isSongAvailable = currentSong != null;

    useEffect(() => {
        api.get<AllDataResponse>("/all").then((res) => {
            setPlaylist(
                res.data.map((e) => {
                    return {
                        id: e.id,
                        title: e.title,
                        songs: e.songs,
                    };
                })
            );
        });
    }, []);

    useEffect(() => {
        const { currentSongId, repeat, shuffle } = settings;

        if (currentSongId) {
            const findAlbum = playlist.find((e) => e.songs.some((s) => s.id == currentSongId));
            if (findAlbum) {
                const findSong = findAlbum.songs.find((e) => e.id == currentSongId)!;
                setCurrentSong((cs) => {
                    if (findSong.id == cs?.songId) return cs;

                    return {
                        songId: currentSongId,
                        albumId: findAlbum.id,
                        song: findSong.title,
                        album: findAlbum.title,
                        cover: findSong.cover,
                        source: findSong.source,
                        playtime: findSong.playtime,
                    };
                });
            }
        }

        setRepeat(repeat);
        setShuffle(shuffle);
    }, [playlist, settings]);

    useEffect(() => {
        const allSong = playlist.reduce<Queue>((acc, cur) => {
            return [
                ...acc,
                ...cur.songs.map((e) => ({
                    songId: e.id,
                    albumId: cur.id,
                    song: e.title,
                    album: cur.title,
                    playtime: e.playtime,
                })),
            ];
        }, []);

        if (shuffle) shuffleArray<Queue[number]>(allSong);
        setQueue((queue) => {
            if (queue.length > 0) {
                const firstItem = queue[0];
                const findSongIndex = allSong.findIndex((e) => e.songId == firstItem.songId);

                if (findSongIndex > 0) {
                    for (let i = 0; i < findSongIndex; i++) {
                        allSong.push(allSong.shift()!);
                    }
                }
            }

            if (allSong.length != 0) setFirstQueueSong(allSong[0].songId);

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

        if (currentSong?.source)
            hlsRef.current.loadSource(`${import.meta.env.VITE_BACKEND_URL}${currentSong.source}`);
        setIsPlaying((isPlaying) => {
            if (isPlaying && audioRef.current) audioRef.current.play().catch((_) => {});
            return isPlaying;
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
            else if (queue[1].songId == firstQueueSong) return false;
        } else if (repeat == REPEAT.CURRENT) {
            audioRef.current.play();
            return null;
        }

        return true;
    }

    function moveSong(direction: "next" | "previous") {
        return () => {
            const { songId, albumId, song, album, playtime } =
                queue.length == 1
                    ? queue[0]
                    : direction == "next"
                    ? queue[1]
                    : queue[queue.length - 1];

            const findAlbum = playlist.find((e) => e.id == albumId);
            if (!findAlbum) return;
            const findSong = findAlbum.songs.find((e) => e.id == songId)!;

            setQueue((queue) => {
                if (queue.length > 1) {
                    if (direction == "next") queue.push(queue.shift()!);
                    else queue.unshift(queue.pop()!);
                }
                return [...queue];
            });

            setSettings((st) => {
                st.currentSongId = songId;
                return { ...st };
            });

            setCurrentSong({
                songId,
                albumId,
                song,
                album,
                playtime,
                source: findSong.source,
                cover: findSong.cover,
            });
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

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            isHolding.current = true;
            lastClickedId.current = e.target ? (e.target as HTMLElement).id || null : null;
        }
        function handleMouseUp() {
            setTempCurrentTime(null);

            if (
                (lastClickedId.current == "seekbar-duration" ||
                    lastClickedId.current == "seekbar-currenttime") &&
                tempCurrentTime != null &&
                audioRef.current
            ) {
                setCurrentTime(tempCurrentTime);
                audioRef.current.currentTime = tempCurrentTime;
            }

            isHolding.current = false;
            lastClickedId.current = null;
        }

        function handleMouseMove(event: MouseEvent) {
            if (isHolding.current == false) return;
            if (
                lastClickedId.current == "seekbar-duration" ||
                lastClickedId.current == "seekbar-currenttime"
            ) {
                if (!seekbarRef.current) return;

                const { clientX } = event;
                const { x, width } = seekbarRef.current.getBoundingClientRect();

                if (clientX >= x && clientX <= x + width) {
                    const targetPercent = (clientX - x) / width;
                    const targetTime = targetPercent * duration;

                    setTempCurrentTime(targetTime);
                } else {
                    setTempCurrentTime(clientX < x ? 0 : duration);
                }
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [duration, tempCurrentTime]);

    function toggleRepeat() {
        let repeatMode = REPEAT.DISABLED;

        if (repeat == REPEAT.DISABLED) repeatMode = REPEAT.PLAYLIST;
        else if (repeat == REPEAT.PLAYLIST) repeatMode = REPEAT.CURRENT;

        setSettings((st) => {
            st.repeat = repeatMode;
            return { ...st };
        });
        setRepeat(repeatMode);
    }

    function toggleShuffle() {
        setSettings((st) => {
            st.shuffle = !shuffle;
            return { ...st };
        });
        setShuffle(!shuffle);
    }

    function togglePlay() {
        if (!audioRef.current) return;
        setIsPlaying(!isPlaying);
    }

    function formatDuration(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration - minutes * 60);

        return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
    }

    const formattedDuration = useMemo(() => formatDuration(duration), [duration]);
    const formattedCurrentTime = useMemo(() => formatDuration(currentTime), [currentTime]);
    const playedPercent = useMemo(
        () => 100 - (currentTime / duration) * 100,
        [formattedDuration, formattedCurrentTime]
    );

    const formattedTempCurrentTime = useMemo(
        () => (tempCurrentTime != null ? formatDuration(tempCurrentTime) : null),
        [tempCurrentTime]
    );
    const tempPlayedPercent = useMemo(
        () => (tempCurrentTime != null ? 100 - (tempCurrentTime / duration) * 100 : null),
        [duration, tempCurrentTime]
    );

    function updateCurrentTime(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!seekbarRef.current || !audioRef.current) return;

        const { clientX } = event;
        const { x, width } = seekbarRef.current.getBoundingClientRect();

        const targetPercent = (clientX - x) / width;
        const targetTime = targetPercent * duration;

        audioRef.current.currentTime = targetTime;
    }

    return (
        <div className="h-screen w-full bg-primary">
            <Header />
            <SongMenuMobile />
            <div
                className="w-72 mx-auto overflow-hidden"
                style={{
                    height: "calc(100vh-3.5rem)",
                }}
            >
                <div className="mt-14">
                    <div className="size-72 mx-auto bg-black text-white">
                        <img
                            src={
                                currentSong?.cover
                                    ? `${import.meta.env.VITE_BACKEND_URL}${currentSong.cover}`
                                    : PPLogoGray
                            }
                            alt="cover"
                            className="size-full"
                        />
                    </div>
                </div>
                <div className="h-12 text-center mt-4">
                    <h1 className="font-bold">{currentSong?.song || ""}</h1>
                    <h2 className="font-semibold text-sm">{currentSong?.album || ""}</h2>
                </div>
                <div className="h-6 mt-8">
                    <div className="size-full flex justify-center items-center">
                        <div className="text-xs">
                            {formattedTempCurrentTime == null
                                ? formattedCurrentTime
                                : formattedTempCurrentTime}
                        </div>
                        <div
                            className="mx-1 w-full h-1 bg-gray-500 flex-1 relative overflow-hidden rounded-full"
                            ref={seekbarRef}
                            onClick={updateCurrentTime}
                            id="seekbar-duration"
                        >
                            <div
                                className="absolute inset-0 size-full bg-white"
                                style={{
                                    left: `-${
                                        tempPlayedPercent == null
                                            ? playedPercent
                                            : tempPlayedPercent
                                    }%`,
                                }}
                                id="seekbar-currenttime"
                            ></div>
                        </div>
                        <div className="text-xs">{formattedDuration}</div>
                    </div>
                </div>
                <div className="h-16 mt-2">
                    <div className="size-full flex justify-center items-center">
                        <button disabled={!isSongAvailable} onClick={toggleShuffle}>
                            <IoShuffle size={34} color={`${shuffle ? "#208a2e" : "#a8a8a8"}`} />
                        </button>
                        <button
                            disabled={!isSongAvailable}
                            className="ml-4"
                            onClick={moveSong("previous")}
                        >
                            <IoPlayBackCircle size={40} />
                        </button>
                        <button disabled={!isSongAvailable} className="ml-2" onClick={togglePlay}>
                            {isPlaying ? (
                                <IoPauseCircle size={56} />
                            ) : (
                                <IoPlayCircleSharp size={56} />
                            )}
                        </button>
                        <button
                            disabled={!isSongAvailable}
                            className="ml-2"
                            onClick={moveSong("next")}
                        >
                            <IoPlayForwardCircle size={40} />
                        </button>
                        <button disabled={!isSongAvailable} className="ml-4" onClick={toggleRepeat}>
                            {repeat == REPEAT.DISABLED ? (
                                <TbRepeatOff size={34} color="#a8a8a8" />
                            ) : repeat == REPEAT.PLAYLIST ? (
                                <TbRepeat size={34} color="#208a2e" />
                            ) : (
                                <TbRepeatOnce size={34} color="#208a2e" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
