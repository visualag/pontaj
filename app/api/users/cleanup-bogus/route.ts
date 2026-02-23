import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// DELETE /api/users/cleanup-bogus
// Removes placeholder GHL users, random-char test users, and sub-account users that slipped in
export async function DELETE() {
    try {
        await dbConnect();

        // Remove users with GHL unresolved placeholders in userId/userName/email
        const result = await User.deleteMany({
            $or: [
                // GHL placeholder user (unresolved template variables)
                { userId: { $regex: /\{\{/ } },
                { userName: { $regex: /\{\{/ } },
                { email: { $regex: /\{\{/ } },
                // Known garbage userIds from test data
                { userId: 'JDrhQtQ7dGE93h7odSqg' },
                { userId: 'JDrhQtQ7dGEvFhF83Sqg' },
                { userId: 'ewYJUHEpmcAuBHMjgzak' }, // test1 test1
                { userId: 'SuDSBek2TbPSRmUZP5C4' }, // MSG MODA ALISS - sub-account client
                { userId: 'BTtn9q0ujLZ8nlcxOJW0' }, // Moda Aliss USR - sub-account client
                // Users with placeholder locationId string
                { locationId: 'location' },
            ]
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `Deleted ${result.deletedCount} bogus users`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Also expose GET to see what WOULD be deleted (dry run)
export async function GET() {
    try {
        await dbConnect();
        const toDelete = await User.find({
            $or: [
                { userId: { $regex: /\{\{/ } },
                { userName: { $regex: /\{\{/ } },
                { email: { $regex: /\{\{/ } },
                { userId: 'JDrhQtQ7dGE93h7odSqg' },
                { userId: 'JDrhQtQ7dGEvFhF83Sqg' },
                { userId: 'ewYJUHEpmcAuBHMjgzak' },
                { locationId: 'location' },
            ]
        }).lean();

        return NextResponse.json({
            wouldDelete: toDelete.length,
            users: toDelete.map((u: any) => ({ userId: u.userId, userName: u.userName, email: u.email, locationId: u.locationId }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
