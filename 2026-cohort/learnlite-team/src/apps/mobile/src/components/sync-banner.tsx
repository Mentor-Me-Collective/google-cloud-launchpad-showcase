import { Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { useStudentStore } from '@/features/student/store/student-store';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { useCopy } from '@/lib/i18n';

/** A small message at the top when the server could not save a change. Tap to dismiss. */
export function SyncBanner() {
  const teacherError = useTeacherStore((state) => state.syncError);
  const studentError = useStudentStore((state) => state.syncError);
  const clearTeacher = useTeacherStore((state) => state.clearSyncError);
  const clearStudent = useStudentStore((state) => state.clearSyncError);
  const error = teacherError ?? studentError;
  const clear = () => {
    clearTeacher();
    clearStudent();
  };
  const copy = useCopy();
  if (!error) return null;
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-50 px-4 pt-safe-offset-2">
      <Pressable
        onPress={clear}
        accessibilityRole="alert"
        className="flex-row items-center gap-3 rounded-2xl border-2 border-warning bg-background px-4 py-3">
        <Text className="flex-1 text-sm font-semibold text-foreground">{copy.t(error)}</Text>
        <Text className="text-xs font-black uppercase text-warning">{copy.t('Dismiss')}</Text>
      </Pressable>
    </View>
  );
}
