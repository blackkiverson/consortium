'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Send, MessageSquare } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  peerDid: string;
  peerName: string;
  /** Optional human-readable label shown under the title (e.g. "Re: Revoked Credential") */
  contextLabel?: string;
  /** Optional ID stored on messages to link them to a specific credential/submission */
  contextRef?: string;
}

export default function ChatPanel({
  isOpen,
  onClose,
  peerDid,
  peerName,
  contextLabel,
  contextRef,
}: ChatPanelProps) {
  const { currentUser, ledger, sendMessage } = useLedgerStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // All messages between the current user and the peer, oldest first
  const messages = ledger
    .filter((tx) => {
      if (tx.type !== 'CHAT_MESSAGE') return false;
      const { fromDid, toDid } = tx.details ?? {};
      return (
        (fromDid === currentUser?.did && toDid === peerDid) ||
        (fromDid === peerDid && toDid === currentUser?.did)
      );
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(peerDid, trimmed, contextRef);
    setInput('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 flex flex-col overflow-hidden" style={{ height: '520px' }}>
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            {peerName}
          </DialogTitle>
          {contextLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{contextLabel}</p>
          )}
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-50">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            </div>
          ) : (
            messages.map((tx, i) => {
              const isOwn = tx.details?.fromDid === currentUser?.did;
              return (
                <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 text-sm rounded-2xl ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words leading-snug">{tx.details?.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(tx.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t flex gap-2 shrink-0 bg-background">
          <Input
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
