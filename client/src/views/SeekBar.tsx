import { useAtom } from "jotai";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { currentTimeAtom } from "../atom";

type SeekBarProps = {
    audioRef: React.RefObject<HTMLMediaElement>;
    lastClickedId: React.MutableRefObject<string | null>;
    duration: number;
};

export const SeekBar = function SeekBar(props: SeekBarProps) {
    const { audioRef, lastClickedId, duration } = props;
    const [currentTime, setCurrentTime] = useAtom(currentTimeAtom);
    const [tempCurrentTime, setTempCurrentTime] = useState<number | null>(null);
    const seekbarRef = useRef<HTMLDivElement>(null);
    const isHolding = useRef(false);
    
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
                                tempPlayedPercent == null ? playedPercent : tempPlayedPercent
                            }%`,
                        }}
                        id="seekbar-currenttime"
                    ></div>
                </div>
                <div className="text-xs">{formattedDuration}</div>
            </div>
        </div>
    );
};
