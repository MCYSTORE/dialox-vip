'use client';

export function EmptyState() {
  return (
    <div className="bg-white border border-border rounded-2xl p-8 sm:p-12 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full bg-secondary flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground sm:w-7 sm:h-7">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Sin resultados</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed px-4">
        No se encontraron partidos con los filtros actuales. Intenta con otra búsqueda o cambia el filtro.
      </p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="skeleton h-4 w-24 sm:w-28" />
            <div className="skeleton h-4 sm:h-5 w-12 sm:w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="skeleton h-4 sm:h-5 w-20 sm:w-24" />
            <div className="skeleton h-3 sm:h-4 w-4 sm:w-6" />
            <div className="skeleton h-4 sm:h-5 w-20 sm:w-24" />
          </div>
          <div className="flex gap-2 mb-4 sm:mb-5">
            <div className="skeleton h-11 sm:h-12 flex-1 rounded-xl" />
            <div className="skeleton h-11 sm:h-12 flex-1 rounded-xl" />
            <div className="skeleton h-11 sm:h-12 flex-1 rounded-xl" />
          </div>
          <div className="skeleton h-11 sm:h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function InitialState() {
  return (
    <div className="bg-white border border-border rounded-2xl p-6 sm:p-10 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full bg-secondary flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground sm:w-7 sm:h-7">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Selecciona un partido</h3>
      <p className="text-sm text-muted-foreground max-w-xs sm:max-w-sm mx-auto leading-relaxed px-2">
        Haz clic en &quot;Analizar&quot; para obtener una recomendación VIP basada en IA.
      </p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-6 sm:p-10 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full bg-[#DC2626]/5 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#DC2626] sm:w-7 sm:h-7">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No pudimos cargar los datos</h3>
      <p className="text-sm text-muted-foreground max-w-xs sm:max-w-sm mx-auto leading-relaxed mb-4 sm:mb-5 px-2">
        Estamos actualizando los mercados VIP. Por favor intenta de nuevo.
      </p>
      <button
        onClick={onRetry}
        className="h-11 sm:h-12 min-h-[44px] px-6 sm:px-8 bg-foreground text-white rounded-xl text-sm font-medium
                   transition-all duration-200 ease-out active:scale-[0.98]
                   hover:bg-foreground/90
                   focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        Reintentar
      </button>
    </div>
  );
}
