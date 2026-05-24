import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Gamepad2,
    Plus,
    Sparkles,
    Trophy,
    WalletCards,
} from "lucide-react";
import { ComponentType } from "react";
import AddGameWizard from "../Components/AddGameWizard";
import AppLayout from "../Components/AppLayout";
import GameCard, { CoverArt } from "../Components/GameCard";
import { statusPillStyle } from "../statusColors";
import { GameCardData, ReferenceData, StatsData } from "../types";

function numberFormat(
    value: number | string | null | undefined,
    maximumFractionDigits = 0,
) {
    return Number(value ?? 0).toLocaleString(undefined, {
        maximumFractionDigits,
    });
}

function moneyFormat(value: number | string | null | undefined) {
    return `$${Number(value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function PlatformMark({
    platform,
    size = "md",
}: {
    platform: string;
    size?: "sm" | "md" | "lg";
}) {
    const label =
        platform === "Steam"
            ? "S"
            : platform === "Xbox"
              ? "X"
              : platform.slice(0, 1);
    const sizeClass =
        size === "lg"
            ? "size-14 text-3xl"
            : size === "sm"
              ? "size-10 text-xl"
              : "size-12 text-2xl";

    return (
        <div
            className={`grid ${sizeClass} shrink-0 place-items-center rounded-full bg-black font-black text-[#b7ff63]`}
        >
            {label}
        </div>
    );
}

function StatTile({
    label,
    value,
    icon: Icon,
    dark = false,
}: {
    label: string;
    value: string | number;
    icon: ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
    }>;
    dark?: boolean;
}) {
    return (
        <div
            className={[
                "rounded-[24px] border p-4 shadow-[0_14px_28px_rgb(0_0_0/0.06)]",
                dark
                    ? "border-white/10 bg-black text-white"
                    : "border-black/5 bg-[#eef2ed] text-black",
            ].join(" ")}
        >
            <div className="mb-5 flex items-center justify-between gap-4">
                <p
                    className={[
                        "text-[11px] font-black uppercase tracking-[0.26em]",
                        dark ? "text-white/45" : "text-black/42",
                    ].join(" ")}
                >
                    {label}
                </p>
                <span
                    className={[
                        "grid size-10 place-items-center rounded-[14px]",
                        dark
                            ? "bg-[#b7ff63] text-black"
                            : "bg-black text-[#b7ff63]",
                    ].join(" ")}
                >
                    <Icon size={22} strokeWidth={3} />
                </span>
            </div>
            <div className="text-[30px] font-black leading-none tracking-[-0.03em]">
                {value}
            </div>
        </div>
    );
}

function HeaderChip({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-full border border-black/7 bg-white/10/78 px-5 py-3 shadow-[0_12px_26px_rgb(0_0_0/0.06)] backdrop-blur">
            <span className="mr-3 text-[10px] font-black uppercase tracking-[0.24em] text-black/36">
                {label}
            </span>
            <span className="font-black">{value}</span>
        </div>
    );
}

function MiniGameSlab({
    game,
    side,
}: {
    game: GameCardData;
    side: "left" | "right";
}) {
    const laneLabel = side === "left" ? "Previous File" : "Next File";

    return (
        <div
            className={[
                "absolute top-1/2 z-10 -translate-y-1/2 transition duration-300 hover:z-30 hover:scale-105",
                side === "left" ? "left-[3%] -rotate-6" : "right-[3%] rotate-6",
            ].join(" ")}
        >
            <div className="pointer-events-none absolute left-5 top-5 z-30 rounded-full bg-black/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63] shadow-[0_10px_22px_rgb(0_0_0/0.18)]">
                {laneLabel}
            </div>

            <GameCard game={game} compact expanded={false} />
        </div>
    );
}

function FeaturedGamePanel({ game }: { game: GameCardData }) {
    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);

    return (
        <a
            href={game.id > 0 ? `/games/${game.id}` : "/library"}
            className="group relative z-20 h-[565px] w-[350px] overflow-visible rounded-[46px] bg-black p-3 shadow-[0_48px_95px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-1 hover:scale-[1.012]"
        >
            <div className="relative flex h-full flex-col overflow-hidden rounded-[38px] bg-[#b7ff63] p-3">
                <div className="relative h-[435px] overflow-hidden rounded-[30px] bg-black shadow-[0_22px_42px_rgb(0_0_0/0.22)]">
                    {game.cover_url ? (
                        <img
                            src={game.cover_url}
                            alt={game.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <CoverArt game={game} titleSize="text-[34px]" />
                    )}

                    <div className="absolute left-4 top-4 rounded-full bg-black/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63] shadow-[0_12px_22px_rgb(0_0_0/0.22)]">
                        Active File
                    </div>
                </div>

                <span
                    className={[
                        "relative z-20 mx-auto -mt-4 rounded-full px-7 py-2 text-base font-black leading-none shadow-[0_12px_22px_rgb(0_0_0/0.18)]",
                    ].join(" ")}
                    style={statusPillStyle(game)}
                >
                    {game.status}
                </span>

                <div className="mt-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[26px] bg-black px-4 py-3 text-white">
                    <PlatformMark platform={game.platform} size="md" />

                    <div className="min-w-0">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
                                    Achievements
                                </p>

                                <p className="mt-1 text-[24px] font-black leading-none text-white">
                                    {Number(game.total_achievements ?? 0) > 0
                                        ? `${game.earned_achievements ?? 0}/${game.total_achievements ?? 0}`
                                        : "None"}
                                </p>
                            </div>

                            <p className="text-[22px] font-black leading-none text-[#b7ff63]">
                                {progress}%
                            </p>
                        </div>

                        <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-white/12">
                            <div
                                className="h-full rounded-full bg-[#4f8cf7]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid size-[46px] place-items-center rounded-full bg-[#b7ff63] text-black transition group-hover:rotate-45">
                        <ArrowUpRight size={24} strokeWidth={3.2} />
                    </div>
                </div>
            </div>
        </a>
    );
}

