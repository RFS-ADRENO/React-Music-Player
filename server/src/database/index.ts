import mongoose from "mongoose";
import { AlbumSchema } from "./models/album.model.js";
import { SongSchema } from "./models/song.model.js";
import { ArtistSchema } from "./models/artist.model.js";

export const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI!);
        console.log("Database connected");
    } catch (error) {
        console.log("Database connection failed", error);
    }
};

export const Album = mongoose.model("Album", AlbumSchema);
export const Song = mongoose.model("Song", SongSchema);
export const Artist = mongoose.model("Artist", ArtistSchema);
