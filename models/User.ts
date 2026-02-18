import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    userId: string;
    userName: string;
    email?: string;
    role: string; // 'user' | 'admin'
    lastSeen: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        userName: { type: String, required: true },
        email: { type: String },
        role: { type: String, default: 'user' },
        lastSeen: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
