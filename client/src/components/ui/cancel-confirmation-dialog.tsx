import { useState } from 'react';
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
  title = "Cancel Generation",
  description = "Are you sure you want to cancel this generation? This action cannot be undone."
}: CancelConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-athlete-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-gray-300">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            data-testid="button-cancel-dialog-cancel"
          >
            No, Keep Running
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-cancel-dialog-confirm"
          >
            Yes, Cancel Generation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}