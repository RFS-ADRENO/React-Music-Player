import { Schema } from "mongoose";
import { v4 } from "uuid";

export const AlbumSchema = new Schema({
    id: {
        type: String,
        required: true,
        default: v4,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    artist: {
        type: Schema.Types.ObjectId,
        ref: "Artist",
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    cover: {
        type: String,
        required: true
    },
    songs: [{
        type: Schema.Types.ObjectId,
        ref: "Song"
    }]
});
