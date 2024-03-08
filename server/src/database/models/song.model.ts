import { Schema } from "mongoose";
import { v4 } from "uuid";

export const SongSchema = new Schema({
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
    playtime: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    cover: {
        type: String,
        required: true
    },
});
