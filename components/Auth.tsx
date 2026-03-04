'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

export default function Auth() {
  const { registerUser, login, users } = useLedgerStore();
  const [type, setType] = useState<'STUDENT' | 'ORGANIZATION'>('STUDENT');

  // Login state
  const [didInput, setDidInput] = useState('');

  // Signup state
  const [studentProfile, setStudentProfile] = useState({ name: '', dob: '', email: '' });
  const [orgProfile, setOrgProfile] = useState({ name: '', address: '', registrationId: '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(didInput);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'STUDENT') {
      registerUser('STUDENT', 'HOLDER', studentProfile);
    } else {
      registerUser('ORGANIZATION', 'ISSUER', orgProfile);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-10">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
          <span className="text-white text-2xl font-black">C</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Consortium</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Decentralized credentialing on the blockchain
        </p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <Tabs defaultValue="login">
          <CardHeader className="pb-0">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>

          {/* LOGIN */}
          <TabsContent value="login">
            <CardContent className="pt-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="account-select">Select Account (Mock)</Label>
                  <select
                    id="account-select"
                    value={didInput}
                    onChange={(e) => setDidInput(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a user…</option>
                    {users.map((u) => (
                      <option key={u.did} value={u.did}>
                        {(u.profile as any).name} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" disabled={!didInput} className="w-full">
                  Enter Dashboard
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  In a real app, you'd use Email/Password or a Web3 Wallet.
                </p>
              </form>
            </CardContent>
          </TabsContent>

          {/* SIGNUP */}
          <TabsContent value="signup">
            <CardContent className="pt-6">
              {/* Account type picker */}
              <div className="flex p-1 bg-muted rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => setType('STUDENT')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    type === 'STUDENT'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setType('ORGANIZATION')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    type === 'ORGANIZATION'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Organization
                </button>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {type === 'STUDENT' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="s-name">Full Name</Label>
                      <Input
                        id="s-name"
                        placeholder="Alice Johnson"
                        value={studentProfile.name}
                        onChange={(e) => setStudentProfile({ ...studentProfile, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-dob">Date of Birth</Label>
                      <Input
                        id="s-dob"
                        type="date"
                        value={studentProfile.dob}
                        onChange={(e) => setStudentProfile({ ...studentProfile, dob: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-email">Email</Label>
                      <Input
                        id="s-email"
                        type="email"
                        placeholder="alice@example.com"
                        value={studentProfile.email}
                        onChange={(e) => setStudentProfile({ ...studentProfile, email: e.target.value })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="o-name">Organization Name</Label>
                      <Input
                        id="o-name"
                        placeholder="Consortium University"
                        value={orgProfile.name}
                        onChange={(e) => setOrgProfile({ ...orgProfile, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="o-addr">Address</Label>
                      <Input
                        id="o-addr"
                        placeholder="123 University Ave"
                        value={orgProfile.address}
                        onChange={(e) => setOrgProfile({ ...orgProfile, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="o-reg">Govt Registration ID</Label>
                      <Input
                        id="o-reg"
                        placeholder="REG-12345"
                        value={orgProfile.registrationId}
                        onChange={(e) =>
                          setOrgProfile({ ...orgProfile, registrationId: e.target.value })
                        }
                        required
                      />
                    </div>
                  </>
                )}

                <Separator />

                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
