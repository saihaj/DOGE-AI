'use client';
import { Header } from '@/components/header';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

export default function Prompts() {
  const { theme } = useTheme();

  return (
    <>
      <Header />
      <Editor
        height="100vh"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        defaultLanguage="markdown"
        options={{
          automaticLayout: true,
          wordWrap: 'on',
          inDiffEditor: false,
          smartSelect: {
            selectSubwords: true,
            selectLeadingAndTrailingWhitespace: true,
          },
          fontSize: 18,
          readOnly: false,
          mouseWheelZoom: false,
          selectOnLineNumbers: true,
          cursorBlinking: 'blink',
          cursorStyle: 'line',
          contextmenu: true,
          minimap: {
            enabled: false,
          },
        }}
      />
    </>
  );
}
