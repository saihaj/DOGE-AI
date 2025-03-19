'use client';
import { Header } from '@/components/header';
import { Editor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';

export default function Prompts() {
  const { theme } = useTheme();

  return (
    <>
      <Header />
      <Editor
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
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
