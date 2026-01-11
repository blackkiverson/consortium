'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { cn } from './ui/components';

export default function Auth() {
    const { registerUser, login, users } = useLedgerStore();
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [type, setType] = useState<'STUDENT' | 'ORGANIZATION'>('STUDENT');

    // Login state
    const [didInput, setDidInput] = useState('');

    // Signup state - Student
    const [studentProfile, setStudentProfile] = useState({ name: '', dob: '', email: '' });
    // Signup state - Organization
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
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mt-10">
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setMode('LOGIN')}
                    className={cn(
                        "flex-1 py-4 text-sm font-semibold transition-all",
                        mode === 'LOGIN' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Login
                </button>
                <button
                    onClick={() => setMode('SIGNUP')}
                    className={cn(
                        "flex-1 py-4 text-sm font-semibold transition-all", mode === 'SIGNUP' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Sign Up
                </button>
            </div>

            <div className="p-8">
                {mode === 'LOGIN' ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Account (Mock)</label>
                            <select
                                value={didInput}
                                onChange={(e) => setDidInput(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            >
                                <option value="">Select a user...</option>
                                {users.map(u => (
                                    <option key={u.did} value={u.did}>
                                        {(u.profile as any).name} ({u.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={!didInput}
                            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            Enter Dashboard
                        </button>
                        <p className="text-xs text-center text-gray-500">In a real app, you would use Email/Password or Web3 Wallet.</p>
                    </form>
                ) : (
                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                            <button
                                type="button"
                                onClick={() => setType('STUDENT')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                                    type === 'STUDENT' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                                )}
                            >
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('ORGANIZATION')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                                    type === 'ORGANIZATION' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                                )}
                            >
                                Organization
                            </button>
                        </div>

                        {type === 'STUDENT' ? (
                            <div className="space-y-4">
                                <input
                                    placeholder="Full Name"
                                    value={studentProfile.name}
                                    onChange={e => setStudentProfile({ ...studentProfile, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                                <input
                                    type="date"
                                    placeholder="Date of Birth"
                                    value={studentProfile.dob}
                                    onChange={e => setStudentProfile({ ...studentProfile, dob: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={studentProfile.email}
                                    onChange={e => setStudentProfile({ ...studentProfile, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    placeholder="Organization Name"
                                    value={orgProfile.name}
                                    onChange={e => setOrgProfile({ ...orgProfile, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                                <input
                                    placeholder="Address"
                                    value={orgProfile.address}
                                    onChange={e => setOrgProfile({ ...orgProfile, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                                <input
                                    placeholder="Govt Registration ID"
                                    value={orgProfile.registrationId}
                                    onChange={e => setOrgProfile({ ...orgProfile, registrationId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-200 transition-all"
                        >
                            Create Account
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
