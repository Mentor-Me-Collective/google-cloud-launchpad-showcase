import type { ComponentProps } from 'react';

import { AppButton } from '@/components/app-button';

export function ChunkyButton(props: ComponentProps<typeof AppButton>) {
  return <AppButton {...props} />;
}
