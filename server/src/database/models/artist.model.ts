import { Schema } from "mongoose";
import { v4 } from "uuid";

export const ArtistSchema = new Schema({
    id: {
        type: String,
        required: true,
        default: v4,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
});
