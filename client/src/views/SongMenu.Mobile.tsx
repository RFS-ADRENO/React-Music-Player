import { useAtom } from "jotai";
import { TbPlaylistOff } from "react-icons/tb";

import {
    Queue,
    currentSongAtom,
    isPlayingAtom,
    playlistAtom,
    queueAtom,
    settingsAtom,
    showSongMenuAtom,
} from "../atom";

import { useEffect, useState } from "react";
import playingGif from "../assets/playing.gif";
import _ from "lodash";

enum Tab {
    PLAYLIST,
    QUEUE,
}

export function SongMenuMobile() {
    const [showSongMenu, setShowSongMenu] = useAtom(showSongMenuAtom);
    const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
    const [, setIsPlaying] = useAtom(isPlayingAtom);
    const [playlist] = useAtom(playlistAtom);
    const [queue, setQueue] = useAtom(queueAtom);

    const [tab, setTab] = useState<Tab>(Tab.PLAYLIST);
    const [, setSettings] = useAtom(settingsAtom);

    useEffect(() => {
        function handleDocumentClickEvent(e: MouseEvent) {
            if (e.target) {
                if ((e.target as HTMLElement).id == "mbsm") {
                    setShowSongMenu(false);
                }
            }
        }

        document.addEventListener("click", handleDocumentClickEvent);

        return () => {
            document.removeEventListener("click", handleDocumentClickEvent);
        };
    }, []);

    function hideSongMenu() {
        setShowSongMenu(false);
    }

    function selectSong(selectedQueueItem: Queue[number]) {
        const { id, album } = selectedQueueItem;
        return () => {
            if (currentSong == null || currentSong.id != id) {
                if (!playlist.some((a) => a.id == album.id)) return;

                const curIndex = queue.findIndex((e) => e.id == id);
                if (curIndex > 0) {
                    for (let i = 0; i < curIndex; i++) {
                        queue.push(queue.shift()!);
                    }
                }

                setIsPlaying(false);
                setCurrentSong(_.cloneDeep(selectedQueueItem));
                setSettings((settings) => {
                    settings.currentSongId = id;

                    return { ...settings };
                });
                setQueue(_.cloneDeep(queue));
            }
        };
    }

    return (
        <div
            className="z-10 fixed h-screen w-full bg-black bg-opacity-70 transition-all"
            id="mbsm"
            key="mobile-songmenu"
            style={{
                top: 0,
                left: showSongMenu ? "0px" : "-100%",
            }}
        >
            <div className="w-64 sm:w-96 bg-black h-full text-white" id="abc">
                <div className="h-14 w-full pl-2 flex items-center justify-start">
                    <button onClick={hideSongMenu}>
                        <TbPlaylistOff size={28} />
                    </button>
                </div>
                <div className="h-8 flex justify-start items-center pl-2 text-sm">
                    <button
                        className={`${
                            tab == Tab.PLAYLIST ? "bg-slate-400" : "border hover:bg-slate-600"
                        } rounded-full w-16 h-full flex justify-center items-center`}
                        onClick={() => setTab(Tab.PLAYLIST)}
                    >
                        Playlist
                    </button>
                    <button
                        className={`${
                            tab == Tab.QUEUE ? "bg-slate-400" : "border hover:bg-slate-600"
                        } rounded-full w-16 h-full flex justify-center items-center ml-1`}
                        onClick={() => setTab(Tab.QUEUE)}
                    >
                        Queue
                    </button>
                </div>
                <div
                    style={{
                        width: "100%",
                        height: "calc(100vh - 3.5rem - 2rem)",
                        paddingInline: "8px",
                        paddingTop: "10px",
                        overflow: "auto",
                    }}
                >
                    {tab == Tab.PLAYLIST ? (
                        <PlaylistMobile selectSong={selectSong} />
                    ) : (
                        <QueueMobile selectSong={selectSong} />
                    )}
                </div>
            </div>
        </div>
    );
}

type PLMProps = {
    selectSong: (data: Queue[number]) => () => void;
};

