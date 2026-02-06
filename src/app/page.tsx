"use client";

import { useState, useEffect, useMemo } from "react";
import { NavbarWithMenu } from "@/components/ui/navbar-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Cpu,
  Database,
  Monitor,
  Network,
  Server,
  RefreshCw,
  AlertCircle,
  Search,
  Zap,
  HardDrive
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
import { formatDistanceToNow } from 'date-fns';

interface PCStats {
  hostname: string;
  ip: string;
  mac: string;
  status: 'online' | 'offline';
  cpu: number;
  ram: number;
  uptime: string;
  load?: {
    l1: string;
    l5: string;
    l15: string;
  };
  lastUpdate: string;
}

export default function Dashboard() {
  const [pcs, setPcs] = useState<PCStats[]>([]);
  const [selectedPC, setSelectedPC] = useState<PCStats | null>(null);
  const [history, setHistory] = useState<{ time: string; usage: number }[]>([]);
  const [chartType, setChartType] = useState<'cpu' | 'ram'>('cpu');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initialLoad();
    const interval = setInterval(refreshData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPC) {
      fetchHistory(selectedPC.hostname, chartType);
    }
  }, [selectedPC, chartType]);

  const initialLoad = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPcs(data);
      if (data.length > 0) {
        if (!selectedPC) {
          setSelectedPC(data[0]);
        } else {
          const updated = data.find((p: any) => p.hostname === selectedPC.hostname);
          if (updated) setSelectedPC(updated);
        }
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
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

  const filteredPcs = useMemo(() => {
    return pcs.filter(pc =>
      pc.hostname.toLowerCase().includes(search.toLowerCase()) ||
      pc.ip.includes(search)
    );
  }, [pcs, search]);

  if (!isMounted) return null;

  const navbarSections = [
    {
      id: "monitoring",
      links: [
        { label: "Real-time Stats", href: "#", description: "View live telemetry from all Telegraf agents", icon: <Activity className="w-5 h-5" /> },
        { label: "Network View", href: "#", description: "Map of agent IP distributions", icon: <Network className="w-5 h-5" /> },
      ]
    },
    {
      id: "management",
      links: [
        { label: "Agent Config", href: "#", description: "View and update telegraf.conf remotely", icon: <HardDrive className="w-5 h-5" /> },
        { label: "Logs", href: "#", description: "System and error logs from agents", icon: <Database className="w-5 h-5" /> },
      ]
    }
  ];

  const avgCpu = pcs.length ? Math.round(pcs.reduce((acc, p) => acc + (p.cpu || 0), 0) / pcs.length) : 0;
  const avgRam = pcs.length ? Math.round(pcs.reduce((acc, p) => acc + (p.ram || 0), 0) / pcs.length) : 0;

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-blue-500/20 antialiased">
      <NavbarWithMenu
        sections={navbarSections}
        navItems={[
          { type: "dropdown", label: "Monitoring", menu: "monitoring" },
          { type: "dropdown", label: "Management", menu: "management" },
        ]}
        logo={<div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><Server className="text-blue-500 w-6 h-6" /> TELEGRAF</div>}
        cta={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${refreshing ? 'animate-ping' : ''}`} />
              LIVE
            </div>
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 font-mono uppercase tracking-widest text-[10px]">v1.2.0</Badge>
          </div>
        }
      />

      <main className="container mx-auto p-4 lg:p-8 space-y-8 -mt-64 relative z-10 pb-24">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-400 to-zinc-700 bg-clip-text text-transparent">
                Systems Center
              </h1>
            </motion.div>
            <p className="text-zinc-500 font-light flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Global telemetry for {pcs.length} active nodes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search PC or IP..."
                className="bg-zinc-900/50 border-white/5 pl-10 h-10 rounded-full text-xs focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="p-3 bg-zinc-900/50 border border-white/5 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <AlertCircle className="w-5 h-5" />
            <div className="text-sm">
              <p className="font-bold">Database Sync Error</p>
              <p className="opacity-70 font-light">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Status", value: `${pcs.filter(p => p.status === 'online').length} / ${pcs.length}`, desc: "Healthy Nodes", icon: <Monitor className="text-emerald-500" />, color: "emerald" },
            { title: "CPU Utilization", value: `${avgCpu}%`, desc: "Aggregate Avg", icon: <Cpu className="text-blue-500" />, color: "blue" },
            { title: "Memory Pressure", value: `${avgRam}%`, desc: "Aggregate Avg", icon: <Activity className="text-purple-500" />, color: "purple" },
            { title: "Incidents", value: pcs.filter(p => p.status === 'offline').length, desc: "Critical Offline", icon: <Zap className="text-orange-500" />, color: "orange" },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-white/20 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.title}</span>
                  <div className={`p-2 rounded-lg bg-${stat.color}-500/10 group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="text-3xl font-bold tracking-tight">{loading ? <Skeleton className="h-9 w-20 bg-zinc-800" /> : stat.value}</div>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tighter">{stat.desc}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-0.5 bg-${stat.color}-500 w-0 group-hover:w-full transition-all duration-500`} />
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Table Area */}
          <Card className="xl:col-span-2 bg-zinc-900/40 border-white/5 backdrop-blur-xl overflow-hidden rounded-3xl shadow-2xl">
            <CardHeader className="border-b border-white/5 bg-white/[0.01] px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Telegraf Agents</CardTitle>
                  <CardDescription className="text-zinc-500 font-light">Inventory of registered network endpoints</CardDescription>
                </div>
                <Badge variant="outline" className="text-zinc-500 border-zinc-800">{filteredPcs.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800/50 rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead className="text-zinc-500 pl-8 h-12 uppercase text-[10px] font-bold tracking-widest">Node Name</TableHead>
                        <TableHead className="text-zinc-500 h-12 uppercase text-[10px] font-bold tracking-widest">Connectivity</TableHead>
                        <TableHead className="text-zinc-500 h-12 uppercase text-[10px] font-bold tracking-widest">CPU Load</TableHead>
                        <TableHead className="text-zinc-500 h-12 uppercase text-[10px] font-bold tracking-widest">Memory</TableHead>
                        <TableHead className="text-zinc-500 text-right pr-8 h-12 uppercase text-[10px] font-bold tracking-widest">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredPcs.map((pc) => (
                          <TableRow
                            key={pc.hostname}
                            className={`hover:bg-white/[0.03] border-white/5 cursor-pointer transition-all group ${selectedPC?.hostname === pc.hostname ? "bg-white/[0.05]" : ""}`}
                            onClick={() => setSelectedPC(pc)}
                          >
                            <TableCell className="font-semibold pl-8 py-5">
                              <div className="flex flex-col">
                                <span>{pc.hostname}</span>
                                <span className="text-[10px] font-mono text-zinc-600 group-hover:text-blue-500/50 transition-colors uppercase">{pc.ip}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${pc.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                                <span className={`text-[11px] uppercase tracking-wide font-bold ${pc.status === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                                  {pc.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-1 w-full max-w-[80px] bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-700 ${pc.cpu > 80 ? 'bg-red-500' : pc.cpu > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${pc.cpu}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-zinc-400">{pc.cpu}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-1 w-full max-w-[80px] bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-700 ${pc.ram > 80 ? 'bg-red-500' : pc.ram > 50 ? 'bg-yellow-500' : 'bg-purple-500'}`} style={{ width: `${pc.ram}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-zinc-400">{pc.ram}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                              <button className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full text-[10px] uppercase font-bold tracking-widest opacity-40 group-hover:opacity-100 hover:bg-blue-500 hover:text-white transition-all">Inspect</button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
              {pcs.length === 0 && !loading && (
                <div className="p-16 text-center text-zinc-600 flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 opacity-20" />
                  <p className="font-light">No agents detected in the database. Ensure agents are reporting to PostgreSQL.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Sidebar: Detail View */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-3xl text-white rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="pb-4 bg-white/[0.01] border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Monitor className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {selectedPC?.hostname || 'Node Inspector'}
                      </CardTitle>
                      <CardDescription className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest font-mono">
                        {selectedPC?.ip || '0.0.0.0'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-8 px-6 pb-8">
                {selectedPC ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span>CPU</span>
                          <span className="font-mono text-blue-400">{selectedPC.cpu}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedPC.cpu}%` }}
                            className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                          />
                        </div>
                      </div>
                      <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span>Memory</span>
                          <span className="font-mono text-purple-400">{selectedPC.ram}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedPC.ram}%` }}
                            className="h-full bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">System Health</h3>
                      <div className="space-y-3 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center group">
                          <span className="text-[10px] text-zinc-400 uppercase font-light">Load Avg (1m/5m/15m)</span>
                          <span className="font-mono text-xs text-zinc-200">
                            {selectedPC.load?.l1 || '0.00'} / {selectedPC.load?.l5 || '0.00'} / {selectedPC.load?.l15 || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-400 uppercase font-light">System Uptime</span>
                          <span className="text-xs text-zinc-200 font-medium">{selectedPC.uptime}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-3">
                          <span className="text-[10px] text-zinc-400 uppercase font-light">Last Active</span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {formatDistanceToNow(new Date(selectedPC.lastUpdate), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Telemetry Trend</h3>
                        <div className="flex gap-2 bg-white/[0.03] p-1 rounded-lg border border-white/5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setChartType('cpu'); }}
                            className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold transition-all ${chartType === 'cpu' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >CPU</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setChartType('ram'); }}
                            className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold transition-all ${chartType === 'ram' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >RAM</button>
                        </div>
                      </div>
                      <div className="h-[180px] bg-white/[0.01] rounded-3xl border border-white/[0.03] p-4">
                        {history.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                              <defs>
                                <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0.2} />
                                  <stop offset="95%" stopColor={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="5 5" stroke="#ffffff" vertical={false} opacity={0.02} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(9, 9, 11, 0.9)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  borderRadius: "16px",
                                  fontSize: "10px",
                                  backdropFilter: "blur(12px)"
                                }}
                                itemStyle={{ color: "#fff" }}
                                labelStyle={{ color: "#71717a", marginBottom: "4px" }}
                                cursor={{ stroke: '#ffffff', strokeWidth: 0.5, strokeDasharray: '3 3', opacity: 0.2 }}
                              />
                              <Area
                                type="monotone"
                                dataKey="usage"
                                stroke={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'}
                                fillOpacity={1}
                                fill="url(#colorUsage)"
                                strokeWidth={2}
                                animationDuration={1000}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                            <Activity className="w-5 h-5 opacity-20" />
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-20 transition-all duration-300">Collecting Realtime Packets</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center text-zinc-700 italic text-sm gap-4 text-center px-12">
                    <Monitor className="w-12 h-12 opacity-10" />
                    <p className="opacity-40">Select an agent from the list to view granular telemetry.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600/20 to-transparent border-blue-500/10 backdrop-blur-3xl p-6 rounded-3xl group cursor-pointer hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <Zap className="text-white w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Real-time Optimization</h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-light">All agents reporting at 30s intervals</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <footer className="container mx-auto p-12 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 text-[11px] font-bold text-zinc-700 uppercase tracking-[0.3em]">
            <span className="hover:text-zinc-500 transition-colors cursor-pointer">System Health</span>
            <span className="hover:text-zinc-500 transition-colors cursor-pointer">Network Log</span>
            <span className="hover:text-zinc-500 transition-colors cursor-pointer">Security Audits</span>
          </div>
          <div className="h-px w-24 bg-zinc-800" />
          <p className="text-zinc-700 text-[10px] font-light uppercase tracking-widest">
            &copy; 2026 Telegraf Enterprise Monitoring. Precision Telemetry.
          </p>
        </div>
      </footer>
    </div>
  );
}
