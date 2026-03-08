'use client';

// v2.0 - Optimización de carga Triple Corona
import { DataStatus } from '@/lib/types';

interface HeaderProps {
  status: DataStatus;
  lastUpdate?: string | null;
}

const statusConfig: Record<DataStatus, { label: string; dotClass: string }> = {
  loading: { label: 'Cargando...', dotClass: 'status-loading' },
  connected: { label: 'Conectado', dotClass: 'status-connected' },
  disconnected: { label: 'Sin conexión', dotClass: 'status-disconnected' },
  reconnecting: { label: 'Reconectando...', dotClass: 'status-loading' },
};

export function Header({ status, lastUpdate }: HeaderProps) {
  const { label, dotClass } = statusConfig[status];

  return (
    <header className="w-full">
      {/* Mobile: Compact layout */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-xl font-semibold text-foreground"
              style={{ letterSpacing: '-0.03em' }}
            >
              Dialox VIP
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tus 3 mejores picks del día
            </p>
          </div>
          
          {/* Status indicator inline on mobile */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/70">
            <span className={`status-dot ${dotClass}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
        
        {/* Last update on separate line for mobile */}
        {lastUpdate && status === 'connected' && (
          <div className="mt-2 text-xs text-muted-foreground/60">
            Actualizado {lastUpdate}
          </div>
        )}
      </div>
      
      {/* Desktop: Centered layout */}
      <div className="hidden sm:flex flex-col items-center text-center space-y-3 sm:space-y-4">
        {/* Brand Title */}
        <div className="space-y-1.5 sm:space-y-2">
          <h1 
            className="text-2xl sm:text-3xl font-semibold text-foreground"
            style={{ letterSpacing: '-0.03em' }}
          >
            Dialox VIP
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Tus 3 mejores picks del día
          </p>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${dotClass}`} />
            <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
          </div>
          
          {lastUpdate && status === 'connected' && (
            <>
              <span className="text-border text-xs">|</span>
              <span className="text-xs text-muted-foreground/70">
                {lastUpdate}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
