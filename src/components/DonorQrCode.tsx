import { useRef, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DonorQrCode = () => {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const joinUrl = `${window.location.origin}/join-donor`;

  const downloadQr = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "badhon-donor-registration-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="ডোনার রেজিস্ট্রেশন QR দেখুন" title="QR দেখুন ও ডাউনলোড করুন">
          <QrCode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Instant Donor Registration</DialogTitle>
          <DialogDescription>QR scan করে নাম, gender, phone ও blood group দিয়ে যোগ দিন।</DialogDescription>
        </DialogHeader>
        <div ref={canvasRef} className="mx-auto rounded-md border border-border bg-card p-4">
          <QRCodeCanvas value={joinUrl} size={240} level="H" marginSize={2} />
        </div>
        <Button onClick={downloadQr} className="w-full gap-2">
          <Download className="h-4 w-4" /> QR Download করুন
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default DonorQrCode;