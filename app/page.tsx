'use client';

import React, { useEffect } from 'react';
import { useLedgerStore } from '../store/ledger';
import HolderDashboard from '../components/HolderDashboard';
import IssuerDashboard from '../components/IssuerDashboard';
import VerifierPortal from '../components/VerifierPortal';
import { cn } from '../components/ui/components';

export default function Home() {
  const { currentView, switchView, init } = useLedgerStore();

  useEffect(() => {
    init();
  }, [init]);

  const renderView = () => {
    switch (currentView) {
      case 'HOLDER':
        return <HolderDashboard />;
      case 'ISSUER':
        return <IssuerDashboard />;
      case 'VERIFIER':
        return <VerifierPortal />;
      default:
        return (
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Consortium DLT</h1>
            <p className="text-xl text-gray-600 mb-8">Decentralized Credentialing System Demo</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => switchView('HOLDER')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Student Portal
              </button>
              <button
                onClick={() => switchView('ISSUER')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                University Portal
              </button>
              <button
                onClick={() => switchView('VERIFIER')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Verifier Portal
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => switchView('HOME')}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
            <span className="font-bold text-xl text-gray-900">Consortium</span>
          </div>

          {currentView !== 'HOME' && (
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {(['HOLDER', 'ISSUER', 'VERIFIER'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => switchView(view)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    currentView === view
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {view.charAt(0) + view.slice(1).toLowerCase()}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </div>
    </main>
  );
}
