'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Database, ChevronDown, ChevronRight, Search, RotateCcw } from 'lucide-react';

const TX_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  DID_REGISTRATION:     { label: 'DID',        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  PORTFOLIO_SUBMISSION: { label: 'SUBMISSION',  color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  PORTFOLIO_REJECTION:  { label: 'REJECTION',   color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  VC_ISSUANCE:          { label: 'ISSUANCE',    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  VC_REVOCATION:        { label: 'REVOCATION',  color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  CREDENTIAL_FORWARD:   { label: 'FORWARD',     color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  CREDENTIAL_DECISION:  { label: 'DECISION',    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  CHAT_MESSAGE:         { label: 'MESSAGE',     color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' },
};

const ALL_TYPES = Object.keys(TX_TYPE_CONFIG);

export default function LedgerExplorer() {
  const { ledger, clearAndReset } = useLedgerStore();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [actorFilter, setActorFilter] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(ALL_TYPES));
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleExpand = (idx: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleType = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const filtered = [...ledger]
    .reverse()
    .map((tx, reversedIdx) => ({ tx, originalIdx: ledger.length - 1 - reversedIdx }))
    .filter(({ tx }) => {
      if (!typeFilters.has(tx.type)) return false;
      if (actorFilter && !tx.actor.toLowerCase().includes(actorFilter.toLowerCase())) return false;
      return true;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">Ledger Explorer</h2>
          <Badge variant="outline" className="font-mono">{ledger.length} blocks</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw className="w-3 h-3" />
          Reset Ledger
        </Button>
      </div>

      {/* Confirm reset */}
      {confirmReset && (
        <div className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-950/20 space-y-3">
          <p className="text-sm font-semibold text-red-700">
            Reset all data? This will clear localStorage and reinitialize mock users.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { clearAndReset(); setConfirmReset(false); }}
            >
              Yes, Reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Actor DID search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Filter by actor DID…"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
            />
          </div>

          {/* Type checkboxes */}
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const cfg = TX_TYPE_CONFIG[type];
              const active = typeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-opacity ${cfg.color} ${active ? 'opacity-100' : 'opacity-30'}`}
                >
                  {cfg.label}
                </button>
              );
            })}
            <button
              onClick={() => setTypeFilters(new Set(ALL_TYPES))}
              className="px-2 py-0.5 rounded text-[10px] font-semibold border border-border text-muted-foreground hover:bg-accent"
            >
              All
            </button>
            <button
              onClick={() => setTypeFilters(new Set())}
              className="px-2 py-0.5 rounded text-[10px] font-semibold border border-border text-muted-foreground hover:bg-accent"
            >
              None
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No transactions match the current filters.
          </div>
        ) : (
          filtered.map(({ tx, originalIdx }) => {
            const cfg = TX_TYPE_CONFIG[tx.type] ?? { label: tx.type, color: 'bg-gray-100 text-gray-800' };
            const isExpanded = expandedIds.has(originalIdx);
            const blockNum = originalIdx + 1;
            return (
              <div
                key={originalIdx}
                className="border rounded-lg overflow-hidden bg-card"
              >
                {/* Row */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleExpand(originalIdx)}
                >
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  }
                  <span className="font-mono text-[10px] text-muted-foreground w-12 shrink-0">
                    #{blockNum}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-mono text-foreground truncate flex-1 min-w-0">
                    {tx.actor.substring(0, 35)}…
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground">Actor: </span>
                        <code className="text-foreground break-all">{tx.actor}</code>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Data Hash: </span>
                        <code className="text-foreground break-all">{tx.dataHash}</code>
                      </div>
                    </div>
                    {tx.details && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Details
                        </p>
                        <pre className="bg-gray-950 text-emerald-300 text-[10px] p-3 rounded overflow-x-auto max-h-[300px] leading-relaxed">
                          {JSON.stringify(
                            // Truncate large base64 blobs
                            JSON.parse(JSON.stringify(tx.details, (key, val) => {
                              if (typeof val === 'string' && val.startsWith('data:') && val.length > 200) {
                                return val.substring(0, 60) + '…[truncated]';
                              }
                              return val;
                            })),
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
