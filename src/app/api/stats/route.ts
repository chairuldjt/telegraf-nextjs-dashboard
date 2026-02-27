import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Simple in-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  // Check cache (only for page 1 with default limit for simplicity and maximum impact)
  if (page === 1 && limit === 10 && cache && (Date.now() - cache.timestamp) < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // 1. Get Summary Stats (Total, Online, Offline)
    const summaryRes = await query(`
      SELECT 
        count(DISTINCT host) as total,
        count(DISTINCT CASE WHEN time > now() - interval '5 minutes' THEN host END) as online,
        (SELECT AVG(100 - usage_idle) FROM cpu WHERE cpu = 'cpu-total' AND time > now() - interval '5 minutes') as avg_cpu,
        (SELECT AVG(used_percent) FROM mem WHERE time > now() - interval '5 minutes') as avg_ram
      FROM client_network
    `);

    const totalHosts = parseInt(summaryRes.rows[0].total || '0');
    const onlineHosts = parseInt(summaryRes.rows[0].online || '0');
    const rawAvgCpu = parseFloat(summaryRes.rows[0].avg_cpu);
    const rawAvgRam = parseFloat(summaryRes.rows[0].avg_ram);
    const avgCpu = isNaN(rawAvgCpu) ? 0 : Math.round(rawAvgCpu);
    const avgRam = isNaN(rawAvgRam) ? 0 : Math.round(rawAvgRam);
    const offlineHosts = totalHosts - onlineHosts;
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
        summary: { total: totalHosts, online: onlineHosts, offline: offlineHosts },
        pagination: { totalHosts, totalPages, currentPage: page }
      });
    }

    const hostnames = networkRes.rows.map(r => r.host);

    // 3. Get latest CPU usage and breakdown for these hosts
    const cpuRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        (100 - usage_idle) as cpu_active, 
        usage_user,
        usage_system,
        usage_iowait,
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
        available_percent,
        total,
        used,
        time
      FROM mem
      WHERE host = ANY($1)
      ORDER BY host, time DESC
    `, [hostnames]);

    // 5. Get System info (uptime, load) for these hosts
    const systemRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        uptime, 
        load1,
        load5,
        load15,
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
        const cpuUser = Math.round(parseFloat(r.usage_user));
        const cpuSystem = Math.round(parseFloat(r.usage_system));
        const cpuIowait = Math.round(parseFloat(r.usage_iowait));

        hostsMap[r.host].cpu = Math.round(r.cpu_active);
        hostsMap[r.host].cpuBreakdown = {
          user: isNaN(cpuUser) ? 0 : cpuUser,
          system: isNaN(cpuSystem) ? 0 : cpuSystem,
          iowait: isNaN(cpuIowait) ? 0 : cpuIowait
        };
      }
    });

    memRes.rows.forEach(r => {
      if (hostsMap[r.host]) {
        const ramUsedPercent = Math.round(parseFloat(r.used_percent));
        const ramAvailablePercent = Math.round(parseFloat(r.available_percent));

        hostsMap[r.host].ram = isNaN(ramUsedPercent) ? 0 : ramUsedPercent;
        hostsMap[r.host].ramAvailablePercent = isNaN(ramAvailablePercent) ? 100 : ramAvailablePercent;
        hostsMap[r.host].ramTotal = r.total;
        hostsMap[r.host].ramUsed = r.used;
      }
    });

    systemRes.rows.forEach(r => {
      if (hostsMap[r.host]) {
        const uptimeSeconds = parseInt(r.uptime || '0');
        const days = Math.floor(uptimeSeconds / (24 * 3600));
        const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
        hostsMap[r.host].uptime = `${days}d ${hours}h`;

        const l1 = parseFloat(r.load1);
        const l5 = parseFloat(r.load5);
        const l15 = parseFloat(r.load15);
        hostsMap[r.host].load = {
          l1: isNaN(l1) ? '0.00' : l1.toFixed(2),
          l5: isNaN(l5) ? '0.00' : l5.toFixed(2),
          l15: isNaN(l15) ? '0.00' : l15.toFixed(2)
        };
      }
    });

    const responseData = {
      data: Object.values(hostsMap),
      summary: {
        total: totalHosts,
        online: onlineHosts,
        offline: offlineHosts,
        avgCpu,
        avgRam
      },
      pagination: {
        totalHosts,
        totalPages,
        currentPage: page,
        limit
      }
    };

    // Update cache
    if (page === 1 && limit === 10) {
      cache = { data: responseData, timestamp: Date.now() };
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
