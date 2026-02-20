"use client";

import { Crown, ChevronLeft, ChevronRight, Users, Shield, Swords, Menu, MoreVertical, UserX, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Player } from "@/types/game";

interface SidebarProps {
    team: "A" | "B";
    players: Player[];
    creatorId: string;
    creatorPlayerId: string;
    currentSocketId: string;
    currentPlayerId: string;
    isOpen: boolean;
    onToggle: () => void;
    isMobile: boolean;
    onSwitchTeam?: () => void;
    onKickPlayer?: (playerId: string) => void;
    onTransferHost?: (playerId: string) => void;
}

const teamTheme = {
    A: {
        primary: "text-red-600 dark:text-red-500",
        bg: "bg-red-50 dark:bg-red-900/10",
        border: "border-red-200 dark:border-red-900/30",
        gradient: "from-red-500/10 to-transparent",
        avatar: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
        hover: "hover:bg-red-50 dark:hover:bg-red-900/20",
        footerBg: "bg-red-500",
    },
    B: {
        primary: "text-blue-600 dark:text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-900/10",
        border: "border-blue-200 dark:border-blue-900/30",
        gradient: "from-blue-500/10 to-transparent",
        avatar: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
        footerBg: "bg-blue-500",
    },
};

export function Sidebar({
    team,
    players,
    creatorId,
    creatorPlayerId,
    currentSocketId,
    currentPlayerId,
    isOpen,
    onToggle,
    isMobile,
    onSwitchTeam,
    onKickPlayer,
    onTransferHost,
}: SidebarProps) {
    const theme = teamTheme[team];
    const isTeamA = team === "A";
    const teamPlayers = players.filter((p) => p.takim === team);
    // Use playerId comparison for reliable host detection (socketId changes on reconnect)
    const isHost = currentPlayerId && creatorPlayerId ? currentPlayerId === creatorPlayerId : false;

    // Sidebar width
    const sidebarWidth = isOpen ? "w-80" : "w-20";

    // Position classes: mobile = fixed sliding panel, desktop = relative flex item
    const positionClasses = isMobile
        ? `fixed inset-y-0 z-40 ${isTeamA ? "left-0" : "right-0"} w-72 shadow-2xl transform transition-transform duration-300 ${isOpen
            ? "translate-x-0"
            : isTeamA
                ? "-translate-x-full"
                : "translate-x-full"
        }`
        : `relative h-full transition-all duration-300 ease-in-out flex-shrink-0 ${sidebarWidth}`;

    const borderClass = isTeamA ? "border-r" : "border-l";

    return (
        <aside
            className={`${positionClasses} flex flex-col bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 ${!isMobile ? borderClass : ""} overflow-hidden group/sidebar`}
        >
            {/* Background Decor: Watermark Letter */}
            <div className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none overflow-hidden">
                <div
                    className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-100`}
                />
                <div
                    className={`absolute -top-12 ${isTeamA ? "-left-10" : "-right-10"} text-[14rem] font-black opacity-[0.04] dark:opacity-[0.06] ${theme.primary} leading-none`}
                >
                    {team}
                </div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex flex-col justify-center min-h-[5rem] px-4 pt-4 pb-2">
                <div
                    className={`flex items-center ${!isOpen && !isMobile
                        ? "justify-center"
                        : isTeamA
                            ? "justify-between"
                            : "justify-start gap-3"
                        }`}
                >
                    {/* Toggle Button for Team B (left side for symmetry) */}
                    {!isTeamA && !isMobile && isOpen && (
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    {/* Title Area */}
                    {isOpen || isMobile ? (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10 ${theme.bg}`}
                            >
                                {isTeamA ? (
                                    <Swords size={20} className={theme.primary} />
                                ) : (
                                    <Shield size={20} className={theme.primary} />
                                )}
                            </div>
                            <div>
                                <h2
                                    className={`text-2xl font-black uppercase tracking-tight leading-none ${theme.primary}`}
                                >
                                    TAKIM {team}
                                </h2>
                                <div
                                    className={`h-1 w-8 rounded-full ${theme.bg} mt-1 brightness-95`}
                                />
                            </div>
                        </div>
                    ) : (
                        // Collapsed Header Icon
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border border-white/50 dark:border-white/10 ${theme.bg} ${theme.primary}`}
                        >
                            {team}
                        </div>
                    )}

                    {/* Toggle Button for Team A (right side) */}
                    {isTeamA && !isMobile && isOpen && (
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Player List */}
            <div className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-hide">
                {/* Collapsed Toggle Button */}
                {!isOpen && !isMobile && (
                    <button
                        onClick={onToggle}
                        className="w-full flex justify-center mb-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        {isTeamA ? (
                            <ChevronRight size={24} />
                        ) : (
                            <ChevronLeft size={24} />
                        )}
                    </button>
                )}

                {teamPlayers.map((player) => {
                    const isCreator = player.playerId === creatorPlayerId;
                    const isMe = player.playerId === currentPlayerId;
                    const canManage = isHost && !isMe && !isCreator;

                    return (
                        <div
                            key={player.playerId}
                            className={`group relative flex items-center gap-3 rounded-2xl transition-all duration-200 cursor-default select-none border border-transparent ${isOpen || isMobile
                                ? `p-3 ${theme.hover}`
                                : "justify-center py-2"
                                }`}
                        >
                            {/* Avatar */}
                            <div className="relative">
                                <div
                                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm transition-transform duration-200 group-hover:scale-105 ${theme.avatar} ring-2 ring-white dark:ring-slate-900`}
                                >
                                    {(player.ad || "?")
                                        .substring(0, 1)
                                        .toUpperCase()}
                                </div>

                                {/* Crown for Host */}
                                {isCreator && (
                                    <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm z-20">
                                        <Crown size={12} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Name (visible when expanded) */}
                            {(isOpen || isMobile) && (
                                <div className="flex-1 min-w-0 animate-fade-in flex flex-col justify-center h-11">
                                    <p
                                        className={`font-bold truncate text-base leading-tight ${player.online
                                            ? "text-slate-700 dark:text-gray-200"
                                            : "text-muted-foreground line-through"
                                            }`}
                                    >
                                        {player.ad}
                                        {isMe && (
                                            <span className="text-muted-foreground text-xs ml-1 font-normal">
                                                (sen)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Admin Actions */}
                            {(isOpen || isMobile) && canManage && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <MoreVertical size={16} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Yönetici İşlemleri</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onTransferHost?.(player.playerId)}
                                            className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer"
                                            disabled={!onTransferHost}
                                        >
                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                            <span>Yöneticiliği Devret</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onKickPlayer?.(player.playerId)}
                                            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                                            disabled={!onKickPlayer}
                                        >
                                            <UserX className="mr-2 h-4 w-4" />
                                            <span>Oyundan At</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Active Indicator (Decorative) */}
                            {(isOpen || isMobile) && (
                                <div
                                    className={`w-1 h-6 rounded-full bg-current opacity-0 group-hover:opacity-20 transition-opacity ${theme.primary}`}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Empty State */}
                {teamPlayers.length === 0 && (
                    <div
                        className={`flex flex-col items-center justify-center text-gray-300 dark:text-slate-700 py-12 ${!isOpen && !isMobile ? "scale-75" : ""}`}
                    >
                        <Users
                            size={28}
                            strokeWidth={1.5}
                            className="mb-2 opacity-50"
                        />
                        {(isOpen || isMobile) && (
                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                Boş
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Team Switch Button */}
            {
                onSwitchTeam && (isOpen || isMobile) && (
                    <div className="relative z-10 p-3 border-t border-gray-100 dark:border-slate-800">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={onSwitchTeam}
                        >
                            Takım Değiştir
                        </Button>
                    </div>
                )
            }

            {/* Footer Decoration */}
            <div className={`h-1 w-full opacity-60 ${theme.footerBg}`} />
        </aside >
    );
}
