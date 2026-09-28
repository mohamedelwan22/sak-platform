import { useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { supportApi, type SupportAttachmentDto } from "@/api/support.api";
import { toast } from "sonner";
import { t } from "@/i18n";

/** MIME types that are meaningful to render inline in a tab. */
const INLINE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function isInline(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return INLINE_TYPES.some((t) => mimeType.toLowerCase().startsWith(t));
}

/**
 * Renders a support attachment as a control that fetches the file through the
 * authenticated API client and then opens or downloads it from an object URL.
 *
 * The attachment endpoint stays authenticated and private: the access token is
 * sent in the Authorization header and never appears in a URL, so the link
 * cannot be shared, bookmarked or leaked through browser history or referrers.
 */
export function AttachmentLink({
  ticketId,
  attachment,
  admin = false,
}: {
  ticketId: string;
  attachment: SupportAttachmentDto;
  admin?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    let objectUrl: string | null = null;
    try {
      const res = await supportApi.downloadAttachment(ticketId, attachment, admin);
      const blob = res.data;
      objectUrl = URL.createObjectURL(blob);

      const inline = isInline(attachment.mime_type);
      if (inline) {
        const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          // Popup blocked — fall back to a direct download.
          triggerDownload(objectUrl, attachment.file_name);
        }
      } else {
        triggerDownload(objectUrl, attachment.file_name);
      }
    } catch {
      toast.error(t("support.attachmentFailed"));
    } finally {
      // Give the browser a moment to start the request before releasing the URL.
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 60_000);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      data-testid="attachment-download"
      data-attachment-id={attachment.id}
      className="flex max-w-xs items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold transition hover:bg-gold/20 disabled:opacity-60"
      title={attachment.file_name}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{attachment.file_name}</span>
    </button>
  );
}

function triggerDownload(objectUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
