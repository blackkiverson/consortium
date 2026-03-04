import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface ArtifactViewerProps {
  isOpen: boolean;
  onClose: () => void;
  artifactData: string | null;
  title?: string;
}

export default function ArtifactViewer({
  isOpen,
  onClose,
  artifactData,
  title = 'Artifact Viewer',
}: ArtifactViewerProps) {
  if (!isOpen || !artifactData) return null;

  const isImage = artifactData.startsWith('data:image');
  const isPdf = artifactData.startsWith('data:application/pdf');

  const getExtension = (dataUrl: string) => {
    const match = dataUrl.match(/^data:([^;]+);/);
    if (!match) return 'bin';
    const mime = match[1];
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/json': 'json',
    };
    return map[mime] || mime.split('/')[1] || 'bin';
  };

  const extension = getExtension(artifactData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={artifactData} download={`artifact.${extension}`} title="Download Artifact">
                <Download className="w-4 h-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-destructive"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-muted/30 flex items-center justify-center">
          {isImage ? (
            <img
              src={artifactData}
              alt="Artifact"
              className="max-w-full max-h-full object-contain rounded shadow-sm"
            />
          ) : isPdf ? (
            <iframe
              src={artifactData}
              className="w-full h-full min-h-[60vh] rounded border bg-white"
              title="PDF Viewer"
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4 text-sm">
                This file type cannot be previewed directly.
              </p>
              <Button variant="outline" onClick={() => window.open(artifactData, '_blank')}>
                Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
