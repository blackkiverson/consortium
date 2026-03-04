'use client';

import React, { useEffect, useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import HolderDashboard from '../components/HolderDashboard';
import IssuerDashboard from '../components/IssuerDashboard';
import VerifierPortal from '../components/VerifierPortal';
import LedgerExplorer from '../components/LedgerExplorer';
import Auth from '../components/Auth';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LogOut, LayoutDashboard, ArrowRight, Sun, Moon, Database } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Home() {
  const { currentView, switchView, init, currentUser, logout, switchOrganizationRole } = useLedgerStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    init();
    setMounted(true);
  }, [init]);

  const userName = currentUser ? (currentUser.profile as any).name as string : '';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderView = () => {
    if (!currentUser) {
      return <Auth />;
    }

    switch (currentView) {
      case 'HOLDER':
        return <HolderDashboard />;
      case 'ISSUER':
        return <IssuerDashboard />;
      case 'VERIFIER':
        return <VerifierPortal />;
      case 'EXPLORER':
        return <LedgerExplorer />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <LayoutDashboard className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Welcome back, {userName}
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              {currentUser.type === 'STUDENT'
                ? 'Manage your decentralized credentials, submit portfolios, and share verified achievements.'
                : 'Review submissions, issue verifiable credentials, and maintain the trust network.'}
            </p>
            <Button
              onClick={() => switchView(currentUser.role)}
              size="lg"
              className="gap-2"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  const avatarColors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-500',
  ];
  const colorIdx = userName ? userName.charCodeAt(0) % avatarColors.length : 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => switchView('HOME')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">C</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
              Consortium
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle — always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {currentUser && (
              <>
                {/* Ledger Explorer button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => switchView('EXPLORER')}
                  title="Ledger Explorer"
                >
                  <Database className="h-4 w-4" />
                </Button>

                {/* Org role switcher */}
                {currentUser.type === 'ORGANIZATION' && (
                  <Tabs
                    value={currentUser.role}
                    onValueChange={(v) => switchOrganizationRole(v as 'ISSUER' | 'VERIFIER')}
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="ISSUER" className="text-xs px-3 py-1 h-6">
                        Issuer
                      </TabsTrigger>
                      <TabsTrigger value="VERIFIER" className="text-xs px-3 py-1 h-6">
                        Verifier
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {/* User info */}
                <div className="flex items-center gap-2">
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-medium text-foreground leading-none">{userName}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1.5 font-mono">
                      {currentUser.type}
                    </Badge>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={`bg-gradient-to-br ${avatarColors[colorIdx]} text-white text-xs font-bold`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Logout */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </div>
    </main>
  );
}
