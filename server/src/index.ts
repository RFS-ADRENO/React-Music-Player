import { config } from "dotenv";
config({
    path: process.env.NODE_ENV === "production" ? ".env" : ".env.development",
});

import express from "express";
import cors from "cors";
import multer from "multer";
import { Album, Artist, Song, connect } from "./database/index.js";
import fluentFFmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 } from "uuid";

sharp.cache(false);
fluentFFmpeg.setFfmpegPath(process.env.FFMPEG_PATH!);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "newAlbumCover") {
            cb(null, "uploads/albumCovers");
            return;
        }
        if (file.fieldname === "songCover") {
            cb(null, "uploads/songCovers");
            return;
        }
        cb(null, "uploads/sources");
    },
    filename: (req, file, cb) => {
        cb(null, `temp_${file.fieldname}_${v4()}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const uploads = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 20, // 20MB
    },
    fileFilter(req, file, callback) {
        const allowedMimeTypes = [
            "audio/mpeg",
            "audio/wav",
            "audio/flac",
            "audio/ogg",
            "audio/aac",
        ];
        if (file.fieldname == "source" && !allowedMimeTypes.includes(file.mimetype)) {
            callback(
                new Error(
                    "Invalid audio file type. Only MP3, WAV, FLAC, OGG, and AAC files are allowed."
                )
            );
            return;
        }

        const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (
            (file.fieldname == "songCover" || file.fieldname == "newAlbumCover") &&
            !allowedImageMimeTypes.includes(file.mimetype)
        ) {
            callback(
                new Error("Invalid image file type. Only JPEG, PNG and WEBP files are allowed.")
            );
            return;
        }

        callback(null, true);
    },
});

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.set("view engine", "ejs");
app.set("views", "views");
app.use("/uploads/albums", express.static("uploads/albums"));

app.get("/add", async (req, res) => {
    const albums = await Album.find().populate("artist");
    const artists = await Artist.find();

    res.render("index", {
        albums,
        artists,
    });
});

app.get("/api/albums", async (req, res) => {
    const albums = await Album.find();
    res.json(albums);
});

app.get("/api/albums/:id", async (req, res) => {
    const { id } = req.params;
    const album = await Album.findOne({ id }).populate("artist").populate("songs");
    if (!album) {
        return res.status(404).json({ message: "Album not found" });
    }
    res.json(album);
});

app.get("/api/all", async (req, res) => {
    const albums = await Album.find().populate("artist").populate("songs");
    res.json(albums);
});

app.post("/api/upload", (req, res) => {
    uploads.fields([
        {
            name: "source",
            maxCount: 1,
        },
        {
            name: "songCover",
            maxCount: 1,
        },
        {
            name: "newAlbumCover",
            maxCount: 1,
        },
    ])(req, res, async (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(400).send(error.message);
        } else if (error) {
            return res.status(500).send(error.message);
        }

        try {
            const { song, album, newAlbumTitle, newAlbumYear, artist, newArtistName } = req.body;
            const files = req.files;
            if (!files) {
                return res.status(400).send("No files were uploaded");
            }
            if (Array.isArray(files)) {
                return res.status(400).send("You can only upload one file at a time");
            }

            const file = files["source"]?.[0];
            const songCover = files["songCover"]?.[0];
            const newAlbumCover = files["newAlbumCover"]?.[0];

            if (!file || !song || !album || !artist || !songCover) {
                return res.status(400).send("All fields are required");
            }

            if (album === "new" && !newAlbumTitle && !newAlbumYear) {
                return res.status(400).send("Album title is required");
            }

            if (album === "new") {
                if (newAlbumYear) {
                    if (isNaN(parseInt(newAlbumYear))) {
                        return res.status(400).send("Year must be a number");
                    }
                }
            }

            if (artist === "new" && !newArtistName) {
                return res.status(400).send("Artist name is required");
            }

            let targetArtist;
            if (artist === "new") {
                console.log(`Creating new artist: ${newArtistName}`);
                if (newArtistName.length < 3) {
                    return res.status(400).send("Artist name must be at least 3 characters long");
                }

                if (newArtistName.length > 50) {
                    return res.status(400).send("Artist name must be at most 50 characters long");
                }

                if (newArtistName.match(/\s{2,}/)) {
                    return res
                        .status(400)
                        .send("Artist name can only contain one space between words");
                }

                const findArtist = await Artist.findOne({ name: newArtistName.trim() });
                if (findArtist) {
                    return res.status(400).send("Artist already exists");
                }

                const artist = new Artist({ name: newArtistName.trim() });
                await artist.save();

                targetArtist = artist;
            } else {
                console.log(`Using existing artist: ${artist}`);
                const findArtist = await Artist.findOne({
                    id: artist,
                });

                if (!findArtist) {
                    return res.status(400).send("Artist not found");
                }

                targetArtist = findArtist;
            }

            let targetAlbum: any;
            if (album === "new") {
                console.log(`Creating new album: ${newAlbumTitle}`);

                if (newAlbumTitle.length < 3) {
                    return res.status(400).send("Album title must be at least 3 characters long");
                }

                if (newAlbumTitle.length > 50) {
                    return res.status(400).send("Album title must be at most 50 characters long");
                }

                if (newAlbumTitle.match(/\s{2,}/)) {
                    return res
                        .status(400)
                        .send("Album title can only contain one space between words");
                }

                const findAlbum = await Album.findOne({
                    $and: [{ title: newAlbumTitle.trim() }, { artist: targetArtist._id }],
                });
                if (findAlbum) {
                    return res.status(400).send("Album already exists");
                }

                const newAlbumId = v4();
                if (existsSync(`uploads/albums/${newAlbumId}`))
                    return res.status(400).send("Album already exists");

                await mkdir(`uploads/albums/${newAlbumId}`, { recursive: true });

                const webpCoverPath = `uploads/albums/${newAlbumId}/cover.webp`;
                if (newAlbumCover) {
                    await sharp(newAlbumCover.path)
                        .webp({ quality: 100 })
                        .resize(300, 300)
                        .toFile(webpCoverPath);
                    await unlink(newAlbumCover.path);
                }

                targetAlbum = new Album({
                    id: newAlbumId,
                    title: newAlbumTitle.trim(),
                    year: parseInt(newAlbumYear),
                    artist: targetArtist._id,
                    cover: "/" + webpCoverPath,
                });
                await targetAlbum.save();
            } else {
                console.log(`Using existing album: ${album}`);

                const findAlbum = await Album.findOne({
                    id: album,
                }).populate("songs");

                if (!findAlbum) {
                    return res.status(400).send("Album not found");
                }

                targetAlbum = findAlbum;
            }

            const findSongInAlbum = targetAlbum.songs.find(
                (s: any) => s.title.toLowerCase() === song.toLowerCase()
            );
            if (findSongInAlbum) {
                return res.status(400).send("Song already exists in the album");
            }

            const newSongId = v4();
            if (existsSync(`uploads/albums/${targetAlbum.id}/${newSongId}`)) {
                return res.status(400).send("Song already exists");
            }

            console.log(`Creating new song: ${newSongId}`);
            if (!existsSync(`uploads/albums/${targetAlbum.id}/${newSongId}`)) {
                await mkdir(`uploads/albums/${targetAlbum.id}/${newSongId}`, { recursive: true });
            }

            // ffmpeg -i songs/audio.mp3 -map 0:a -vn -hls_time 10 -hls_list_size 0 -c copy -f hls -hls_segment_filename "songs/name/audio_%03d.ts" songs/name/audio.m3u8
            fluentFFmpeg(file.path, {
                logger: {
                    debug: console.log,
                    info: console.log,
                    warn: console.log,
                    error: console.error,
                },
            })
                .addOption("-map 0:a")
                .addOption("-vn")
                .addOption("-hls_time 10")
                .addOption("-hls_list_size 0")
                .addOption("-c copy")
                .addOption("-f hls")
                .addOption(
                    `-hls_segment_filename uploads/albums/${targetAlbum.id}/${newSongId}/audio_%03d.ts`
                )
                .output(`uploads/albums/${targetAlbum.id}/${newSongId}/audio.m3u8`)
                .on("progress", function (progress) {
                    console.log(
                        "Processing: " +
                            progress.percent +
                            "% done @ " +
                            progress.currentFps +
                            " fps"
                    );
                })
                .on("end", async () => {
                    console.log("Processing finished");
                    fluentFFmpeg.ffprobe(file.path, async (err, metadata) => {
                        if (err) {
                            console.error(err);
                            return res
                                .status(500)
                                .send("An error occurred while processing the file");
                        }

                        const webpCoverPath = `uploads/albums/${targetAlbum.id}/${newSongId}/cover.webp`;
                        await sharp(songCover.path)
                            .webp({ quality: 100 })
                            .resize(300, 300)
                            .toFile(webpCoverPath);
                        await unlink(songCover.path);

                        const newSong = new Song({
                            title: song.trim(),
                            playtime: formatDuration(metadata.format.duration ?? 0),
                            source: `/uploads/albums/${targetAlbum.id}/${newSongId}/audio.m3u8`,
                            cover: "/" + webpCoverPath,
                        });
                        await newSong.save();

                        targetAlbum.songs.push(newSong._id);
                        await targetAlbum.save();

                        await unlink(file.path);

                        res.status(201).json({ message: "Song uploaded successfully" });
                    });
                })
                .on("error", (err) => {
                    if (existsSync(`uploads/albums/${targetAlbum.id}/${newSongId}`)) {
                        unlink(`uploads/albums/${targetAlbum.id}/${newSongId}`);
                    }

                    if (existsSync(file.path)) {
                        unlink(file.path);
                    }

                    console.error(err);
                    res.status(500).send("An error occurred while processing the file");
                })
                .run();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurred while uploading the file." });
        }
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
    const musicStorePaths = [
        "uploads/albumCovers",
        "uploads/songCovers",
        "uploads/sources",
        "uploads/albums",
    ];
    musicStorePaths.forEach((path) => {
        if (!existsSync(path)) {
            mkdir(path, { recursive: true });
        }
    });
    connect();
});

function formatDuration(duration: number) {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration - minutes * 60);

    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}
