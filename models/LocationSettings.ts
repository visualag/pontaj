import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocationSettings extends Document {
    locationId: string;
    apiKey: string; // Encrypted ideally, but stored raw for V1 simplicity as per user request
    updatedBy?: string;
}

const LocationSettingsSchema: Schema<ILocationSettings> = new Schema(
    {
        locationId: { type: String, required: true, unique: true },
        apiKey: { type: String, required: true },
        updatedBy: { type: String },
    },
    { timestamps: true }
);

const LocationSettings: Model<ILocationSettings> =
    mongoose.models.LocationSettings || mongoose.model<ILocationSettings>('LocationSettings', LocationSettingsSchema);

export default LocationSettings;
