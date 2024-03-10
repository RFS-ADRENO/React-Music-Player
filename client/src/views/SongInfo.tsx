import PPLogoGray from "../assets/pp-logo-gray.png";
import { useAtom } from "jotai";
import { currentSongAtom } from "../atom";
import { useState } from "react";

export function SongInfo() {
    const [currentSong] = useAtom(currentSongAtom);
    const [showAlbumCover, setShowAlbumCover] = useState(false);

    return (
        <>
            <div className="mt-14">
                <div
                    className="relative size-72 mx-auto bg-black text-white"
                    onClick={() => setShowAlbumCover(!showAlbumCover)}
                >
                    <img
                        src={
                            currentSong?.cover
                                ? `${import.meta.env.VITE_BACKEND_URL}${currentSong.cover}`
                                : PPLogoGray
                        }
                        alt="cover"
                        className="size-full"
                    />
                    <div
                        className={`size-full absolute inset-0 transition-opacity ${
                            showAlbumCover ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        <img
                            src={
                                currentSong
                                    ? `${import.meta.env.VITE_BACKEND_URL}${
                                          currentSong.album.cover
                                      }`
                                    : PPLogoGray
                            }
                            alt="cover"
                            className="size-full"
                        />
                    </div>
                </div>
            </div>
            <div className="h-12 text-center mt-4">
                <h1 className="font-bold">{currentSong?.title || ""}</h1>
                <h2 className="font-semibold text-xs">
                    {currentSong ? currentSong.album.artist.name : ""}
                </h2>
            </div>
        </>
    );
}