function EmptyArchiveCard() {
    return (
        <div className="relative z-20 grid h-[520px] w-[650px] place-items-center rounded-[48px] bg-black p-5 text-center shadow-[0_45px_90px_rgb(0_0_0/0.24)]">
            <div className="grid h-full w-full place-items-center rounded-[38px] bg-[#b7ff63] p-12">
                <div>
                    <Sparkles
                        className="mx-auto mb-5"
                        size={56}
                        strokeWidth={3}
                    />
                    <h2 className="text-5xl font-black leading-[0.92] tracking-[-0.05em]">
                        Start your archive.
                    </h2>
                    <p className="mx-auto mt-5 max-w-[390px] text-xl font-black leading-snug text-black/58">
                        Add your first game and turn the shelf into a personal
                        save file.
                    </p>
                </div>
            </div>
        </div>
    );
}

function BriefPanel({
    stats,
    references,
}: {
    stats: StatsData;
    references: ReferenceData;
}) {
    const playtime = numberFormat(stats.playtime_hours, 1);
    const achievementProgress = Math.min(
        Math.max(Number(stats.achievement_progress ?? 0), 0),
        100,
    );
    const topPlatform = stats.breakdowns.platforms[0];

    return (
        <aside className="flex h-full min-h-0 w-full flex-col gap-5 self-stretch">
            <section className="relative overflow-hidden rounded-[44px] bg-[#b7ff63] p-7 shadow-[0_24px_42px_rgb(0_0_0/0.1)]">
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/20 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[12px] font-black uppercase tracking-[0.28em] text-black/45">
                            Live Brief
                        </p>
                        <h2 className="mt-2 text-[47px] font-black leading-none tracking-[0.06em]">
                            Brief
                        </h2>
                    </div>
                    <div className="grid size-14 place-items-center rounded-[22px] bg-black text-[#b7ff63]">
                        <Activity size={30} strokeWidth={3} />
                    </div>
                </div>

                <div className="relative mt-7 grid grid-cols-2 gap-3">
                    <StatTile
                        label="Games"
                        value={stats.library_games ?? 0}
                        icon={Gamepad2}
                    />
                    <StatTile
                        label="Complete"
                        value={stats.completed ?? 0}
                        icon={CheckCircle2}
                    />
                    <StatTile
                        label="Hours"
                        value={`${playtime}H`}
                        icon={Clock3}
                        dark
                    />
                    <StatTile
                        label="Value"
                        value={moneyFormat(stats.base_value)}
                        icon={WalletCards}
                        dark
                    />
                </div>

                <div className="relative mt-5 rounded-[28px] bg-black p-5 text-white">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#b7ff63]">
                                Achievement Sync
                            </p>
                            <div className="mt-2 text-[25px] font-black leading-none">
                                {stats.earned_achievements ?? 0} /{" "}
                                {stats.total_achievements ?? 0}
                            </div>
                        </div>
                        <Trophy size={36} strokeWidth={3} />
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-white/14">
                        <div
                            className="h-full rounded-full bg-[#b7ff63]"
                            style={{ width: `${achievementProgress}%` }}
                        />
                    </div>
                </div>
            </section>

            <section className="grid flex-1 min-h-0 content-between rounded-[36px] bg-black p-5 text-white shadow-[0_18px_36px_rgb(0_0_0/0.16)]">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">
                        Archive Pulse
                    </p>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Top platform
                            </span>
                            <span className="font-black">
                                {topPlatform?.label ?? "No data"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Unique titles
                            </span>
                            <span className="font-black">
                                {stats.unique_titles ?? 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Ownership copies
                            </span>
                            <span className="font-black">
                                {stats.ownership_copies ?? 0}
                            </span>
                        </div>
                    </div>
                </div>

                <AddGameWizard
                    references={references}
                    buttonClassName="group mt-5 h-[72px] w-full rounded-[999px] bg-[#b7ff63] px-5 text-left shadow-[0_18px_30px_rgb(0_0_0/0.18)] transition hover:-translate-y-1 hover:scale-[1.01]"
                    buttonContent={
                        <span className="flex h-full w-full items-center justify-center gap-4">
                            <span className="grid size-[44px] place-items-center rounded-full bg-black text-[#b7ff63] transition group-hover:rotate-90">
                                <Plus size={30} strokeWidth={4} />
                            </span>
                            <span className="text-[24px] font-black text-black">
                                Add Game
                            </span>
                        </span>
                    }
                />
            </section>
        </aside>
    );
}

export default function Home({
    stats,
    recentGames,
    references,
}: {
    stats: StatsData;
    recentGames: GameCardData[];
    references: ReferenceData;
}) {
    const featuredGame = recentGames[0];
    const leftGame = recentGames[1];
    const rightGame = recentGames[2];
    const latestStatus = featuredGame?.status ?? "No files";
    const achievementProgress = Math.min(
        Math.max(Number(stats.achievement_progress ?? 0), 0),
        100,
    );

    return (
        <AppLayout title="Home" lockViewport>
            <section className="grid h-full grid-cols-[minmax(0,1fr)_400px] gap-8 pl-[88px]">
                <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[52px] border border-black/8 bg-[#eef2ed] p-7 shadow-[0_28px_65px_rgb(0_0_0/0.08)]">
                    <div className="absolute inset-0 opacity-[0.42] [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
                    <div className="absolute left-[20%] top-[18%] h-[360px] w-[520px] rounded-full bg-[#b7ff63]/25 blur-3xl" />

                    <header className="relative z-10 flex items-start justify-between gap-6">
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-[0.34em] text-black/38">
                                Stupid Log Command Deck
                            </p>
                            <h1 className="mt-2 text-[64px] font-black leading-[0.88] tracking-[-0.06em]">
                                Home Base
                            </h1>
                        </div>

                        <div className="flex items-center gap-3 rounded-full bg-black px-4 py-3 text-white shadow-[0_18px_36px_rgb(0_0_0/0.16)]">
                            <span className="grid size-10 place-items-center rounded-full bg-[#b7ff63] text-black">
                                <Activity size={22} strokeWidth={3} />
                            </span>
                            <div className="pr-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                                    Latest State
                                </p>
                                <p className="text-sm font-black">
                                    {latestStatus}
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="relative z-10 mt-0 grid flex-1 grid-rows-[minmax(0,1fr)_auto]">
                        <div className="relative flex min-h-0 items-center justify-center">
                            <div
                                className="absolute left-[8%] top-[52%] hidden size-[66px] -translate-y-1/2 place-items-center rounded-full bg-black text-white shadow-[0_18px_28px_rgb(0_0_0/0.18)] transition hover:scale-105 xl:grid"
                                aria-hidden="true"
                            >
                                <ChevronLeft size={39} strokeWidth={3.2} />
                            </div>

                            {featuredGame ? (
                                <>
                                    {leftGame && (
                                        <MiniGameSlab
                                            game={leftGame}
                                            side="left"
                                        />
                                    )}
                                    <FeaturedGamePanel game={featuredGame} />
                                    {rightGame && (
                                        <MiniGameSlab
                                            game={rightGame}
                                            side="right"
                                        />
                                    )}
                                </>
                            ) : (
                                <EmptyArchiveCard />
                            )}

                            <div
                                className="absolute right-[8%] top-[52%] hidden size-[66px] -translate-y-1/2 place-items-center rounded-full bg-black text-white shadow-[0_18px_28px_rgb(0_0_0/0.18)] transition hover:scale-105 xl:grid"
                                aria-hidden="true"
                            >
                                <ChevronRight size={39} strokeWidth={3.2} />
                            </div>
                        </div>

                        <footer className="relative z-20 mx-auto -mt-1 grid w-full max-w-[940px] grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-[30px] bg-black p-3 text-white shadow-[0_24px_50px_rgb(0_0_0/0.22)]">
                            <div className="rounded-[24px] bg-white/8 px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/36">
                                    Library Energy
                                </p>
                                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/12">
                                    <div
                                        className="h-full rounded-full bg-[#b7ff63]"
                                        style={{
                                            width: `${achievementProgress}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="px-4 text-center">
                                <p className="text-[11px] font-black uppercase tracking-[0.36em] text-[#b7ff63]">
                                    Recent Games
                                </p>
                                <h2 className="mt-1 text-[32px] font-black leading-none tracking-[0.12em]">
                                    Save Files
                                </h2>
                            </div>

                            <a
                                href="/library"
                                className="group flex items-center justify-between rounded-[24px] bg-[#b7ff63] px-5 py-4 text-black transition hover:-translate-y-0.5"
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                                        Open
                                    </p>
                                    <p className="text-lg font-black">
                                        Library Archive
                                    </p>
                                </div>
                                <span className="grid size-11 place-items-center rounded-full bg-black text-[#b7ff63] transition group-hover:rotate-45">
                                    <ArrowUpRight size={23} strokeWidth={3} />
                                </span>
                            </a>
                        </footer>
                    </div>
                </section>

                <BriefPanel stats={stats} references={references} />
            </section>
        </AppLayout>
    );
}
