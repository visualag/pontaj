import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkSchedule extends Document {
    userId: string;
    userName?: string;
    dateString: string; // Format YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    isOffDay: boolean; // If true, ignore start/end times
}

const WorkScheduleSchema: Schema<IWorkSchedule> = new Schema(
    {
        userId: { type: String, required: true },
        userName: { type: String },
        dateString: { type: String, required: true }, // Indexed for fast lookups by date
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '17:00' },
        isOffDay: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index to ensure one schedule per user per day
WorkScheduleSchema.index({ userId: 1, dateString: 1 }, { unique: true });

const WorkSchedule: Model<IWorkSchedule> =
    mongoose.models.WorkSchedule || mongoose.model<IWorkSchedule>('WorkSchedule', WorkScheduleSchema);

export default WorkSchedule;
