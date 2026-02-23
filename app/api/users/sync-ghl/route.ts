import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import LocationSettings from '@/models/LocationSettings';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get('locationId');
        const companyId = searchParams.get('companyId');

        // Check for placeholder locationId
        const isPlaceholder = !locationId || ['location', '{location.id}', '{{location.id}}'].includes(locationId.toLowerCase());

        let settings = null;
        if (!isPlaceholder) {
            settings = await LocationSettings.findOne({ locationId });
        }

        // Fallback to companyId if location search failed or was placeholder
        if (!settings && companyId) {
            settings = await LocationSettings.findOne({ companyId });
        }

        if (!settings) {
            return NextResponse.json({
                hasKey: false,
                hasAgencyKey: false,
                hasCompanyId: false,
                isPlaceholder
            });
        }

        return NextResponse.json({
            hasKey: !!settings.apiKey,
            hasAgencyKey: !!settings.agencyApiKey,
            hasCompanyId: !!settings.companyId,
            companyId: settings.companyId || '',
            isPlaceholder
        });
    } catch (error) {
        return NextResponse.json({ hasKey: false, hasAgencyKey: false, hasCompanyId: false });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        let { apiKey, agencyApiKey, locationId, companyId } = await request.json();

        // Normalize placeholder locationId
        const isPlaceholder = !locationId || ['location', '{location.id}', '{{location.id}}'].includes(locationId.toLowerCase());
        const effectiveLocationId = isPlaceholder ? null : locationId;

        if (!effectiveLocationId && !companyId) {
            return NextResponse.json({ error: 'Introduceți un Location ID sau un Company ID.' }, { status: 400 });
        }

        // --- 1. SAVE/UPDATE SETTINGS ---
        const updateFields: any = { updatedAt: new Date() };
        if (apiKey) updateFields.apiKey = apiKey;
        if (agencyApiKey) updateFields.agencyApiKey = agencyApiKey;
        if (companyId) updateFields.companyId = companyId;
        if (effectiveLocationId) updateFields.locationId = effectiveLocationId;

        // Try to find existing record by locationId OR companyId
        let query: any = {};
        if (effectiveLocationId) query.locationId = effectiveLocationId;
        else if (companyId) query.companyId = companyId;

        const settings = await LocationSettings.findOneAndUpdate(
            query,
            updateFields,
            { upsert: true, new: true }
        );

        // --- 2. RESOLVE KEYS TO USE ---
        const activeApiKey = apiKey || settings?.apiKey;
        const activeAgencyKey = agencyApiKey || settings?.agencyApiKey;
        const activeCompanyId = companyId || settings?.companyId;

        if (!activeApiKey && !activeAgencyKey) {
            return NextResponse.json({ error: 'Lipsesc cheile API (Private Integration Tokens).' }, { status: 400 });
        }

        const stats = { total: 0, added: 0, updated: 0, agencyUsers: 0 };

        // GHL API V2 base + headers helper
        const GHL_V2_BASE = 'https://services.leadconnectorhq.com';
        const ghlV2Headers = (token: string) => ({
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
        });

        // Helper to upsert GHL users into our DB
        const processUsers = async (users: any[], source: 'location' | 'agency') => {
            for (const ghlUser of users) {
                const userId = ghlUser.id;
                if (!userId) continue;

                const firstName = ghlUser.firstName || '';
                const lastName = ghlUser.lastName || '';
                const userName = ghlUser.name || `${firstName} ${lastName}`.trim() || 'Unknown';
                const email = ghlUser.email || '';
                const userLocationId = ghlUser.locationId || effectiveLocationId || locationId;

                let role: 'user' | 'admin' = 'user';
                // If synced via Agency key OR GHL says they are admin/agency/owner
                const ghlRole = ghlUser.role || ghlUser.type || '';
                const rolesType = ghlUser.roles?.type || '';
                if (
                    source === 'agency' ||
                    ghlRole === 'admin' || ghlRole === 'agency' || ghlRole === 'owner' ||
                    rolesType === 'admin' || rolesType === 'agency'
                ) {
                    role = 'admin';
                }

                const existingUser = await User.findOne({ userId });
                if (!existingUser) {
                    await User.create({
                        userId, userName, email,
                        locationId: userLocationId,
                        role, isOwner: false,
                        lastSeen: new Date()
                    });
                    stats.added++;
                } else {
                    existingUser.userName = userName;
                    existingUser.email = email;
                    // Only update locationId if the current one is placeholder or it changed
                    if (!existingUser.locationId || ['location', '{location.id}'].includes(existingUser.locationId)) {
                        existingUser.locationId = userLocationId;
                    }
                    if (role === 'admin') existingUser.role = 'admin';
                    await existingUser.save();
                    stats.updated++;
                }
            }
        };

        // --- 3. SYNC LOCATION USERS ---
        if (activeApiKey && effectiveLocationId) {
            console.log(`Syncing Location Users for ${effectiveLocationId}...`);
            try {
                const response = await fetch(`${GHL_V2_BASE}/users/?locationId=${effectiveLocationId}`, {
                    headers: ghlV2Headers(activeApiKey)
                });

                if (response.ok) {
                    const data = await response.json();
                    const users = data.users || (Array.isArray(data) ? data : []);
                    console.log(`Found ${users.length} location users.`);
                    await processUsers(users, 'location');
                    stats.total += users.length;
                }
            } catch (err) {
                console.error('Location Sync Failed', err);
            }
        }

        // --- 4. SYNC AGENCY USERS ---
        if (activeAgencyKey) {
            console.log(`Syncing Agency Users (CompanyID: ${activeCompanyId})...`);
            try {
                const url = activeCompanyId
                    ? `${GHL_V2_BASE}/users/?companyId=${activeCompanyId}`
                    : `${GHL_V2_BASE}/users/`;

                const response = await fetch(url, { headers: ghlV2Headers(activeAgencyKey) });

                if (response.ok) {
                    const data = await response.json();
                    let allUsers = data.users || (Array.isArray(data) ? data : []);
                    console.log(`Total users returned from Agency API: ${allUsers.length}`);

                    // INCLUSIVE IMPORT: We import EVERYONE returned by the agency key.
                    // This fixes the "zero users" issue where filters were too strict.
                    await processUsers(allUsers, 'agency');
                    stats.total += allUsers.length;
                    stats.agencyUsers = allUsers.length;
                }
            } catch (err) {
                console.error('Agency Sync Failed', err);
            }
        }

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
