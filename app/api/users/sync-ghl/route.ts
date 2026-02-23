import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import LocationSettings from '@/models/LocationSettings';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get('locationId');

        if (!locationId) return NextResponse.json({ hasKey: false, hasAgencyKey: false, hasCompanyId: false });

        const settings = await LocationSettings.findOne({ locationId });
        return NextResponse.json({
            hasKey: !!settings?.apiKey,
            hasAgencyKey: !!settings?.agencyApiKey,
            hasCompanyId: !!settings?.companyId,
            companyId: settings?.companyId || ''
        });
    } catch (error) {
        return NextResponse.json({ hasKey: false, hasAgencyKey: false, hasCompanyId: false });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        let { apiKey, agencyApiKey, locationId, companyId } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Missing Location ID' }, { status: 400 });
        }

        // --- 1. SAVE KEYS ---
        const updateFields: any = { updatedAt: new Date() };
        if (apiKey) updateFields.apiKey = apiKey;
        if (agencyApiKey) updateFields.agencyApiKey = agencyApiKey;
        if (companyId) updateFields.companyId = companyId;

        const settings = await LocationSettings.findOneAndUpdate(
            { locationId },
            updateFields,
            { upsert: true, new: true }
        );

        // --- 2. RESOLVE KEYS TO USE ---
        const activeApiKey = apiKey || settings?.apiKey;
        const activeAgencyKey = agencyApiKey || settings?.agencyApiKey;
        const activeCompanyId = companyId || settings?.companyId;

        if (!activeApiKey && !activeAgencyKey) {
            return NextResponse.json({ error: 'Missing API Keys (None provided or saved)' }, { status: 400 });
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

                let role: 'user' | 'admin' = 'user';
                if (source === 'agency') {
                    role = 'admin'; // All agency-key users = admin in our app
                } else {
                    const ghlRole = ghlUser.role || ghlUser.type || '';
                    const rolesType = ghlUser.roles?.type || '';
                    if (
                        ghlRole === 'admin' || ghlRole === 'agency' ||
                        rolesType === 'admin' || rolesType === 'agency'
                    ) {
                        role = 'admin';
                    }
                }

                // IMPORTANT: When syncing from agency level, we update the user's role to admin
                // even if they were previously synced as a regular user from a location level.
                const existingUser = await User.findOne({ userId });
                if (!existingUser) {
                    await User.create({
                        userId, userName, email,
                        locationId, role, isOwner: false,
                        lastSeen: new Date()
                    });
                    stats.added++;
                } else {
                    existingUser.userName = userName;
                    existingUser.email = email;
                    // If we have a locationId from this sync, use it. 
                    // But don't overwrite user's location if we are just syncing agency admins globally?
                    // For now, keep it simple.
                    existingUser.locationId = locationId;
                    if (source === 'agency') existingUser.role = 'admin';
                    await existingUser.save();
                    stats.updated++;
                }
            }
        };

        // --- 3. SYNC LOCATION USERS ---
        if (activeApiKey) {
            console.log('Syncing Location Users via GHL API V2...');
            try {
                let response = await fetch(`${GHL_V2_BASE}/users/?locationId=${locationId}`, {
                    headers: ghlV2Headers(activeApiKey)
                });

                if (!response.ok) {
                    // Fallback to V1
                    console.warn('V2 failed, falling back to V1 for location...');
                    response = await fetch(`https://rest.gohighlevel.com/v1/users/?locationId=${locationId}`, {
                        headers: { 'Authorization': `Bearer ${activeApiKey}` }
                    });
                }

                if (response.ok) {
                    const data = await response.json();
                    const users = data.users || (Array.isArray(data) ? data : []);
                    console.log(`Found ${users.length} location users.`);
                    await processUsers(users, 'location');
                    stats.total += users.length;
                } else {
                    const err = await response.text();
                    console.error('Location API Error:', response.status, err);
                }
            } catch (err) {
                console.error('Location Sync Failed', err);
            }
        }

        // --- 4. SYNC AGENCY USERS ---
        if (activeAgencyKey) {
            console.log(`Syncing Agency Users via GHL API V2 (CompanyID: ${activeCompanyId})...`);
            try {
                // If we have activeCompanyId, use it to filter users at the agency level
                const url = activeCompanyId
                    ? `${GHL_V2_BASE}/users/?companyId=${activeCompanyId}`
                    : `${GHL_V2_BASE}/users/`;

                let response = await fetch(url, {
                    headers: ghlV2Headers(activeAgencyKey)
                });

                console.log(`Agency API Response Status: ${response.status}`);

                if (!response.ok) {
                    const errText = await response.text();
                    console.warn(`V2 failed (${response.status}: ${errText}), falling back to V1 for agency...`);
                    response = await fetch('https://rest.gohighlevel.com/v1/users/', {
                        headers: { 'Authorization': `Bearer ${activeAgencyKey}` }
                    });
                }

                if (response.ok) {
                    const data = await response.json();
                    let allUsers = data.users || (Array.isArray(data) ? data : []);
                    console.log(`Total users returned from Agency API: ${allUsers.length}`);

                    // If we have a companyId, we trust the GHL filter.
                    // If not, we still try to filter for agency-level users.
                    const hasTypeField = allUsers.some((u: any) => u.type || u.roles?.type);
                    const users = hasTypeField
                        ? allUsers.filter((u: any) => {
                            const isAgency = u.type === 'agency' || u.roles?.type === 'agency';
                            // Also check if user belongs to this company if we have a companyId
                            // But GHL API should have filtered that already.
                            return isAgency;
                        })
                        : allUsers;

                    console.log(`Filtered Agency Users: ${users.length}`);
                    if (users.length === 0 && allUsers.length > 0) {
                        console.log('Sample user data for debugging:', JSON.stringify(allUsers[0], null, 2));
                    }

                    await processUsers(users, 'agency');
                    stats.total += users.length;
                    stats.agencyUsers = users.length;
                } else {
                    const err = await response.text();
                    console.error('Agency API Error:', response.status, err);
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
