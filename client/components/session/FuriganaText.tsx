import { View, Text, Platform } from 'react-native';
import { useColors } from '@/constants/theme';

type Segment = { base: string; reading?: string };

function parseAnnotation(raw: string): Segment[] {
  const segments: Segment[] = [];
  const tokens = raw.split(' ');
  for (let i = 0; i < tokens.length; i++) {
    if (i > 0) segments.push({ base: ' ' });
    const token = tokens[i];
    if (!token) continue;
    const re = /([^[\]]*)\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(token)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ base: token.slice(lastIndex, match.index) });
      }
      segments.push({ base: match[1], reading: match[2] });
      lastIndex = re.lastIndex;
    }
    if (lastIndex < token.length) {
      segments.push({ base: token.slice(lastIndex) });
    }
  }
  return segments;
}

// Converts parsed segments to an HTML string using <ruby>/<rt> tags.
function buildRubyHtml(segments: Segment[], readingSize: number, readingColor: string): string {
  return segments.map(seg => {
    const base = seg.base.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!seg.reading) return base;
    const reading = seg.reading.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<ruby>${base}<rt style="font-size:${readingSize}px;color:${readingColor};">${reading}</rt></ruby>`;
  }).join('');
}

interface FuriganaTextProps {
  annotation: string;
  baseSize?: number;
  readingSize?: number;
}

export function FuriganaText({ annotation, baseSize = 18, readingSize = 10 }: FuriganaTextProps) {
  const colors = useColors();
  const segments = parseAnnotation(annotation);

  if (Platform.OS === 'web') {
    const html = buildRubyHtml(segments, readingSize, colors.primary as string);
    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ fontSize: baseSize, color: colors.foreground as string } as React.CSSProperties}
      />
    );
  }

  // Native: row with flex-end alignment so all glyphs share the same baseline.
  // Ruby groups are taller (reading + base) but bottom-align with plain text.
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {segments.map((seg, i) => {
        if (!seg.reading) {
          return (
            <Text key={i} style={{ fontSize: baseSize, color: colors.foreground as string }}>
              {seg.base}
            </Text>
          );
        }
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: readingSize, color: colors.primary as string, lineHeight: readingSize + 2 }}>
              {seg.reading}
            </Text>
            <Text style={{ fontSize: baseSize, color: colors.foreground as string }}>
              {seg.base}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
