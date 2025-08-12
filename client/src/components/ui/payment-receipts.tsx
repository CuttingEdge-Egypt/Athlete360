import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, Eye, Calendar, CreditCard, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  amount: string;
  currency: string;
  tokensAmount: number;
  paymentMethod: string;
  cardLast4?: string;
  cardBrand?: string;
  status: string;
  createdAt: string;
}

export function PaymentReceipts() {
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const { toast } = useToast();

  const { data: receipts = [], isLoading } = useQuery<PaymentReceipt[]>({
    queryKey: ['/api/payments/receipts'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string, currency: string) => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  const downloadReceiptPDF = (receipt: PaymentReceipt) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Athlete360 Payment Receipt', 20, 30);
    
    // Receipt details
    doc.setFontSize(12);
    doc.text(`Receipt Number: ${receipt.receiptNumber}`, 20, 50);
    doc.text(`Date: ${formatDate(receipt.createdAt)}`, 20, 60);
    doc.text(`Amount: ${formatAmount(receipt.amount, receipt.currency)}`, 20, 70);
    doc.text(`Tokens Purchased: ${receipt.tokensAmount}`, 20, 80);
    doc.text(`Payment Method: ${receipt.paymentMethod}`, 20, 90);
    
    if (receipt.cardLast4 && receipt.cardBrand) {
      doc.text(`Card: ${receipt.cardBrand} ending in ${receipt.cardLast4}`, 20, 100);
    }
    
    doc.text(`Status: ${receipt.status}`, 20, 110);
    
    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for using Athlete360!', 20, 140);
    doc.text('For support, contact: support@athlete360.com', 20, 150);
    
    // Save the PDF
    doc.save(`athlete360-receipt-${receipt.receiptNumber}.pdf`);
    
    toast({
      title: "Receipt downloaded",
      description: "PDF receipt has been saved to your downloads",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Receipts
          </CardTitle>
          <CardDescription>Loading your payment history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment Receipts
        </CardTitle>
        <CardDescription>
          View and download your payment receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment receipts found</p>
            <p className="text-sm">Your receipts will appear here after making purchases</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`receipt-${receipt.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">#{receipt.receiptNumber}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(receipt.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatAmount(receipt.amount, receipt.currency)}
                    </span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {receipt.tokensAmount}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    {receipt.cardBrand} •••• {receipt.cardLast4}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceipt(receipt)}
                        data-testid={`button-view-receipt-${receipt.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Receipt Details</DialogTitle>
                        <DialogDescription>
                          Payment receipt #{selectedReceipt?.receiptNumber}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedReceipt && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Receipt Number</p>
                              <p className="font-mono">{selectedReceipt.receiptNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Date</p>
                              <p>{formatDate(selectedReceipt.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Amount</p>
                              <p className="font-semibold text-lg">
                                {formatAmount(selectedReceipt.amount, selectedReceipt.currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tokens</p>
                              <p className="font-semibold text-lg text-green-600">
                                {selectedReceipt.tokensAmount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                              <p>{selectedReceipt.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Card</p>
                              <p>{selectedReceipt.cardBrand} •••• {selectedReceipt.cardLast4}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t">
                            <Badge variant={selectedReceipt.status === 'completed' ? 'default' : 'secondary'}>
                              {selectedReceipt.status}
                            </Badge>
                            <Button
                              onClick={() => downloadReceiptPDF(selectedReceipt)}
                              className="flex items-center gap-2"
                              data-testid="button-download-pdf"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReceiptPDF(receipt)}
                    data-testid={`button-download-receipt-${receipt.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}