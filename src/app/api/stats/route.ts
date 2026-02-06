import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Get latest stats from client_network (to get IP/MAC and list of hosts)
    const networkRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        "IP_Address" as ip, 
        "MacAddress" as mac, 
        time
      FROM client_network
      ORDER BY host, time DESC
    `);

    // 2. Get latest CPU usage
    const cpuRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        (100 - usage_idle) as cpu_active, 
        time
      FROM cpu
      WHERE cpu = 'cpu-total'
      ORDER BY host, time DESC
    `);

    // 3. Get latest Memory usage
    const memRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        used_percent, 
        total,
        used,
        time
      FROM mem
      ORDER BY host, time DESC
    `);

    // 4. Get System info (uptime and load)
    const systemRes = await query(`
      SELECT DISTINCT ON (host) 
        host, 
        uptime, 
        load1,
        load5,
        load15,
        time
      FROM system
      ORDER BY host, time DESC
    `);

    // Combine results by host
    const hostsMap: Record<string, any> = {};

    networkRes.rows.forEach(r => {
      const isOnline = (new Date().getTime() - new Date(r.time).getTime()) < 300000; // 5 mins threshold
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
        hostsMap[r.host].load = {
          l1: r.load1?.toFixed(2) || '0.00',
          l5: r.load5?.toFixed(2) || '0.00',
          l15: r.load15?.toFixed(2) || '0.00'
        };
      }
    });

    return NextResponse.json(Object.values(hostsMap));
  } catch (error: any) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
