'use client';

import React, { useEffect, useState } from 'react';
import { Input, Autocomplete, AutocompleteItem, addToast } from "@heroui/react";

import { getData } from '@/actions/get';

/**
 * LogViewerPage
 * ─── Displays a dropdown of all daily logs, and shows the chosen file.
 */
export default function LogViewerPage() {
  // 1) List of filenames returned from GET /api/logs/files
  const [files, setFiles] = useState<string[]>([]);
  // 2) The currently selected filename (e.g. "app-2025-06-05.log")
  const [selectedFile, setSelectedFile] = useState<string>('');
  // 3) Raw text of that file
  const [logContent, setLogContent] = useState<string>('');
  // 4) A filter string to highlight / filter log lines
  const [searchTerm, setSearchTerm] = useState<string>('');
  // 5) Loading states
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1. On mount, fetch the list of log files
  useEffect(() => {
    (async () => {
      try {
        setLoadingFiles(true);
        const res = await getData('/logs/files');

        if (res.success) {
          setFiles(res.files || []);
          if (res.files && res.files.length > 0) {
            setSelectedFile(res.files[0]);
          }
        } else {
          setError(res.error || 'Failed to load log file list');
        }
      } catch (err) {
        setError('Failed to load log file list');
      } finally {
        setLoadingFiles(false);
      }
    })();
  }, []);

  // 2. Whenever selectedFile changes, fetch its contents
  useEffect(() => {
    if (!selectedFile) {
      setLogContent('');

      return;
    }
    (async () => {
      try {
        setLoadingContent(true);
        setError('');
        const resp = await getData(`/logs/file/${selectedFile}`, true);

        if (!resp.ok) {
          addToast({
            title: `Could not fetch ${selectedFile}`,
            color: 'danger'
          })
          return;
        }

        setLogContent(resp);
      } catch (err: any) {
        setError(err.message || 'Error fetching log content');
        setLogContent('');
      } finally {
        setLoadingContent(false);
      }
    })();
  }, [selectedFile]);

  // 3. Filtered lines (if searchTerm is nonempty, show only lines containing it)
  const filteredLines = React.useMemo(() => {
    if (!searchTerm) return logContent.split('\n');
    const lower = searchTerm.toLowerCase();

    return logContent
      .split('\n')
      .filter(line => line.toLowerCase().includes(lower));
  }, [logContent, searchTerm]);

  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-semibold mb-4">Log Viewer</h1>

      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {/* 1) File selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="logFileSelect">
          Select Log File:
        </label>
        {loadingFiles ? (
          <p>Loading files…</p>
        ) : (
          <Autocomplete
            id="logFileSelect"
            isClearable={false}
            label="Log File"
            onSelectionChange={k => k && setSelectedFile(k.toString())}
          >
            {files.map(f => (
              <AutocompleteItem key={f} textValue={f}>
                {f}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        )}
      </div>

      {/* 2) Search / filter */}
      <div className="mb-4">
        <Input
          label="Filter lines (case-insensitive)"
          placeholder="Enter text to filter"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 3) Log content panel */}
      <div
        className="border rounded-md bg-black text-green-300 p-4 font-mono text-sm overflow-auto"
        style={{ height: '60vh' }}
      >
        {loadingContent ? (
          <p>Loading content…</p>
        ) : (
          filteredLines.map((line, idx) => (
            <p key={idx} className="whitespace-pre-wrap">
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
