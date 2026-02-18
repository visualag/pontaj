import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimeLog extends Document {
    userId: string;
    userName?: string;
    email?: string;
    checkIn: Date;
    checkOut?: Date;
    duration?: number;
    description?: string;
    dateString: string;
    isActive: boolean;
    autoStopped?: boolean;
    warningMessage?: string;
}

const TimeLogSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    userName: { type: String },
    email: { type: String },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    duration: { type: Number }, // in minutes
    description: { type: String },
    dateString: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    isActive: { type: Boolean, default: true },
    autoStopped: { type: Boolean, default: false },
    warningMessage: { type: String },
}, {
    timestamps: true,
});

// Prevent model recompilation error in development
const TimeLog: Model<ITimeLog> = mongoose.models.TimeLog || mongoose.model<ITimeLog>('TimeLog', TimeLogSchema);

export default TimeLog;
