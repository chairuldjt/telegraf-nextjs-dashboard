"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import * as React from "react";
import { ChevronDown, Menu, X, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { RaisedButton } from "@/components/ui/raised-button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

export interface NavbarMenuLink {
	label: string;
	href: string;
	icon?: React.ReactNode;
	external?: boolean;
	description?: string;
	backgroundImage?: string;
	rowSpan?: number;
}

export interface NavbarMenuSection {
	id: string;
	links: NavbarMenuLink[];
	gridLayout?: string;
}

export interface NavbarWithMenuProps {
	sections: NavbarMenuSection[];
	navItems?: Array<
		| { type: "link"; label: string; href: string }
		| { type: "dropdown"; label: string; menu: string }
	>;
	logo?: React.ReactNode;
	cta?: React.ReactNode;
}

const ListItem = React.forwardRef<
	HTMLAnchorElement,
	React.AnchorHTMLAttributes<HTMLAnchorElement> & {
		title: string;
		children?: React.ReactNode;
		href: string;
		external?: boolean;
		icon?: React.ReactNode;
		backgroundImage?: string;
		rowSpan?: number;
	}
>(
	(
		{
			className,
			title,
			children,
			href,
			external,
			icon,
			backgroundImage,
			rowSpan,
			...props
		},
		ref,
	) => {
		return (
			<li className={cn("list-none", rowSpan === 2 && "row-span-2")}>
				<a
					ref={ref}
					href={href}
					target={external ? "_blank" : undefined}
					rel={external ? "noopener noreferrer" : undefined}
					className={cn(
						"group relative flex h-full min-h-18 w-full flex-col justify-center overflow-hidden rounded-2xl bg-zinc-800/0 p-3.5 leading-none no-underline outline-none transition-all duration-150 select-none hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100",
						className,
					)}
					{...props}
				>
					{backgroundImage && (
						<>
							<Image
								fill
								src={backgroundImage}
								alt={title}
								className="absolute inset-0 z-0 h-full w-full object-cover transition-all group-hover:brightness-60"
							/>
							<div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
						</>
					)}
					<div
						className={cn(
							"flex items-start gap-3",
							backgroundImage && "relative z-[2] mt-auto",
						)}
					>
						{icon && (
							<span
								className={cn(
									"relative flex min-h-10 min-w-10 items-center justify-center rounded-xl p-2 text-primary transition group-hover:text-zinc-300",
									backgroundImage
										? "bg-white/5 backdrop-blur group-hover:bg-white/10"
										: "bg-zinc-800/80 group-hover:bg-zinc-700/80",
								)}
							>
								{icon}
							</span>
						)}
						<div className="flex h-full flex-col justify-start gap-1 leading-none font-normal text-zinc-100">
							<span className="text-sm font-semibold">{title}</span>
							{children && (
								<p className="line-clamp-2 text-xs leading-tight font-light text-zinc-500">
									{children}
								</p>
							)}
						</div>
					</div>
				</a>
			</li>
		);
	},
);

ListItem.displayName = "ListItem";

export function NavbarWithMenu({
	sections,
	navItems,
	logo,
	cta,
}: NavbarWithMenuProps) {
	const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
	const [isScrolled, setIsScrolled] = React.useState(false);

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const items = navItems || [
		{ type: "dropdown", label: "Monitoring", menu: "monitoring" },
	];

	return (
		<header
			className={cn(
				"fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 py-4",
				isScrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/5 py-3" : "bg-transparent"
			)}
		>
			<div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
				{/* Logo */}
				<div className="flex-shrink-0">
					{logo}
				</div>

				{/* Desktop Nav */}
				<nav className="hidden lg:flex items-center gap-1 bg-zinc-900/40 border border-white/5 rounded-full p-1 backdrop-blur-md">
					{items.map((item) =>
						item.type === "link" ? (
							<a
								key={item.href}
								href={item.href}
								className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-white/5"
							>
								{item.label}
							</a>
						) : (
							<div
								key={item.menu}
								className="relative group"
								onMouseEnter={() => setActiveDropdown(item.menu)}
								onMouseLeave={() => setActiveDropdown(null)}
							>
								<button
									className={cn(
										"flex items-center gap-1.5 px-4 py-2 text-sm transition-all rounded-full",
										activeDropdown === item.menu
											? "text-zinc-100 bg-white/10"
											: "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
									)}
								>
									{item.label}
									<ChevronDown size={14} className={cn("transition-transform duration-200", activeDropdown === item.menu && "rotate-180")} />
								</button>

								<AnimatePresence>
									{activeDropdown === item.menu && (
										<motion.div
											initial={{ opacity: 0, y: 10, scale: 0.95 }}
											animate={{ opacity: 1, y: 0, scale: 1 }}
											exit={{ opacity: 0, y: 10, scale: 0.95 }}
											className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[450px]"
										>
											<div className="bg-zinc-950/90 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-2xl">
												<ul className="grid grid-cols-2 gap-2">
													{sections.find(s => s.id === item.menu)?.links.map(link => (
														<ListItem
															key={link.href}
															href={link.href}
															title={link.label}
															icon={link.icon}
															external={link.external}
														>
															{link.description}
														</ListItem>
													))}
												</ul>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)
					)}
				</nav>

				{/* CTA (Desktop) */}
				<div className="hidden lg:block">
					{cta}
				</div>

				{/* Mobile Toggle */}
				<div className="lg:hidden flex items-center gap-2">
					<Sheet>
						<SheetTrigger asChild>
							<button className="p-2.5 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400">
								<Menu size={20} />
							</button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[85%] bg-black border-white/5 p-0">
							<SheetHeader className="p-6 border-b border-white/5">
								<SheetTitle className="text-left text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Navigation Menu</SheetTitle>
							</SheetHeader>
							<div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
								{items.map(item => (
									<div key={item.label} className="space-y-4">
										<p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest px-2">{item.label}</p>
										<div className="space-y-1">
											{item.type === "dropdown" ? (
												sections.find(s => s.id === (item as any).menu)?.links.map(link => (
													<a
														key={link.href}
														href={link.href}
														className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors group"
													>
														<div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors">
															{link.icon}
														</div>
														<div className="flex-1">
															<p className="text-sm font-semibold text-zinc-200">{link.label}</p>
															<p className="text-[10px] text-zinc-500 line-clamp-1">{link.description}</p>
														</div>
													</a>
												))
											) : (
												<a href={(item as any).href} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors">
													<div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
														<ExternalLink size={18} />
													</div>
													<p className="text-sm font-semibold text-zinc-200">{item.label}</p>
												</a>
											)}
										</div>
									</div>
								))}

								<div className="pt-6 border-t border-white/5">
									{cta}
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
