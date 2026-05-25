type PlatformIconVariant = 'black' | 'lime' | 'auto';
type PlatformIconSurface = 'dark' | 'light' | 'lime';
type PlatformIconSize = 'xs' | 'sm' | 'md' | 'lg';

const platformIcons: Record<string, { black: string; lime: string }> = {
    'Steam': { black: 'steam-black.png', lime: 'steam-white.png' },
    'Epic Games': { black: 'epicgames-black.png', lime: 'epicgames-lime.png' },
    'GOG': { black: 'gog-black.png', lime: 'gog-lime.png' },
    'PS Network': { black: 'ps-black.png', lime: 'ps-lime.png' },
    'Xbox': { black: 'xbox-black.png', lime: 'xbox-lime.png' },
    'EA App': { black: 'ea-black.png', lime: 'ea-lime.png' },
    'Ubisoft Connect': { black: 'ubisoft-black.png', lime: 'ubisoft-lime.png' },
    'Google Play Games': { black: 'googleplaygames-black.png', lime: 'googleplaygames-lime.png' },
    'Game Center': { black: 'gamecenter-black.png', lime: 'gamecenter-lime.png' },
    'RetroAchievements': { black: 'retroachievements-black.png', lime: 'retroachievements-lime.png' },
    'Itch.io': { black: 'itchio-black.png', lime: 'itchio-lime.png' },
    'Nintendo': { black: 'nintendo-black.png', lime: 'nintendo-lime.png' },
};

const sizeClass: Record<PlatformIconSize, string> = {
    xs: 'size-6 text-xs',
    sm: 'size-8 text-sm',
    md: 'size-10 text-lg',
    lg: 'size-12 text-2xl',
};

const imageSizeClass: Record<PlatformIconSize, string> = {
    xs: 'max-h-5 max-w-5',
    sm: 'max-h-7 max-w-7',
    md: 'max-h-9 max-w-9',
    lg: 'max-h-11 max-w-11',
};

const customTextClass: Record<PlatformIconSize, string> = {
    xs: 'text-[7px]',
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-[13px]',
};

const customSubTextClass: Record<PlatformIconSize, string> = {
    xs: 'hidden',
    sm: 'text-[6px]',
    md: 'text-[7px]',
    lg: 'text-[8px]',
};

function fallbackLabel(platform: string) {
    const clean = platform.trim();

    if (!clean || clean === 'All') return 'A';
    if (clean === 'PS Network') return 'PS';

    return clean
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function resolvedVariant(variant: PlatformIconVariant, surface: PlatformIconSurface) {
    if (variant !== 'auto') return variant;

    return surface === 'dark' ? 'lime' : 'black';
}

function CustomPlatformMark({
    platform,
    dark,
    size,
}: {
    platform: string;
    dark: boolean;
    size: PlatformIconSize;
}) {
    const label = platform === 'Own Launcher' ? 'OWN' : 'OTHER';
    const subLabel = platform === 'Own Launcher' ? 'LAUNCH' : '';

    return (
        <span
            className={[
                'grid h-full w-full place-items-center rounded-[28%] border font-black leading-none tracking-normal',
                dark ? 'border-[#b7ff63]/55 bg-black text-[#b7ff63]' : 'border-black/70 bg-transparent text-black',
            ].join(' ')}
        >
            <span className="grid justify-items-center gap-0.5">
                <span className={customTextClass[size]}>{label}</span>
                {subLabel && <span className={customSubTextClass[size]}>{subLabel}</span>}
            </span>
        </span>
    );
}

export default function PlatformIcon({
    platform,
    variant = 'auto',
    surface = 'light',
    size = 'md',
    className = '',
}: {
    platform: string;
    variant?: PlatformIconVariant;
    surface?: PlatformIconSurface;
    size?: PlatformIconSize;
    className?: string;
}) {
    const icon = platformIcons[platform];
    const selectedVariant = resolvedVariant(variant, surface);
    const darkFallback = selectedVariant === 'lime';
    const customMark = platform === 'Other' || platform === 'Own Launcher';

    return (
        <span
            className={[
                'grid shrink-0 place-items-center overflow-hidden font-black leading-none',
                !icon && !customMark && 'rounded-full',
                !icon && !customMark && (darkFallback ? 'bg-black text-[#b7ff63]' : 'bg-[#b7ff63] text-black'),
                sizeClass[size],
                className,
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            {customMark ? (
                <CustomPlatformMark platform={platform} dark={darkFallback} size={size} />
            ) : icon ? (
                <img
                    src={`/images/platforms/${icon[selectedVariant]}`}
                    alt=""
                    className={['block object-contain', imageSizeClass[size]].join(' ')}
                    loading="lazy"
                />
            ) : (
                fallbackLabel(platform)
            )}
        </span>
    );
}
