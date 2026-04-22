import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { useColors } from '@/constants/theme';

interface CsvFileDropZoneProps {
  fileName: string | null;
  onFileSelected: (name: string, content: string) => void;
}

export function CsvFileDropZone({ fileName, onFileSelected }: CsvFileDropZoneProps) {
  const colors = useColors();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File | null | undefined) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.tsv') && !name.endsWith('.txt')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFileSelected(file.name, reader.result);
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    readFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    readFile(event.target.files?.[0]);
  }

  function handleOpenPicker() {
    fileInputRef.current?.click();
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleOpenPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenPicker();
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        borderRadius: 12,
        border: `2px dashed ${isDragActive ? colors.primary : colors.border}`,
        background: colors.surface,
        padding: '36px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 150ms ease',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      <div style={{ color: colors.foreground_secondary, fontWeight: 600, marginBottom: 6 }}>
        {isDragActive ? 'Release to attach CSV' : 'Drop CSV Here'}
      </div>
      <div style={{ color: colors.foreground_muted, fontSize: 12, marginBottom: 10 }}>
        Drag and drop works here. Click to browse files.
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenPicker();
        }}
        style={{
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: colors.background_muted,
          color: colors.foreground,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Choose CSV
      </button>
      {fileName ? (
        <div
          style={{
            marginTop: 12,
            display: 'inline-block',
            borderRadius: 6,
            border: `1px solid ${colors.border}`,
            background: colors.background_muted,
            color: colors.foreground,
            fontSize: 12,
            padding: '6px 10px',
          }}
        >
          Selected: {fileName}
        </div>
      ) : null}
    </div>
  );
}
