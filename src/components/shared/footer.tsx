import Image from "next/image";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="px-4 pt-4">
      <div className="glass rounded-2xl px-5 py-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/10">
            <Image
              src="/zenithra-logo.jpg"
              alt="Zenithra"
              width={32}
              height={32}
              className="h-full w-full object-cover scale-125"
            />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Zenithra
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Baca manga, manhwa, dan manhua favoritmu
        </p>
        <p className="text-[10px] text-text-dim mt-4">© {YEAR} Zenithra</p>
      </div>
    </footer>
  );
}
