import { Text, View } from 'react-native';

import { parseBrief } from '@/features/readiness/utils/parse-brief';

export function BriefText({ text }: { text: string }) {
  const lines = parseBrief(text);
  return (
    <View className="gap-2">
      {lines.map((line, i) => {
        const body = line.spans.map((s, j) => (
          <Text
            key={j}
            className={s.cite ? 'text-[12px] font-semibold text-accent' : s.bold ? 'font-bold text-foreground' : undefined}
          >
            {s.text}
          </Text>
        ));
        if (line.kind === 'heading') {
          return (
            <Text key={i} className="pt-2 text-[15px] font-bold text-foreground">
              {body}
            </Text>
          );
        }
        if (line.kind === 'text') {
          return (
            <Text key={i} className="text-[14px] leading-5 text-foreground">
              {body}
            </Text>
          );
        }
        return (
          <View key={i} className="flex-row gap-2 pl-1">
            <Text className="w-5 text-[14px] leading-5 font-semibold text-muted">{line.marker}</Text>
            <Text className="flex-1 text-[14px] leading-5 text-foreground">{body}</Text>
          </View>
        );
      })}
    </View>
  );
}
