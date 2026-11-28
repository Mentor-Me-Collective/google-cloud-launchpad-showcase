import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { Lumi } from '@/components/lumi/lumi';
import { SyncBanner } from '@/components/sync-banner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { useCopy } from '@/lib/i18n';

export default function TeacherLayout() {
  const authenticated = useAuthStore((state) => state.authenticated);
  const role = useAuthStore((state) => state.role);
  const loaded = useTeacherStore((state) => state.loaded);
  const loading = useTeacherStore((state) => state.loading);
  const loadAll = useTeacherStore((state) => state.loadAll);
  const copy = useCopy();

  // These screens can be opened directly (a reload or a link) before the data arrived.
  useEffect(() => {
    if (authenticated && role === 'teacher' && !loaded && !loading) void loadAll();
  }, [authenticated, role, loaded, loading, loadAll]);

  if (!authenticated) return <Redirect href="/login" />;
  if (role !== 'teacher') return <Redirect href="/" />;

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background">
        <Lumi size={140} mood="thinking" />
        <Text className="font-rounded text-lg font-black text-muted">{copy.t('Getting your classrooms ready...')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <SyncBanner />
    </View>
  );
}