function PlaylistMobile({ selectSong }: PLMProps) {
    const [playlist] = useAtom(playlistAtom);
    const [currentSong] = useAtom(currentSongAtom);
    const [isPlaying] = useAtom(isPlayingAtom);

    return (
        <ul className="list-decimal">
            {playlist.map((album, i) => (
                <li className="ml-4" key={i}>
                    <h3
                        className={`font-semibold${
                            currentSong?.album?.id == album.id ? " text-primary" : ""
                        }`}
                    >
                        {album.title}
                    </h3>
                    <div>
                        <ol className="list-decimal">
                            {album.songs.map((song, si) => (
                                <li className="ml-4 mt-px text-sm" key={`${i}.${si}`}>
                                    <div
                                        className="flex items-center cursor-pointer hover:text-[#c9a5b0]"
                                        onClick={() => {
                                            const { songs, ...rest } = album;
                                            selectSong({
                                                ...song,
                                                album: _.cloneDeep(rest),
                                            });
                                        }}
                                    >
                                        {currentSong && currentSong.id == song.id ? (
                                            <>
                                                <div className="text-primary">{song.title}</div>
                                                <div
                                                    className={`text-primary ml-auto${
                                                        isPlaying ? "" : " mr-4"
                                                    }`}
                                                >
                                                    {song.playtime}
                                                </div>
                                                {isPlaying && (
                                                    <div>
                                                        <img
                                                            src={playingGif}
                                                            alt="playing"
                                                            className="size-4"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div>{song.title}</div>
                                                <div className="ml-auto mr-4">{song.playtime}</div>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </li>
            ))}
        </ul>
    );
}

type QMProps = {
    selectSong: (data: Queue[number]) => () => void;
};

function QueueMobile({ selectSong }: QMProps) {
    const [queue] = useAtom(queueAtom);
    const [currentSong] = useAtom(currentSongAtom);
    const [isPlaying] = useAtom(isPlayingAtom);

    const isSongAvailable = currentSong != null;

    return (
        <>
            {isSongAvailable && (
                <div className="h-20">
                    <h3 className="font-semibold">Now Playing</h3>
                    <ul>
                        <li className="ml-4 mt-px text-sm flex justify-start items-center">
                            <span className="mr-4 text-primary">1</span>
                            <div
                                className="flex-1 flex items-center cursor-pointer hover:text-[#c9a5b0]"
                                onClick={selectSong(queue[0])}
                            >
                                <div className="flex justify-center items-start flex-col">
                                    <div className="text-primary">{queue[0].title}</div>
                                    <div className="text-xs text-slate-300">
                                        {queue[0].album.artist.name}
                                    </div>
                                </div>
                                <div className={`text-primary ml-auto${isPlaying ? "" : " mr-4"}`}>
                                    {queue[0].playtime}
                                </div>
                                {isPlaying && (
                                    <div>
                                        <img src={playingGif} alt="playing" className="size-4" />
                                    </div>
                                )}
                            </div>
                        </li>
                    </ul>
                </div>
            )}
            <div
                style={{
                    height: isSongAvailable ? "calc(100% - 5rem)" : "100%",
                }}
            >
                <h3 className="font-semibold">Next Up</h3>
                <ul>
                    {queue.map((e, i) => {
                        if (isSongAvailable && i == 0) return null;
                        return (
                            <li
                                key={`queue-item-${e.id}`}
                                className="ml-4 mt-2 text-sm flex justify-start items-center"
                            >
                                <span className="mr-4">{i + 1}</span>
                                <div
                                    className="flex-1 flex items-center cursor-pointer hover:text-[#c9a5b0]"
                                    onClick={selectSong(e)}
                                >
                                    <div className="flex justify-center items-start flex-col">
                                        <div>{e.title}</div>
                                        <div className="text-xs text-slate-300">
                                            {e.album.artist.name}
                                        </div>
                                    </div>
                                    <div className="ml-auto mr-4">{e.playtime}</div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}
