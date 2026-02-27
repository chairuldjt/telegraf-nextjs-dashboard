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
  HardDrive,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PCStats {
  hostname: string;
  ip: string;
  mac: string;
  status: 'online' | 'offline';
  cpu: number;
  cpuBreakdown: {
    user: number;
    system: number;
    iowait: number;
  };
  ram: number;
  ramAvailablePercent: number;
  ramTotal?: number;
  ramUsed?: number;
  uptime: string;
  lastUpdate: string;
  load?: {
    l1: string;
    l5: string;
    l15: string;
  };
}

interface SummaryData {
  total: number;
  online: number;
  offline: number;
  avgCpu: number;
  avgRam: number;
}

interface PaginationData {
  totalHosts: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface DbDiagnostics {
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [dbDiag, setDbDiag] = useState<DbDiagnostics | null>(null);
  const limit = 10;

  useEffect(() => {
    setIsMounted(true);
    initialLoad();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [currentPage]); // Refetch when page changes

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
      const res = await fetch(`/api/stats?page=${currentPage}&limit=${limit}`);
      const result = await res.json();

      if (!res.ok) {
        const errorMsg = result.details || result.error || `HTTP error! status: ${res.status}`;
        throw new Error(errorMsg);
      }

      const data = result.data;
      setPcs(data);
      setPagination(result.pagination);
      setSummary(result.summary);
      setDbDiag(result.dbDiagnostics);

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
      // Implement a slight delay before allowing retry to avoid spamming
      setRefreshing(false);
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

  const dangerPcs = useMemo(() => {
    return pcs.filter(pc => pc.cpu > 80 || pc.ram > 80);
  }, [pcs]);

  const topCpuPcs = useMemo(() => {
    return [...pcs].sort((a, b) => b.cpu - a.cpu).slice(0, 10);
  }, [pcs]);

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
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-blue-500/20 antialiased overflow-x-hidden">
      <NavbarWithMenu
        sections={navbarSections}
        navItems={[
          { type: "dropdown", label: "Monitoring", menu: "monitoring" },
          { type: "dropdown", label: "Management", menu: "management" },
        ]}
        logo={<div className="flex items-center gap-2 font-bold text-lg md:text-xl tracking-tighter"><Server className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> TELEGRAF</div>}
        cta={
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${refreshing ? 'animate-ping' : ''}`} />
              LIVE
            </div>
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 font-mono uppercase tracking-widest text-[10px]">v1.2.0</Badge>
          </div>
        }
      />

      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 pt-24 md:pt-32 relative z-10 pb-24">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-400 to-zinc-700 bg-clip-text text-transparent">
                  Systems Center
                </h1>
              </motion.div>
              <p className="text-zinc-500 font-light flex items-center gap-2 text-sm">
                <Monitor className="w-4 h-4" /> <span className="hidden xs:inline">Global telemetry for</span> {pagination?.totalHosts || 0} nodes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search Host or IP..."
                  className="bg-zinc-900/50 border-white/5 pl-10 h-10 rounded-full text-xs focus:ring-blue-500/20 w-full"
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

              {dbDiag && (
                <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/40 border border-white/5 rounded-full text-[10px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-blue-500" />
                    <span>DB Pool:</span>
                    <span className="text-zinc-300 font-mono">
                      {dbDiag.totalConnections - dbDiag.idleConnections}/10
                    </span>
                  </div>
                  {dbDiag.waitingRequests > 0 && (
                    <div className="flex items-center gap-1.5 text-orange-400 animate-pulse">
                      <Zap className="w-3 h-3" />
                      <span>{dbDiag.waitingRequests} Waiting</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/30 text-red-00 p-6 rounded-2xl flex flex-col gap-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-bold">Sync Error (HTTP 500)</h3>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-red-500/10 text-[10px] items-center">
              <div className="space-y-1">
                <p className="text-red-400/50 uppercase tracking-widest font-bold">Possible Causes</p>
                <ul className="list-disc list-inside text-red-300/60 font-light space-y-1">
                  <li>Postgres query error (Check table/column existence)</li>
                  <li>SSL/Certificate mismatch in Production network</li>
                  <li>Database connection threshold reached (Max 10)</li>
                </ul>
              </div>
              <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/5">
                <p className="text-red-400/50 uppercase tracking-widest font-bold mb-2">Technical Insight</p>
                <code className="text-[9px] text-red-300/70 break-all bg-black/30 p-2 rounded block">
                  {error.includes("column") ? "Potential Schema Mismatch" :
                    error.includes("SSL") ? "Secure Connection Required" :
                      error.includes("timeout") ? "Database Busy/Slow" : "Unhandled Internal Exception"}
                </code>
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { title: "Network Status", value: summary ? `${summary.online}/${summary.total}` : "0/0", desc: "Online Nodes", icon: <Network className="text-emerald-500 w-4 h-4" />, color: "emerald" },
            { title: "System Load", value: selectedPC?.load?.l1 || "0.00", desc: "Current Load 1m", icon: <Activity className="text-blue-500 w-4 h-4" />, color: "blue" },
            { title: "CPU Avg", value: summary ? `${summary.avgCpu}%` : `${avgCpu}%`, desc: "Total Active", icon: <Cpu className="text-purple-500 w-4 h-4" />, color: "purple" },
            { title: "RAM Avg", value: summary ? `${summary.avgRam}%` : `${avgRam}%`, desc: "Total Usage", icon: <Database className="text-orange-500 w-4 h-4" />, color: "orange" },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-white/20 transition-all p-4 md:p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.title}</span>
                    <div className={`p-1.5 md:p-2 rounded-lg bg-${stat.color}-500/10`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">{loading ? <Skeleton className="h-8 md:h-9 w-12 md:w-20 bg-zinc-800" /> : stat.value}</div>
                  <p className="text-[8px] md:text-[10px] text-zinc-600 uppercase tracking-tighter">{stat.desc}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Priority Monitoring Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Danger Zone */}
          <AnimatePresence>
            {dangerPcs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-md overflow-hidden rounded-2xl">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-red-500/10">
                    <CardTitle className="text-red-400 text-xs font-bold flex items-center gap-2 uppercase tracking-tighter">
                      <Zap className="w-3 h-3 animate-pulse" /> 🔥 DANGER ZONE (Usage &gt; 80%)
                    </CardTitle>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px]">{dangerPcs.length}</Badge>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {dangerPcs.map(pc => (
                        <div
                          key={pc.hostname}
                          className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-[10px] cursor-pointer hover:bg-red-500/10 transition-colors"
                          onClick={() => setSelectedPC(pc)}
                        >
                          <span className="font-bold text-red-200">{pc.hostname}</span>
                          <div className="flex gap-3">
                            <span className={pc.cpu > 80 ? 'text-red-400 font-bold' : 'text-zinc-500'}>CPU: {pc.cpu}%</span>
                            <span className={pc.ram > 80 ? 'text-red-400 font-bold' : 'text-zinc-500'}>RAM: {pc.ram}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top 10 CPU */}
          <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md overflow-hidden rounded-2xl">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-white/5">
              <CardTitle className="text-zinc-400 text-xs font-bold flex items-center gap-2 uppercase tracking-tighter">
                🏆 Top Consumers (CPU)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {topCpuPcs.map((pc, idx) => (
                  <div
                    key={pc.hostname}
                    className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedPC(pc)}
                  >
                    <span className="text-[9px] font-mono text-zinc-600 w-4">{idx + 1}.</span>
                    <span className="text-[10px] text-zinc-300 flex-1 truncate">{pc.hostname}</span>
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${pc.cpu}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500">{pc.cpu}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* Main Table Area */}
          <Card className="xl:col-span-2 bg-zinc-900/40 border-white/5 backdrop-blur-xl overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
            <CardHeader className="border-b border-white/5 bg-white/[0.01] px-4 md:px-8 py-4 md:py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold">Telegraf Agents</CardTitle>
                  <CardDescription className="text-zinc-500 font-light text-xs md:text-sm">Inventory of registered endpoints</CardDescription>
                </div>
                <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-[10px]">{pagination?.totalHosts || 0} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 md:p-8 space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800/50 rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[500px] flex flex-col justify-between">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead className="text-zinc-500 pl-4 md:pl-8 h-10 md:h-12 uppercase text-[9px] md:text-[10px] font-bold tracking-widest">Node Name</TableHead>
                        <TableHead className="text-zinc-500 h-10 md:h-12 uppercase text-[9px] md:text-[10px] font-bold tracking-widest hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-zinc-500 h-10 md:h-12 uppercase text-[9px] md:text-[10px] font-bold tracking-widest">Perf</TableHead>
                        <TableHead className="text-zinc-500 text-right pr-4 md:pr-8 h-10 md:h-12 uppercase text-[9px] md:text-[10px] font-bold tracking-widest">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredPcs.map((pc) => (
                          <TableRow
                            key={pc.hostname}
                            className={`hover:bg-white/[0.03] border-white/5 cursor-pointer transition-all group ${selectedPC?.hostname === pc.hostname ? "bg-white/[0.05]" : ""} ${(pc.cpu > 80 || pc.ram > 80) ? "border-l-2 border-l-red-500/50" : ""}`}
                            onClick={() => setSelectedPC(pc)}
                          >
                            <TableCell className="font-semibold pl-4 md:pl-8 py-4 md:py-5">
                              <div className="flex flex-col">
                                <span className="text-sm md:text-base truncate max-w-[120px] md:max-w-none">{pc.hostname}</span>
                                <span className="text-[9px] md:text-[10px] font-mono text-zinc-600 group-hover:text-blue-500/50 transition-colors uppercase">{pc.ip}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${pc.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                                <span className={`text-[10px] uppercase font-bold ${pc.status === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                                  {pc.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 md:w-16 h-1 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-blue-500" style={{ width: `${pc.cpu}%` }} />
                                  </div>
                                  <span className="text-[9px] font-mono text-zinc-500">C:{pc.cpu}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-12 md:w-16 h-1 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-purple-500" style={{ width: `${pc.ram}%` }} />
                                  </div>
                                  <span className="text-[9px] font-mono text-zinc-500">R:{pc.ram}%</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-4 md:pr-8">
                              <button className="p-2 md:px-4 md:py-2 bg-white/[0.02] border border-white/5 rounded-full transition-all hover:bg-blue-500 group-hover:bg-white/[0.05]">
                                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>

                  {/* Pagination Footer */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }}
                              className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            // Simple logic for showing pages around current
                            let pageNum = i + 1;
                            if (pagination.totalPages > 5 && currentPage > 3) {
                              pageNum = currentPage - 3 + i + 1;
                              if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                            }

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  isActive={currentPage === pageNum}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(pageNum);
                                  }}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          {pagination.totalPages > 5 && currentPage < pagination.totalPages - 2 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < pagination.totalPages) setCurrentPage(currentPage + 1);
                              }}
                              className={currentPage === pagination.totalPages ? "opacity-50 pointer-events-none" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}
              {pcs.length === 0 && !loading && (
                <div className="p-12 text-center text-zinc-600 flex flex-col items-center gap-4">
                  <AlertCircle className="w-10 h-10 opacity-10" />
                  <p className="text-sm font-light">No agents active.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Sidebar: Detail View */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-3xl text-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="pb-4 bg-white/[0.01] border-b border-white/5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                    <Monitor className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-bold truncate">
                      {selectedPC?.hostname || 'Node View'}
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest font-mono truncate">
                      {selectedPC?.ip || '0.0.0.0'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 md:pt-8 space-y-6 md:space-y-8 px-4 md:px-6 pb-6 md:pb-8">
                {selectedPC ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-4 bg-white/[0.02] p-4 rounded-xl md:rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span>CPU</span>
                          <span className="font-mono text-blue-400">{selectedPC.cpu}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${selectedPC.cpu}%` }} className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                        </div>
                      </div>
                      <div className="space-y-4 bg-white/[0.02] p-4 rounded-xl md:rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span>RAM</span>
                          <span className="font-mono text-purple-400">{selectedPC.ram}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${selectedPC.ram}%` }} className="h-full bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3 bg-white/[0.02] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 text-[11px] md:text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 uppercase font-light">Uptime</span>
                          <span className="text-zinc-200 font-medium">{selectedPC.uptime}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                          <span className="text-zinc-400 uppercase font-light">Load Avg</span>
                          <span className="font-mono text-zinc-200">
                            {selectedPC.load?.l1 || '0.00'} · {selectedPC.load?.l5 || '0.00'} · {selectedPC.load?.l15 || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                          <span className="text-zinc-400 uppercase font-light">CPU Breakdown</span>
                          <span className="font-mono text-zinc-500 text-[9px] uppercase">
                            U:{selectedPC.cpuBreakdown?.user}% S:{selectedPC.cpuBreakdown?.system}% I:{selectedPC.cpuBreakdown?.iowait}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                          <span className="text-zinc-400 uppercase font-light">RAM Status</span>
                          <span className="font-mono text-zinc-500 text-[9px] uppercase">
                            Available: {selectedPC.ramAvailablePercent}% ({Math.round((selectedPC.ramTotal || 0) / 1024 / 1024 / 1024)}GB Total)
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                          <span className="text-zinc-400 uppercase font-light">Last Active</span>
                          <span className="font-mono text-zinc-500 text-[10px]">
                            {formatDistanceToNow(new Date(selectedPC.lastUpdate), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Telemetry</h3>
                        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-lg">
                          <button
                            onClick={(e) => { e.stopPropagation(); setChartType('cpu'); }}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${chartType === 'cpu' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}
                          >CPU</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setChartType('ram'); }}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${chartType === 'ram' ? 'bg-purple-600 text-white' : 'text-zinc-500'}`}
                          >RAM</button>
                        </div>
                      </div>
                      <div className="h-[150px] md:h-[180px] bg-white/[0.01] rounded-2xl md:rounded-3xl border border-white/[0.03] p-4">
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
                                  borderRadius: "12px",
                                  fontSize: "9px",
                                  backdropFilter: "blur(4px)"
                                }}
                                itemStyle={{ color: "#fff" }}
                                labelStyle={{ color: "#71717a" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="usage"
                                stroke={chartType === 'cpu' ? '#3b82f6' : '#8b5cf6'}
                                fillOpacity={1}
                                fill="url(#colorUsage)"
                                strokeWidth={2}
                                animationDuration={500}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-20">No packets</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-700 italic text-sm gap-4 text-center px-8">
                    <Monitor className="w-10 h-10 opacity-10" />
                    <p className="opacity-40 text-xs">Select agent to view detail</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="hidden lg:block bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/10 backdrop-blur-3xl p-6 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Agent Status: Good</h4>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest">30s heartbeat active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto p-8 md:p-12 text-center">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 text-[9px] md:text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">
            <span>Health</span>
            <span>Network</span>
            <span>Audits</span>
          </div>
          <p className="text-zinc-800 text-[9px] gap-2 flex items-center tracking-widest uppercase">
            &copy; 2026 Telegraf
            <Badge variant="outline" className="border-zinc-800 text-zinc-800 text-[8px] h-4">Production</Badge>
          </p>
        </div>
      </footer>
    </div>
  );
}
