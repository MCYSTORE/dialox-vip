'use client';

import { Match, PickStatus } from '@/lib/types';
import { formatDateTime, calculateMetrics, updatePickStatus, exportHistoryToCSV, HistoryMetrics } from '@/lib/storage';
import { sportConfig } from '@/lib/data';
import { HistoryDashboard } from './HistoryDashboard';

interface HistoryPanelProps {
  history: HistoryEntry[];
  isLoading: boolean;
  onClear: () => void;
  onStatusChange: () => void;
}

interface HistoryEntry {
  id: string;
  matchId: string;
  equipos: string;
  liga: string;
  deporte: 'soccer' | 'basketball' | 'baseball';
  mercado: string;
  cuota: number;
  confianza: number;
  timestamp: string;
  analisis_vip: string;
  status: PickStatus;
}

const statusConfig: Record<PickStatus, { label: string; bgClass: string; textClass: string; icon: string }> = {
  pending: { 
    label: 'Pendiente', 
    bgClass: 'bg-secondary/60', 
    textClass: 'text-muted-foreground',
    icon: '⏳'
  },
  won: { 
    label: 'Ganado', 
    bgClass: 'bg-emerald-50', 
    textClass: 'text-emerald-600',
    icon: '✓'
  },
  lost: { 
    label: 'Perdido', 
    bgClass: 'bg-red-50', 
    textClass: 'text-red-500',
    icon: '✗'
  },
  void: { 
    label: 'Anulado', 
    bgClass: 'bg-amber-50', 
    textClass: 'text-amber-600',
    icon: '○'
  },
};

export function HistoryPanel({ history, isLoading, onClear, onStatusChange }: HistoryPanelProps) {
  const metrics = calculateMetrics();
  
  const handleStatusChange = (id: string, newStatus: PickStatus) => {
    updatePickStatus(id, newStatus);
    onStatusChange();
  };
  
  const handleExportCSV = () => {
    const csv = exportHistoryToCSV();
    if (!csv) return;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dialox-vip-historial-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  if (isLoading) {
    return (
      <div className="bg-white border border-border rounded-2xl p-4 sm:p-5">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 sm:h-9 sm:w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32 sm:w-40" />
                <div className="skeleton h-3 w-20 sm:w-24" />
              </div>
              <div className="skeleton h-5 w-10 sm:w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard */}
      <HistoryDashboard metrics={metrics} />
      
      {/* History List */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border/70">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Historial</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {history.length} {history.length === 1 ? 'pick guardado' : 'picks guardados'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground 
                             hover:bg-secondary rounded-lg transition-all duration-200 active:scale-95
                             flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={onClear}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground 
                             hover:bg-secondary rounded-lg transition-all duration-200 active:scale-95"
                >
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {history.length === 0 ? (
          <div className="px-4 sm:px-5 py-8 sm:py-10 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-secondary flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Sin picks guardados</p>
            <p className="text-xs text-muted-foreground/60 mt-1 px-4">Los análisis guardados aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-72 sm:max-h-80 lg:max-h-96 overflow-y-auto smooth-scroll">
            {history.map((entry) => {
              const statusInfo = statusConfig[entry.status];
              
              return (
                <div
                  key={entry.id}
                  className="px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-secondary/30 transition-colors duration-150"
                >
                  {/* Mobile: Card layout */}
                  <div className="sm:hidden">
                    <div className="flex items-start gap-3">
                      {/* Sport Icon */}
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-base">{sportConfig[entry.deporte]?.icon || '⚽'}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {entry.equipos}
                          </p>
                          <span className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
                            @{entry.cuota.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className="text-xs text-muted-foreground/70">{entry.liga}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="text-xs text-muted-foreground/70">{entry.mercado}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground/60">
                            {formatDateTime(entry.timestamp)}
                          </span>
                          
                          {/* Status Selector */}
                          <select
                            value={entry.status}
                            onChange={(e) => handleStatusChange(entry.id, e.target.value as PickStatus)}
                            className={`h-7 px-2 rounded-lg text-xs font-medium border-0 cursor-pointer
                                       ${statusInfo.bgClass} ${statusInfo.textClass}
                                       focus:outline-none focus:ring-2 focus:ring-accent/20`}
                          >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="won">✓ Ganado</option>
                            <option value="lost">✗ Perdido</option>
                            <option value="void">○ Anulado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop: Original layout */}
                  <div className="hidden sm:flex items-start gap-3">
                    {/* Sport Icon */}
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm">{sportConfig[entry.deporte]?.icon || '⚽'}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.equipos}
                        </p>
                        <span className="text-sm font-medium text-foreground tabular-nums flex-shrink-0">
                          @{entry.cuota.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground/70">{entry.liga}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-xs text-muted-foreground/70">{entry.mercado}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/60">
                          {formatDateTime(entry.timestamp)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                          <span className="text-xs text-[#16A34A] font-medium">
                            {entry.confianza}% conf.
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Selector - Desktop */}
                    <select
                      value={entry.status}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value as PickStatus)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-medium border-0 cursor-pointer
                                 ${statusInfo.bgClass} ${statusInfo.textClass}
                                 focus:outline-none focus:ring-2 focus:ring-accent/20`}
                    >
                      <option value="pending">⏳ Pendiente</option>
                      <option value="won">✓ Ganado</option>
                      <option value="lost">✗ Perdido</option>
                      <option value="void">○ Anulado</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
