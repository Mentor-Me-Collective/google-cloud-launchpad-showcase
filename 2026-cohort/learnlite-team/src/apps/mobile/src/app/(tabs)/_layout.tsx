import { Redirect, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { BookIcon, CapIcon, DashboardIcon, GlobeIcon, HomeIcon, ProfileIcon } from '@/components/game/game-icons';
import { SwipeTabs } from '@/components/swipe-tabs';
import { TabsPager, type PagerTab } from '@/components/tabs-pager';
import { SyncBanner } from '@/components/sync-banner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useStudentStore } from '@/features/student/store/student-store';
import { useLiveRefresh } from '@/lib/use-live-refresh';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { useCopy } from '@/lib/i18n';
import { useTabStore } from '@/lib/tab-store';

import ClassesScreen from './classes';
import CommunityScreen from './community';
import LearnScreen from './index';
import TeacherPanelScreen from './panel';
import TeacherProfileScreen from './profile';
import StudentClassesScreen from './student-classes';
import StudentProfileScreen from './student-profile';
import TeacherModulesScreen from './teacher-modules';

const TEACHER_TABS = new Set(['panel', 'classes', 'teacher-modules', 'profile']);

// Left to right, in the order of the tab bar: swiping moves between neighbours.
const TEACHER_ORDER = [
  { name: 'panel', href: '/panel' },
  { name: 'classes', href: '/classes' },
  { name: 'teacher-modules', href: '/teacher-modules' },
  { name: 'profile', href: '/profile' },
] as const;
const STUDENT_ORDER = [
  { name: 'index', href: '/' },
  { name: 'student-classes', href: '/student-classes' },
  { name: 'community', href: '/community' },
  { name: 'student-profile', href: '/student-profile' },
] as const;

export default function TabsLayout() {
  const authenticated = useAuthStore((s) => s.authenticated);
  const role = useAuthStore((s) => s.role);
  const segments = useSegments();
  const loadTeacherData = useTeacherStore((s) => s.loadAll);
  const loadStudentData = useStudentStore((s) => s.loadAll);
  const refreshTeacherData = useTeacherStore((s) => s.refreshPeople);
  const refreshStudentData = useStudentStore((s) => s.refresh);
  const copy = useCopy();

  // Classrooms, modules, assignments and progress come from the server.
  useEffect(() => {
    if (!authenticated) return;
    if (role === 'teacher') void loadTeacherData();
    else void loadStudentData();
  }, [authenticated, role, loadTeacherData, loadStudentData]);

  // Changes made by other people show up on their own, without signing out and in.
  useLiveRefresh(role === 'teacher' ? refreshTeacherData : refreshStudentData, authenticated);

  if (!authenticated) return <Redirect href="/login" />;

  // NativeTabs only registers the routes declared as triggers. If a teacher lands on a
  // student tab (or "/" on cold start), that route is missing from the native navigator
  // and Android renders a black screen. Redirect before mounting the tabs instead.
  // useSegments() describes the screen in front, not this layout. While a classroom or a lesson
  // is open on top, the segments are not a tab at all; redirecting (or unmounting the pager)
  // then threw the person back to the first tab when they returned. Only check them while a
  // tab really is the screen in front.
  const inTabs = segments[0] === '(tabs)';
  const routeName = inTabs ? (segments[1] ?? 'index') : undefined;
  if (inTabs && role === 'teacher' && !TEACHER_TABS.has(routeName ?? '')) {
    return <Redirect href="/panel" />;
  }
  if (inTabs && role !== 'teacher' && TEACHER_TABS.has(routeName ?? '')) {
    return <Redirect href="/" />;
  }

  // On the phone the tabs are pages of a pager, so the next screen follows the finger.
  if (Platform.OS !== 'web') {
    const pages: PagerTab[] =
      role === 'teacher'
        ? [
            { name: 'panel', label: copy.t('Panel'), Icon: DashboardIcon, Screen: TeacherPanelScreen },
            { name: 'classes', label: copy.classrooms, Icon: CapIcon, Screen: ClassesScreen },
            { name: 'teacher-modules', label: copy.modules, Icon: BookIcon, Screen: TeacherModulesScreen },
            { name: 'profile', label: copy.profile, Icon: ProfileIcon, Screen: TeacherProfileScreen },
          ]
        : [
            { name: 'index', label: copy.t('Learn'), Icon: HomeIcon, Screen: LearnScreen },
            { name: 'student-classes', label: copy.classrooms, Icon: CapIcon, Screen: StudentClassesScreen },
            { name: 'community', label: copy.t('Community'), Icon: GlobeIcon, Screen: CommunityScreen },
            { name: 'student-profile', label: copy.profile, Icon: ProfileIcon, Screen: StudentProfileScreen },
          ];
    return (
      <View style={{ flex: 1 }}>
        <TabsPager key={role} tabs={pages} initialName={useTabStore.getState().current ?? routeName ?? pages[0].name} />
        <SyncBanner />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SwipeTabs tabs={role === 'teacher' ? [...TEACHER_ORDER] : [...STUDENT_ORDER]}>
        <AppTabs />
      </SwipeTabs>
      <SyncBanner />
    </View>
  );
}
