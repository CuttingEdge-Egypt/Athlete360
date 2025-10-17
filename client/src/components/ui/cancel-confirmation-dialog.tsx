import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CancelConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function CancelConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description
}: CancelConfirmationDialogProps) {
  const { t } = useTranslation('home');
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-athlete-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title || t('services.queue.cancelDialog.title')}</DialogTitle>
          <DialogDescription className="text-gray-300">
            {description || t('services.queue.cancelDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            data-testid="button-cancel-dialog-cancel"
          >
            {t('services.queue.cancelDialog.keepRunning')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-cancel-dialog-confirm"
          >
            {t('services.queue.cancelDialog.confirmCancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}