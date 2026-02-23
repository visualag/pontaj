import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocationSettings extends Document {
    locationId: string;
    apiKey: string; // Location API Key
    agencyApiKey?: string; // Agency API Key (Optional)
    companyId?: string; // Agency Company ID (Optional)
    updatedBy?: string;
}

const LocationSettingsSchema: Schema<ILocationSettings> = new Schema(
    {
        locationId: { type: String, index: true }, // Not unique anymore to allow Agency-level placeholders
        apiKey: { type: String }, // Optional now if using agency key
        agencyApiKey: { type: String },
        companyId: { type: String, index: true },
        updatedBy: { type: String },
    },
    { timestamps: true }
);

const LocationSettings: Model<ILocationSettings> =
    mongoose.models.LocationSettings || mongoose.model<ILocationSettings>('LocationSettings', LocationSettingsSchema);

export default LocationSettings;
