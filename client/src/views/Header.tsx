import { TbPlaylist } from "react-icons/tb";
import { useAtom } from "jotai";

import { showSongMenuAtom } from "../atom";

import PPLogo from "../assets/pp-logo.png";

export function Header() {
    const [, setShowSongMenu] = useAtom(showSongMenuAtom);

    return (
        <header className="h-14 bg-secondary text-white">
            <div className="flex justify-between items-center size-full px-2">
                <button onClick={() => setShowSongMenu(true)}>
                    <TbPlaylist size={28} />
                </button>
                <div>
                    <img src={PPLogo} alt="pplogo" className="size-8" />
                </div>
            </div>
        </header>
    );
}
