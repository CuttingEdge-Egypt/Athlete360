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
  const { t, i18n } = useTranslation('home');
  const isArabic = i18n.language === 'ar';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent 
        className="bg-card border text-foreground max-w-md [&>button]:text-foreground [&>button]:bg-muted/50 [&>button]:hover:bg-muted [&>button]:rounded-full [&>button]:p-1"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <DialogHeader className={isArabic ? '!text-right sm:!text-right' : '!text-left sm:!text-left'}>
          <DialogTitle className={`text-foreground ${isArabic ? 'text-right' : 'text-left'}`}>{title || t('services.queue.cancelDialog.title')}</DialogTitle>
          <DialogDescription className={`text-muted-foreground ${isArabic ? '!text-right' : '!text-left'}`}>
            {description || t('services.queue.cancelDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={`gap-2 ${isArabic ? 'sm:!justify-start !flex-row-reverse' : 'sm:!justify-end'}`}>
          <Button
            variant="outline"
            onClick={onCancel}
            className="border text-foreground hover:bg-muted"
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