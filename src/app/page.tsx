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
  LayoutDashboard,
  Monitor,
  Network,
  Server,
  Settings
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion } from "motion/react";

// Mock data for the dashboard
const mockPCs = [
  { id: 1, hostname: "LAPTOP-OFFICE-01", ip: "172.16.3.101", mac: "00:1A:2B:3C:4D:5E", status: "online", cpu: 12, ram: 45, uptime: "5d 12h" },
  { id: 2, hostname: "DESKTOP-DEV-02", ip: "172.16.3.102", mac: "00:1A:2B:3C:4D:5F", status: "online", cpu: 28, ram: 62, uptime: "2d 04h" },
  { id: 3, hostname: "LAPTOP-SALES-01", ip: "172.16.3.103", mac: "00:1A:2B:3C:4D:60", status: "offline", cpu: 0, ram: 0, uptime: "0s" },
  { id: 4, hostname: "SERVER-BACKUP-01", ip: "172.16.3.104", mac: "00:1A:2B:3C:4D:61", status: "online", cpu: 5, ram: 18, uptime: "45d 08h" },
];

const mockCpuHistory = [
  { time: "10:00", usage: 15 },
  { time: "10:05", usage: 22 },
  { time: "10:10", usage: 18 },
  { time: "10:15", usage: 35 },
  { time: "10:20", usage: 28 },
  { time: "10:25", usage: 20 },
  { time: "10:30", usage: 25 },
];

const mockRamHistory = [
  { time: "10:00", usage: 40 },
  { time: "10:05", usage: 42 },
  { time: "10:10", usage: 45 },
  { time: "10:15", usage: 44 },
  { time: "10:20", usage: 48 },
  { time: "10:25", usage: 46 },
  { time: "10:30", usage: 45 },
];

export default function Dashboard() {
  const [selectedPC, setSelectedPC] = useState(mockPCs[0]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navbarSections = [
    {
      id: "monitoring",
      links: [
        { label: "Real-time Stats", href: "#", description: "View live data from agents", icon: <Activity className="w-5 h-5" /> },
        { label: "Alerts & Logs", href: "#", description: "Check system health alerts", icon: <Database className="w-5 h-5" /> },
      ]
    },
    {
      id: "assets",
      links: [
        { label: "PC Inventory", href: "#", description: "List of all registered agents", icon: <Monitor className="w-5 h-5" /> },
        { label: "Network Topology", href: "#", description: "Map of your network", icon: <Network className="w-5 h-5" /> },
      ]
    }
  ];

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
      <NavbarWithMenu
        sections={navbarSections}
        navItems={[
          { type: "dropdown", label: "Monitoring", menu: "monitoring" },
          { type: "dropdown", label: "Assets", menu: "assets" },
          { type: "link", label: "Settings", href: "/settings" },
        ]}
        logo={<div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><Server className="text-blue-500" /> TELEGRAF DASHBOARD</div>}
      />

      <main className="container mx-auto p-4 lg:p-8 space-y-8 -mt-64 relative z-10">
        <header className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              System Overview
            </h1>
            <p className="text-zinc-500">Monitoring {mockPCs.length} agents across the network.</p>
          </motion.div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Online PCs", value: mockPCs.filter(p => p.status === "online").length, icon: <Monitor className="text-green-500" />, trend: "Active Now" },
            { title: "Avg CPU Load", value: "18.5%", icon: <Cpu className="text-blue-500" />, trend: "+2.1% from last hour" },
            { title: "Avg RAM Usage", value: "42.3%", icon: <Activity className="text-purple-500" />, trend: "Stable" },
            { title: "Network Status", value: "Healthy", icon: <Network className="text-orange-500" />, trend: "0 packet loss" },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-white">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent className="text-white">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-zinc-500 mt-1">{stat.trend}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PC List */}
          <Card className="lg:col-span-2 bg-zinc-900/50 border-white/10 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle>Connected Agents</CardTitle>
              <CardDescription className="text-zinc-500">List of PCs with active Telegraf agents.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-zinc-300">Hostname</TableHead>
                    <TableHead className="text-zinc-300">Status</TableHead>
                    <TableHead className="text-zinc-300">IP Address</TableHead>
                    <TableHead className="text-zinc-300">CPU</TableHead>
                    <TableHead className="text-zinc-300 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPCs.map((pc) => (
                    <TableRow
                      key={pc.id}
                      className={`hover:bg-white/5 border-white/5 cursor-pointer transition-colors ${selectedPC.id === pc.id ? "bg-white/5" : ""}`}
                      onClick={() => setSelectedPC(pc)}
                    >
                      <TableCell className="font-medium">{pc.hostname}</TableCell>
                      <TableCell>
                        <Badge variant={pc.status === "online" ? "default" : "destructive"} className={pc.status === "online" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/20" : ""}>
                          {pc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-mono text-xs">{pc.ip}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pc.cpu > 70 ? "bg-red-500" : pc.cpu > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${pc.cpu}%` }}
                            />
                          </div>
                          <span className="text-xs">{pc.cpu}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <button className="text-blue-500 hover:underline text-sm">Details</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Selected PC Details */}
          <div className="space-y-4">
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-blue-500" />
                    {selectedPC.hostname}
                  </CardTitle>
                </div>
                <CardDescription className="text-zinc-500">Real-time telemetry</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">CPU Usage</span>
                    <span className="font-bold">{selectedPC.cpu}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedPC.cpu}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>

                  <div className="flex justify-between text-sm mt-4">
                    <span className="text-zinc-500">RAM Usage</span>
                    <span className="font-bold">{selectedPC.ram}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedPC.ram}%` }}
                      className="h-full bg-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-white/5">
                  <div>
                    <span className="block text-zinc-500 uppercase tracking-widest mb-1">IP Address</span>
                    <span className="font-mono">{selectedPC.ip}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 uppercase tracking-widest mb-1">MAC Address</span>
                    <span className="font-mono text-[10px]">{selectedPC.mac}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-zinc-500 uppercase tracking-widest mb-1">System Uptime</span>
                    <span>{selectedPC.uptime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md text-white h-[200px] flex flex-col items-center justify-center p-6 text-center">
              <Activity className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
              <p className="text-sm text-zinc-500 italic">"Telegraf agent is reporting healthy signals from this machine."</p>
            </Card>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle>Historical Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cpu" className="w-full">
              <TabsList className="bg-zinc-800/50 border border-white/5 mb-4">
                <TabsTrigger value="cpu">CPU Load</TabsTrigger>
                <TabsTrigger value="ram">Memory Usage</TabsTrigger>
              </TabsList>
              <TabsContent value="cpu" className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockCpuHistory}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="ram" className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockRamHistory}>
                    <defs>
                      <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorRam)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <footer className="container mx-auto p-8 text-center text-zinc-600 text-sm">
        <p>&copy; 2024 Telegraf Monitoring System. Built with Next.js & Gaia UI.</p>
      </footer>
    </div>
  );
}
