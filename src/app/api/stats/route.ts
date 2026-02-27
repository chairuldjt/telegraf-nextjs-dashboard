import { NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';

// Simple in-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  // Check cache
  if (page === 1 && limit === 10 && cache && (Date.now() - cache.timestamp) < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Single consolidated query using CTEs and LATERAL JOINs for maximum efficiency
    const resultQuery = await query(`
      WITH summary_data AS (
        SELECT 
          count(DISTINCT host) as total,
          count(DISTINCT CASE WHEN time > now() - interval '5 minutes' THEN host END) as online,
          (SELECT AVG(100 - usage_idle) FROM cpu WHERE cpu = 'cpu-total' AND time > now() - interval '5 minutes') as avg_cpu,
          (SELECT AVG(used_percent) FROM mem WHERE time > now() - interval '5 minutes') as avg_ram
        FROM client_network
      ),
      paged_hosts AS (
        SELECT DISTINCT ON (host) 
          host, "IP_Address" as ip, "MacAddress" as mac, time as last_seen
        FROM client_network
        ORDER BY host, time DESC
        LIMIT $1 OFFSET $2
      )
      SELECT 
        h.*,
        c.usage_user, c.usage_system, c.usage_iowait, (100 - c.usage_idle) as cpu_total,
        m.used_percent, m.available_percent, m.total as ram_total, m.used as ram_used,
        s.uptime, s.load1, s.load5, s.load15,
        (SELECT total FROM summary_data) as global_total,
        (SELECT online FROM summary_data) as global_online,
        (SELECT avg_cpu FROM summary_data) as global_avg_cpu,
        (SELECT avg_ram FROM summary_data) as global_avg_ram
      FROM paged_hosts h
      LEFT JOIN LATERAL (
        SELECT usage_user, usage_system, usage_iowait, usage_idle 
        FROM cpu 
        WHERE host = h.host AND cpu = 'cpu-total' 
        ORDER BY time DESC LIMIT 1
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT used_percent, available_percent, total, used 
        FROM mem 
        WHERE host = h.host 
        ORDER BY time DESC LIMIT 1
      ) m ON true
      LEFT JOIN LATERAL (
        SELECT uptime, load1, load5, load15 
        FROM system 
        WHERE host = h.host 
        ORDER BY time DESC LIMIT 1
      ) s ON true;
    `, [limit, offset]);

    if (resultQuery.rows.length === 0) {
      // Fallback for empty results
      const totalRes = await query(`SELECT count(DISTINCT host) FROM client_network`);
      const total = parseInt(totalRes.rows[0].count || '0');
      return NextResponse.json({
        data: [],
        summary: { total, online: 0, offline: total, avgCpu: 0, avgRam: 0 },
        pagination: { totalHosts: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
      });
    }

    const first = resultQuery.rows[0];
    const totalHosts = parseInt(first.global_total || '0');
    const onlineHosts = parseInt(first.global_online || '0');
    const offlineHosts = totalHosts - onlineHosts;
    const avgCpuValue = Math.round(parseFloat(first.global_avg_cpu || '0'));
    const avgRamValue = Math.round(parseFloat(first.global_avg_ram || '0'));

    const formattedData = resultQuery.rows.map(r => {
      const isOnline = (new Date().getTime() - new Date(r.last_seen).getTime()) < 300000;
      const uptimeSec = parseInt(r.uptime || '0');

      const cpuUser = Math.round(parseFloat(r.usage_user || '0'));
      const cpuSystem = Math.round(parseFloat(r.usage_system || '0'));
      const cpuIowait = Math.round(parseFloat(r.usage_iowait || '0'));

      return {
        hostname: r.host,
        ip: r.ip,
        mac: r.mac,
        status: isOnline ? 'online' : 'offline',
        lastUpdate: r.last_seen,
        cpu: Math.round(parseFloat(r.cpu_total || '0')),
        cpuBreakdown: { user: cpuUser, system: cpuSystem, iowait: cpuIowait },
        ram: Math.round(parseFloat(r.used_percent || '0')),
        ramAvailablePercent: Math.round(parseFloat(r.available_percent || '0')),
        ramTotal: r.ram_total,
        ramUsed: r.ram_used,
        uptime: `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h`,
        load: {
          l1: parseFloat(r.load1 || '0').toFixed(2),
          l5: parseFloat(r.load5 || '0').toFixed(2),
          l15: parseFloat(r.load15 || '0').toFixed(2)
        }
      };
    });

    const responseData = {
      data: formattedData,
      summary: {
        total: totalHosts,
        online: onlineHosts,
        offline: offlineHosts,
        avgCpu: avgCpuValue,
        avgRam: avgRamValue
      },
      pagination: {
        totalHosts,
        totalPages: Math.ceil(totalHosts / limit),
        currentPage: page,
        limit
      }
    };

    // Update cache
    if (page === 1 && limit === 10) {
      cache = { data: responseData, timestamp: Date.now() };
    }

    return NextResponse.json({
      ...responseData,
      dbDiagnostics: {
        totalConnections: (pool as any).totalCount,
        idleConnections: (pool as any).idleCount,
        waitingRequests: (pool as any).waitingCount
      }
    });

  } catch (error: any) {
    console.error('Database Error Details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    return NextResponse.json({
      error: 'Database error occurred',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
