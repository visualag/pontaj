import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    userId: string;
    userName: string;
    email?: string;
    role: 'user' | 'admin';
    isOwner?: boolean;
    locationId?: string;
    lastSeen: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        userName: { type: String, required: true },
        email: { type: String },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        isOwner: { type: Boolean, default: false },
        locationId: { type: String },
        lastSeen: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
