import { useState } from 'react';

import { AppButton } from '@/components/app-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PlayfulIcon } from '@/components/icon';
import { useStudentStore } from '@/features/student/store/student-store';
import { useCopy } from '@/lib/i18n';

/**
 * One button for the whole "study without internet" story: save the module on the phone, see
 * that it is saved, and (after asking) remove it when it is no longer needed.
 */
export function DownloadButton({ moduleId, title, color = '#2F6BFF' }: { moduleId: string; title: string; color?: string }) {
  const copy = useCopy();
  const saved = useStudentStore((state) => state.downloadedModules.some((module) => module.id === moduleId));
  const busy = useStudentStore((state) => state.downloading.includes(moduleId));
  const download = useStudentStore((state) => state.downloadModule);
  const remove = useStudentStore((state) => state.removeModule);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <AppButton
        label={busy ? copy.t('Saving...') : saved ? copy.t('Saved offline') : copy.t('Save for offline')}
        iconOnly
        flat
        size="sm"
        variant="secondary"
        disabled={busy}
        icon={<PlayfulIcon name={saved ? 'check-circle' : 'cloud-download-outline'} size={20} color={saved ? '#2EAF67' : color} />}
        onPress={() => (saved ? setAsking(true) : void download(moduleId))}
      />
      <ConfirmDialog
        visible={asking}
        danger
        icon="trash-can-outline"
        title={copy.t('Remove from this phone?')}
        message={copy.t('"{title}" will no longer work without internet. Your progress stays safe.', { title })}
        confirmLabel={copy.t('Remove')}
        cancelLabel={copy.t('Keep it')}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          remove(moduleId);
          setAsking(false);
        }}
      />
    </>
  );
}
