import { StyleSheet } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Colors } from '@/constants/theme';

const mdStyles = StyleSheet.create({
  body:          { color: Colors.mdBody },
  heading1:      { color: Colors.mdBright, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heading2:      { color: Colors.mdBright, fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  heading3:      { color: Colors.mdBody, fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  paragraph:     { fontSize: 13, lineHeight: 22, marginBottom: 10 },
  strong:        { color: Colors.mdBright, fontWeight: '700' },
  em:            { fontStyle: 'italic', color: Colors.mdSubtle },
  code_inline:   { backgroundColor: Colors.input, color: Colors.primaryLight, fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 4 },
  fence:         { backgroundColor: Colors.input, borderRadius: 8, padding: 12, marginVertical: 8 },
  code_block:    { backgroundColor: Colors.input, borderRadius: 8, padding: 12, marginVertical: 8, color: Colors.primaryLight, fontFamily: 'monospace', fontSize: 12 },
  bullet_list:   { marginBottom: 8 },
  ordered_list:  { marginBottom: 8 },
  list_item:     { marginBottom: 4 },
  hr:            { backgroundColor: Colors.muted, height: 1, marginVertical: 12 },
  blockquote:    { backgroundColor: Colors.input, borderLeftColor: Colors.primary, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 8 },
  table:         { borderColor: Colors.muted },
  th:            { backgroundColor: Colors.input, padding: 6 },
  td:            { borderColor: Colors.muted, padding: 6 },
  tr:            { borderColor: Colors.muted },
});

export function GrammarMarkdown({ children }: { children: string }) {
  return <Markdown style={mdStyles}>{children}</Markdown>;
}
