import { useEffect, useState } from 'react';
import { Copy, Share2, Check, Download } from 'lucide-react';

interface ShareActionsProps {
  url: string;
  posterUrl?: string;
  text?: string;
}

export function ShareActions({
  url,
  posterUrl,
  text = 'Meet my connection. Test yours with Flexspeed.',
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(null);
    } catch {
      setError('Copy the link from the field below.');
    }
  };

  const share = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: 'My Flexspeed result', text, url });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        setError('Sharing is unavailable. Copy the link instead.');
    }
  };

  return (
    <div className="share-actions">
      <div className="action-row">
        <button className="start-button" onClick={() => void share()}>
          <Share2 size={16} /> Share result
        </button>
        <button className="secondary-button" onClick={() => void copy()}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {posterUrl && (
          <a className="secondary-button" href={posterUrl} download="flexspeed-result.png">
            <Download size={15} /> Poster
          </a>
        )}
        <a
          className="text-button"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on X
        </a>
        <a
          className="text-button"
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>
      <input
        className="share-url"
        aria-label="Shareable result link"
        value={url}
        readOnly
        onFocus={(event) => event.target.select()}
      />
      {error && (
        <p className="inline-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
