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
    const [isHolding, setIsHolding] = useState(false);

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            setIsHolding(true);
            lastClickedId.current = e.target ? (e.target as HTMLElement).id || null : null;
        }

        function handleMouseUp() {
            setTempCurrentTime(null);

            if (
                (lastClickedId.current == "seekbar-duration" ||
                    lastClickedId.current == "seekbar-currenttime" ||
                    lastClickedId.current == "seekbar-dot") &&
                tempCurrentTime != null &&
                audioRef.current
            ) {
                setCurrentTime(tempCurrentTime);
                audioRef.current.currentTime = tempCurrentTime;
            }

            setIsHolding(false);
            lastClickedId.current = null;
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [tempCurrentTime]);

    useEffect(() => {
        function handleMouseMove(event: MouseEvent) {
            if (isHolding == false) return;
            if (
                lastClickedId.current == "seekbar-duration" ||
                lastClickedId.current == "seekbar-currenttime" ||
                lastClickedId.current == "seekbar-dot"
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

        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [duration, isHolding]);

    function formatDuration(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration - minutes * 60);

        return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
    }

    const formattedDuration = useMemo(() => formatDuration(duration), [duration]);
    const formattedCurrentTime = useMemo(() => formatDuration(currentTime), [currentTime]);
    const playedPercent = useMemo(
        () => (currentTime / duration) * 100,
        [formattedDuration, formattedCurrentTime]
    );

    const formattedTempCurrentTime = useMemo(
        () => (tempCurrentTime != null ? formatDuration(tempCurrentTime) : null),
        [tempCurrentTime]
    );
    const tempPlayedPercent = useMemo(
        () => (tempCurrentTime != null ? (tempCurrentTime / duration) * 100 : null),
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
        <div className="relative h-6 mt-8">
            <div className="size-full flex justify-center items-center">
                <div className="text-xs">
                    {formattedTempCurrentTime == null
                        ? formattedCurrentTime
                        : formattedTempCurrentTime}
                </div>
                <div
                    className="group/seekbar mx-2 w-full h-1 bg-gray-500 flex-1 relative rounded-full"
                    ref={seekbarRef}
                    onClick={updateCurrentTime}
                    id="seekbar-duration"
                >
                    <div
                        className="group/seekbar absolute inset-0 h-full bg-white rounded-full"
                        style={{
                            width: `${
                                tempPlayedPercent == null ? playedPercent : tempPlayedPercent
                            }%`,
                        }}
                        id="seekbar-currenttime"
                    ></div>
                    <div
                        className={`${
                            isHolding ? "" : "hidden "
                        }group-hover/seekbar:block absolute size-2 rounded-full -top-[2px] bg-white`}
                        id="seekbar-dot"
                        style={{
                            left: `calc(${
                                tempPlayedPercent == null ? playedPercent : tempPlayedPercent
                            }% - 0.25rem)`,
                        }}
                    ></div>
                </div>
                <div className="text-xs">{formattedDuration}</div>
            </div>
        </div>
    );
};
