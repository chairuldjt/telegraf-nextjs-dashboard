"use client";

import { useState, useEffect } from "react";
import { NavbarWithMenu } from "@/components/ui/navbar-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Cpu,
  Database,
  Monitor,
  Network,
  Server,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface PCStats {
  hostname: string;
  ip: string;
  mac: string;
  status: 'online' | 'offline';
  cpu: number;
  ram: number;
  uptime: string;
}

export default function Dashboard() {
  const [pcs, setPcs] = useState<PCStats[]>([]);
  const [selectedPC, setSelectedPC] = useState<PCStats | null>(null);
  const [history, setHistory] = useState<{ time: string; usage: number }[]>([]);
  const [chartType, setChartType] = useState<'cpu' | 'ram'>('cpu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPC) {
      fetchHistory(selectedPC.hostname, chartType);
    }
  }, [selectedPC, chartType]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPcs(data);
      if (!selectedPC && data.length > 0) {
        setSelectedPC(data[0]);
      } else if (selectedPC) {
        // Update selected PC with fresh data
        const updated = data.find((p: any) => p.hostname === selectedPC.hostname);
        if (updated) setSelectedPC(updated);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchHistory = async (host: string, type: string) => {
    try {
      const res = await fetch(`/api/history?host=${host}&type=${type}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isMounted) return null;

  const navbarSections = [
    {
      id: "monitoring",
      links: [
        { label: "Real-time Stats", href: "#", description: "View live data from agents", icon: <Activity className="w-5 h-5" /> },
        { label: "Alerts & Logs", href: "#", description: "Check system health alerts", icon: <Database className="w-5 h-5" /> },
      ]
    }
  ];

  const avgCpu = pcs.length ? Math.round(pcs.reduce((acc, p) => acc + (p.cpu || 0), 0) / pcs.length) : 0;
  const avgRam = pcs.length ? Math.round(pcs.reduce((acc, p) => acc + (p.ram || 0), 0) / pcs.length) : 0;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <NavbarWithMenu
        sections={navbarSections}
        navItems={[
          { type: "dropdown", label: "Monitoring", menu: "monitoring" },
          { type: "link", label: "Refresh", href: "#" },
        ]}
        logo={<div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><Server className="text-blue-500" /> TELEGRAF</div>}
        cta={<Badge className="bg-blue-500/20 text-blue-500 border-blue-500/20 px-3 py-1 font-mono uppercase tracking-widest text-[10px]">Production</Badge>}
      />

      <main className="container mx-auto p-4 lg:p-8 space-y-8 -mt-64 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              System Overview
            </h1>
            <p className="text-zinc-500">Monitoring {pcs.length} agents across the network.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded-full border border-white/5 backdrop-blur">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Auto-refreshing every 30s
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Database Connection Error: {error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Online PCs", value: pcs.filter(p => p.status === "online").length, icon: <Monitor className="text-green-500" /> },
            { title: "Avg CPU Load", value: `${avgCpu}%`, icon: <Cpu className="text-blue-500" /> },
            { title: "Avg RAM Usage", value: `${avgRam}%`, icon: <Activity className="text-purple-500" /> },
            { title: "Offline PCs", value: pcs.filter(p => p.status === "offline").length, icon: <Monitor className="text-red-500" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{stat.title}</span>
                  {stat.icon}
                </CardHeader>
                <CardContent className="text-white">
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PC List */}
          <Card className="lg:col-span-2 bg-zinc-900/50 border-white/10 backdrop-blur-md text-white overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-lg">Connected Agents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-zinc-500 pl-6 h-12 uppercase text-[10px] tracking-widest">Hostname</TableHead>
                    <TableHead className="text-zinc-500 h-12 uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-zinc-500 h-12 uppercase text-[10px] tracking-widest">CPU</TableHead>
                    <TableHead className="text-zinc-500 h-12 uppercase text-[10px] tracking-widest">RAM</TableHead>
                    <TableHead className="text-zinc-500 text-right pr-6 h-12 uppercase text-[10px] tracking-widest">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {pcs.map((pc) => (
                      <TableRow
                        key={pc.hostname}
                        className={`hover:bg-white/5 border-white/5 cursor-pointer transition-colors group ${selectedPC?.hostname === pc.hostname ? "bg-white/5" : ""}`}
                        onClick={() => setSelectedPC(pc)}
                      >
                        <TableCell className="font-medium pl-6 py-4">{pc.hostname}</TableCell>
                        <TableCell>
                          <Badge variant={pc.status === 'online' ? 'default' : 'destructive'} className={pc.status === 'online' ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                            {pc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${pc.cpu}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{pc.cpu}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${pc.ram}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{pc.ram}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <button className="text-blue-500 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Analyze</button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {pcs.length === 0 && !loading && (
                <div className="p-8 text-center text-zinc-500 italic">No agents detected. Check Telegraf configuration.</div>
              )}
            </CardContent>
          </Card>

          {/* Selected PC Details */}
          <div className="space-y-4">
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  {selectedPC?.hostname || 'Select an Agent'}
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">Real-time telemetry</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedPC ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 uppercase tracking-widest">CPU Usage</span>
                        <span className="font-mono">{selectedPC.cpu}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPC.cpu}%` }}
                          className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                      </div>

                      <div className="flex justify-between text-xs mt-4">
                        <span className="text-zinc-500 uppercase tracking-widest">RAM Usage</span>
                        <span className="font-mono">{selectedPC.ram}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPC.ram}%` }}
                          className="h-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">IP Address</span>
                        <span className="font-mono text-xs">{selectedPC.ip}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Uptime</span>
                        <span className="text-xs">{selectedPC.uptime}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-zinc-700 italic text-sm">
                    Select a host from the table
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md text-white">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">History</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChartType('cpu')}
                      className={`px-2 py-0.5 rounded text-[10px] transition ${chartType === 'cpu' ? 'bg-blue-500/20 text-blue-500' : 'text-zinc-500'}`}
                    >CPU</button>
                    <button
                      onClick={() => setChartType('ram')}
                      className={`px-2 py-0.5 rounded text-[10px] transition ${chartType === 'ram' ? 'bg-purple-500/20 text-purple-500' : 'text-zinc-500'}`}
                    >RAM</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[150px] p-2">
                {selectedPC && history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.3} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "10px" }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ color: "#71717a" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="usage"
                        stroke={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'}
                        fillOpacity={1}
                        fill="url(#colorUsage)"
                        strokeWidth={1.5}
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-700 text-[10px]">No historical data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="container mx-auto p-12 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-900/40 px-4 py-2 rounded-full border border-white/5">
          <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[9px] uppercase font-light">v1.2.0-Alpha</Badge>
          <span className="text-zinc-600 text-[11px] font-light">Next-gen Telegraf Monitoring</span>
        </div>
      </footer>
    </div>
  );
}
