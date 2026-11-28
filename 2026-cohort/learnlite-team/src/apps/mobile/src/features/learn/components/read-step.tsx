import { Text, View } from 'react-native';

import type { ReadItem } from '@/features/learn/types/learn';
import { useCopy } from '@/lib/i18n';

type ReadStepProps = {
  item: ReadItem;
  sourceTitle?: string;
};

export function ReadStep({ item, sourceTitle }: ReadStepProps) {
  const copy = useCopy();
  const lines = item.body.split(/\s(?=\d\.\s)/);
  return (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-foreground">{item.heading}</Text>
      <View className="gap-3">
        {lines.map((line, lineIndex) => (
          <Text key={`${lineIndex}-${line}`} className="text-lg leading-7 text-foreground">
            {line}
          </Text>
        ))}
      </View>
      {sourceTitle ? <Text className="text-sm text-muted">{copy.t('Source: {source}', { source: sourceTitle })}</Text> : null}
    </View>
  );
}
