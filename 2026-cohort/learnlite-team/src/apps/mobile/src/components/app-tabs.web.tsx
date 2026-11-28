import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/store/auth-store';
import { useCopy } from '@/lib/i18n';

export default function AppTabs() {
  const role = useAuthStore((state) => state.role);
  const isTeacher = role === 'teacher';
  const copy = useCopy();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {isTeacher ? (
            <>
              <TabTrigger name="panel" href="/panel" asChild>
                <TabButton>{copy.t('Panel')}</TabButton>
              </TabTrigger>
              <TabTrigger name="classes" href="/classes" asChild>
                <TabButton>{copy.classrooms}</TabButton>
              </TabTrigger>
              <TabTrigger name="teacher-modules" href="/teacher-modules" asChild>
                <TabButton>{copy.modules}</TabButton>
              </TabTrigger>
              <TabTrigger name="profile" href="/profile" asChild>
                <TabButton>{copy.profile}</TabButton>
              </TabTrigger>
            </>
          ) : (
            <>
              <TabTrigger name="index" href="/" asChild>
                <TabButton>{copy.t('Learn')}</TabButton>
              </TabTrigger>
              <TabTrigger name="student-classes" href="/student-classes" asChild>
                <TabButton>{copy.classrooms}</TabButton>
              </TabTrigger>
              <TabTrigger name="community" href="/community" asChild>
                <TabButton>{copy.t('Community')}</TabButton>
              </TabTrigger>
              <TabTrigger name="student-profile" href="/student-profile" asChild>
                <TabButton>{copy.profile}</TabButton>
              </TabTrigger>
            </>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="rounded-xl px-4 py-2 active:opacity-70">
      <Text
        className={
          isFocused ? 'text-sm font-medium text-foreground' : 'text-sm font-medium text-muted'
        }>
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View
      {...props}
      className="absolute bottom-0 w-full flex-row items-center justify-center bg-background p-4">
      <View className="w-full max-w-3xl flex-row items-center gap-2 rounded-2xl bg-surface px-5 py-2">
        {props.children}
      </View>
    </View>
  );
}
