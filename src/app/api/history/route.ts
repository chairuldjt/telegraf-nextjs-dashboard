import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');
    const type = searchParams.get('type') || 'cpu';

    if (!host) return NextResponse.json({ error: 'Host required' }, { status: 400 });

    try {
        let stats = [];
        if (type === 'cpu') {
            const res = await query(`
        SELECT time, usage_active as usage
        FROM cpu
        WHERE host = $1 AND cpu = 'cpu-total'
        ORDER BY time DESC
        LIMIT 20
      `, [host]);
            stats = res.rows.reverse().map(r => ({
                time: new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                usage: Math.round(r.usage)
            }));
        } else {
            const res = await query(`
        SELECT time, used_percent as usage
        FROM mem
        WHERE host = $1
        ORDER BY time DESC
        LIMIT 20
      `, [host]);
            stats = res.rows.reverse().map(r => ({
                time: new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                usage: Math.round(r.usage)
            }));
        }

        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
