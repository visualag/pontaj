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
    const logs: string[] = [];
    const pushLog = (msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[SYNC LOG ${timestamp}] ${msg}`);
        logs.push(`${timestamp}: ${msg}`);
    };

    try {
        await dbConnect();
        let { apiKey, agencyApiKey, locationId, companyId, updatedBy } = await request.json();

        pushLog(`Starting sync for User: ${updatedBy || 'unknown'}`);
        pushLog(`Input: locationId=${locationId}, companyId=${companyId}, hasLocKey=${!!apiKey}, hasAgencyKey=${!!agencyApiKey}`);

        // Normalize placeholder locationId
        const isPlaceholder = !locationId || ['location', '{location.id}', '{{location.id}}'].includes(String(locationId).toLowerCase());
        const effectiveLocationId = isPlaceholder ? null : locationId;
        pushLog(`Effective Location ID: ${effectiveLocationId || 'NONE (Placeholder or empty)'}`);

        if (!effectiveLocationId && !companyId) {
            pushLog('Validation failed: No valid IDs provided.');
            return NextResponse.json({ error: 'Introduceți un Location ID sau un Company ID.', logs }, { status: 400 });
        }

        // --- 1. SAVE/UPDATE SETTINGS ---
        const updateFields: any = { updatedAt: new Date() };
        if (apiKey) updateFields.apiKey = apiKey;
        if (agencyApiKey) updateFields.agencyApiKey = agencyApiKey;
        if (companyId) updateFields.companyId = companyId;
        if (effectiveLocationId) updateFields.locationId = effectiveLocationId;

        let query: any = {};
        if (effectiveLocationId) query.locationId = effectiveLocationId;
        else if (companyId) query.companyId = companyId;

        pushLog(`Updating settings in DB using query: ${JSON.stringify(query)}`);
        const settings = await LocationSettings.findOneAndUpdate(
            query,
            updateFields,
            { upsert: true, new: true }
        );
        pushLog(`Settings saved/updated. ID in DB: ${settings?._id}`);

        // --- 2. RESOLVE KEYS TO USE ---
        const activeApiKey = (apiKey || settings?.apiKey || '').trim();
        const activeAgencyKey = (agencyApiKey || settings?.agencyApiKey || '').trim();
        const activeCompanyId = (companyId || settings?.companyId || '').trim();

        pushLog(`Resolved keys: activeLocKey=${!!activeApiKey}, activeAgencyKey=${!!activeAgencyKey}, activeCompanyId=${activeCompanyId || 'NONE'}`);

        if (!activeApiKey && !activeAgencyKey) {
            pushLog('Validation failed: No API keys found.');
            return NextResponse.json({ error: 'Lipsesc cheile API (Private Integration Tokens).', logs }, { status: 400 });
        }

        const stats = { total: 0, added: 0, updated: 0, agencyUsers: 0, errors: [] as string[] };

        // GHL API V2 base + headers helper
        const GHL_V2_BASE = 'https://services.leadconnectorhq.com';
        const ghlV2Headers = (token: string) => ({
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
        });

        // Helper to upsert GHL users into our DB
        const processUsers = async (users: any[], source: 'location' | 'agency') => {
            pushLog(`Processing ${users.length} users from ${source}...`);
            if (users.length > 0) {
                pushLog(`Sample user from GHL: ${JSON.stringify(users[0]).substring(0, 200)}...`);
            }

            for (const ghlUser of users) {
                try {
                    const userId = ghlUser.id;
                    if (!userId) {
                        pushLog('Skipping a GHL user because it has no ID field.');
                        continue;
                    }

                    const firstName = ghlUser.firstName || '';
                    const lastName = ghlUser.lastName || '';
                    const userName = ghlUser.name || `${firstName} ${lastName}`.trim() || 'Unknown';
                    const email = ghlUser.email || '';
                    const userLocationId = ghlUser.locationId || effectiveLocationId || null;

                    // Skip placeholder users (GHL defaults like {{user.name}} or similar)
                    const isPlaceholderUser =
                        userName.includes('{{') ||
                        userName.includes('}}') ||
                        email.includes('{{') ||
                        email.includes('test') && email.includes('@');

                    if (isPlaceholderUser) {
                        pushLog(`Skipping placeholder user: ${userName} (${email})`);
                        continue;
                    }

                    let role: 'user' | 'admin' = 'user';
                    const ghlRole = (ghlUser.role || ghlUser.type || '').toLowerCase();
                    const rolesType = (ghlUser.roles?.type || '').toLowerCase();

                    if (
                        source === 'agency' ||
                        ['admin', 'agency', 'owner'].includes(ghlRole) ||
                        ['admin', 'agency'].includes(rolesType)
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
                        if (!existingUser.locationId || ['location', '{location.id}'].includes(existingUser.locationId)) {
                            existingUser.locationId = userLocationId;
                        }
                        if (role === 'admin') existingUser.role = 'admin';
                        await existingUser.save();
                        stats.updated++;
                    }
                } catch (userErr: any) {
                    pushLog(`Error processing individual user: ${userErr.message}`);
                }
            }
        };

        // --- 3. SYNC LOCATION USERS ---
        if (activeApiKey && effectiveLocationId) {
            pushLog(`Attempting Location Sync for ${effectiveLocationId}...`);
            try {
                const response = await fetch(`${GHL_V2_BASE}/users?locationId=${effectiveLocationId}`, {
                    headers: ghlV2Headers(activeApiKey)
                });

                pushLog(`Location API Status: ${response.status}`);
                if (response.ok) {
                    const data = await response.json();
                    const users = data.users || (Array.isArray(data) ? data : []);
                    pushLog(`Found ${users.length} location-level users.`);
                    await processUsers(users, 'location');
                    stats.total += users.length;
                } else {
                    const errText = await response.text();
                    pushLog(`Location API Error Response: ${errText.substring(0, 500)}`);
                    stats.errors.push(`Location API Error: ${response.status}`);
                }
            } catch (err: any) {
                pushLog(`Location Sync Exception: ${err.message}`);
                stats.errors.push(`Loc sync exception: ${err.message}`);
            }
        }

        // --- 4. SYNC AGENCY USERS ---
        if (activeAgencyKey) {
            pushLog(`Attempting Agency Sync (CompanyID: ${activeCompanyId || 'ALL USERS'})...`);
            try {
                // IMPORTANT: In GHL V2, to list all company users, we use /users/search
                let url = `${GHL_V2_BASE}/users/search?limit=100`;
                if (activeCompanyId) url += `&companyId=${activeCompanyId}`;

                pushLog(`Agency Search URL: ${url}`);
                const response = await fetch(url, { headers: ghlV2Headers(activeAgencyKey) });

                pushLog(`Agency Search API Status: ${response.status}`);

                if (response.ok) {
                    const data = await response.json();
                    let allUsers = data.users || (Array.isArray(data) ? data : []);
                    pushLog(`Agency Search API returned ${allUsers.length} total users.`);

                    if (allUsers.length === 0) {
                        pushLog('WARNING: Agency Search returned 0 users. Check if the token has "users.readonly" scope.');
                    }

                    await processUsers(allUsers, 'agency');
                    stats.total += allUsers.length;
                    stats.agencyUsers = allUsers.length;
                } else {
                    const errText = await response.text();
                    pushLog(`Agency Search API Error Response: ${errText.substring(0, 500)}`);
                    stats.errors.push(`Agency Search API Error: ${response.status}`);
                }
            } catch (err: any) {
                pushLog(`Agency Search Exception: ${err.message}`);
                stats.errors.push(`Agency search exception: ${err.message}`);
            }
        }

        pushLog(`Sync complete. Total: ${stats.total}, Added: ${stats.added}, Updated: ${stats.updated}`);
        return NextResponse.json({ success: true, stats, logs });
    } catch (error: any) {
        pushLog(`CRITICAL API ERROR: ${error.message}`);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message, logs }, { status: 500 });
    }
}
