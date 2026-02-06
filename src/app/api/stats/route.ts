import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    // 1. Get total count of unique hosts
    const countRes = await query(`
      SELECT count(DISTINCT host) FROM client_network
    `);
    const totalHosts = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalHosts / limit);

    // 2. Get latest stats from client_network with pagination
    const networkRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        "IP_Address" as ip, 
        "MacAddress" as mac, 
        time
      FROM client_network
      ORDER BY host, time DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    if (networkRes.rows.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { totalHosts, totalPages, currentPage: page }
      });
    }

    const hostnames = networkRes.rows.map(r => r.host);

    // 3. Get latest CPU usage for these hosts
    const cpuRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        (100 - usage_idle) as cpu_active, 
        time
      FROM cpu
      WHERE cpu = 'cpu-total' AND host = ANY($1)
      ORDER BY host, time DESC
    `, [hostnames]);

    // 4. Get latest Memory usage for these hosts
    const memRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        used_percent, 
        total,
        used,
        time
      FROM mem
      WHERE host = ANY($1)
      ORDER BY host, time DESC
    `, [hostnames]);

    // 5. Get System info (uptime) for these hosts
    const systemRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        uptime, 
        time
      FROM system
      WHERE host = ANY($1)
      ORDER BY host, time DESC
    `, [hostnames]);

    // Combine results
    const hostsMap: Record<string, any> = {};

    networkRes.rows.forEach(r => {
      const isOnline = (new Date().getTime() - new Date(r.time).getTime()) < 300000;
      hostsMap[r.host] = {
        hostname: r.host,
        ip: r.ip,
        mac: r.mac,
        status: isOnline ? 'online' : 'offline',
        lastUpdate: r.time
      };
    });

    cpuRes.rows.forEach(r => {
      if (hostsMap[r.host]) {
        hostsMap[r.host].cpu = Math.round(r.cpu_active);
      }
    });

    memRes.rows.forEach(r => {
      if (hostsMap[r.host]) {
        hostsMap[r.host].ram = Math.round(r.used_percent);
        hostsMap[r.host].ramTotal = r.total;
        hostsMap[r.host].ramUsed = r.used;
      }
    });

    systemRes.rows.forEach(r => {
      if (hostsMap[r.host]) {
        const uptimeSeconds = parseInt(r.uptime);
        const days = Math.floor(uptimeSeconds / (24 * 3600));
        const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
        hostsMap[r.host].uptime = `${days}d ${hours}h`;
      }
    });

    return NextResponse.json({
      data: Object.values(hostsMap),
      pagination: {
        totalHosts,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error: any) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
