import Markdown from '@ronradtke/react-native-markdown-display';
import { useColors } from '@/constants/theme';

export function GrammarMarkdown({ children }: { children: string }) {
  const c = useColors();

  return (
    <Markdown style={{
      body:         { color: c.mdBody },
      heading1:     { color: c.mdBright, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
      heading2:     { color: c.mdBright, fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 6 },
      heading3:     { color: c.mdBody,   fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 4 },
      paragraph:    { fontSize: 13, lineHeight: 22, marginBottom: 10 },
      strong:       { color: c.mdBright, fontWeight: '700' },
      em:           { fontStyle: 'italic', color: c.mdSubtle },
      code_inline:  { backgroundColor: c.input, color: c.primaryLight, fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 4 },
      fence:        { backgroundColor: c.input, borderRadius: 8, padding: 12, marginVertical: 8 },
      code_block:   { backgroundColor: c.input, borderRadius: 8, padding: 12, marginVertical: 8, color: c.primaryLight, fontFamily: 'monospace', fontSize: 12 },
      bullet_list:  { marginBottom: 8 },
      ordered_list: { marginBottom: 8 },
      list_item:    { marginBottom: 4 },
      hr:           { backgroundColor: c.muted, height: 1, marginVertical: 12 },
      blockquote:   { backgroundColor: c.input, borderLeftColor: c.primary, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 8 },
      table:        { borderColor: c.muted },
      th:           { backgroundColor: c.input, padding: 6 },
      td:           { borderColor: c.muted, padding: 6 },
      tr:           { borderColor: c.muted },
    }}>
      {children}
    </Markdown>
  );
}
